const ws = new WebSocket("ws://127.0.0.1:8081/ws");
const trackNameElement = document.getElementById("track-name");
const artistNameElement = document.getElementById("artist-name");
const sourceNameElement = document.getElementById("source-name");
const containerElement = document.getElementById("overlay-container");

let currentTrack = null;
let lastSource = "";
let sourceAnalysisData = null;

ws.onopen = function () {
  console.log("WebSocket connected for OBS overlay");
};

ws.onmessage = function (event) {
  console.log("=== WebSocket Message Received ===");
  console.log("Raw data:", event.data);
  console.log("Data type:", typeof event.data);
  console.log("Data length:", event.data.length);

  if (event.data === "null") {
    console.log("Received null data, showing no track");
    showNoTrack();
    return;
  }

  try {
    const data = JSON.parse(event.data);
    console.log("=== Parsed JSON Data ===");
    console.log("Full data object:", data);

    // 音源分析結果の場合
    if (data.type === "sourceAnalysisResult") {
      handleSourceAnalysisResult(data);
      return;
    }

    // 通常の楽曲情報の場合
    console.log("trackName:", data.trackName);
    console.log("artistName:", data.artistName);
    console.log("source:", data.source);
    console.log("isPlaying:", data.isPlaying);

    // 音源分析データを保存
    if (data.sourceAnalysis) {
      sourceAnalysisData = data.sourceAnalysis;
      console.log("Source analysis data:", sourceAnalysisData);
    }

    updateTrackInfo(data);
  } catch (error) {
    console.error("=== JSON Parse Error ===");
    console.error("Error:", error);
    console.error("Raw data that failed:", event.data);
    // JSONパースエラー時は何も表示しない
    showNoTrack();
  }
};

ws.onclose = function () {
  showNoTrack();
};

ws.onerror = function (error) {
  showNoTrack();
};

// 音源判定リクエストを送信する関数
function requestSourceAnalysis(trackName, artistName) {
  if (ws.readyState === WebSocket.OPEN) {
    const analysisRequest = {
      type: "sourceAnalysis",
      trackName: trackName,
      artistName: artistName,
      timestamp: Date.now(),
    };

    console.log("Sending source analysis request:", analysisRequest);
    ws.send(JSON.stringify(analysisRequest));
  }
}

// 音源分析結果を処理する関数
function handleSourceAnalysisResult(data) {
  console.log("=== Source Analysis Result Received ===");
  console.log("Analysis for:", `"${data.trackName}" by "${data.artistName}"`);
  console.log("Analysis result:", data.analysis);

  // 分析結果を保存
  sourceAnalysisData = data.analysis;

  // 現在表示中の楽曲と一致する場合、表示を更新
  if (currentTrack === `${data.trackName}-${data.artistName}`) {
    console.log("Analysis matches current track, updating display");

    // ソース表示を更新（信頼度付きで）
    const sourceText = getSourceTextFromAnalysis(sourceAnalysisData);
    const sourceClass = getSourceClassFromAnalysis(sourceAnalysisData);
    const fullSourceText = sourceText + ` (${sourceAnalysisData.confidence}%)`;

    if (lastSource !== fullSourceText) {
      sourceNameElement.textContent = fullSourceText;
      sourceNameElement.className = sourceClass;
      lastSource = fullSourceText;

      console.log(
        "Updated source display with analysis result:",
        fullSourceText
      );
    }

    // 詳細分析結果をコンソールに表示
    showSourceAnalysis();
  } else {
    console.log("Analysis for different track, storing for later use");
  }
}

// 分析結果からソーステキストを取得
function getSourceTextFromAnalysis(analysis) {
  switch (analysis.detectedSource) {
    case "Spotify":
      return "Spotify";
    case "VLC":
      return "VLC";
    default:
      return "不明";
  }
}

// 分析結果からソースクラスを取得
function getSourceClassFromAnalysis(analysis) {
  switch (analysis.detectedSource) {
    case "Spotify":
      return "source-spotify";
    case "VLC":
      return "source-vlc";
    default:
      return "source-unknown";
  }
}

// 音源情報の詳細分析を表示する関数
function showSourceAnalysis() {
  if (!sourceAnalysisData) {
    console.log("No source analysis data available");
    return;
  }

  const analysisInfo = [
    `音源: ${sourceAnalysisData.detectedSource}`,
    `信頼度: ${sourceAnalysisData.confidence}%`,
    `判定理由: ${sourceAnalysisData.reasons.join(", ")}`,
    `メタデータ品質: ${sourceAnalysisData.metadataQuality}`,
  ];

  console.log("=== 音源分析結果 ===");
  analysisInfo.forEach((info) => console.log(info));
}

function updateTrackInfo(data) {
  console.log("=== updateTrackInfo called ===");
  console.log("Input data:", data);
  console.log("Has trackName:", !!data.trackName);
  console.log("Has artistName:", !!data.artistName);

  if (!data || !data.trackName || !data.artistName) {
    console.log("Missing required data, calling showNoTrack");
    showNoTrack();
    return;
  }

  console.log(
    "Processing track info for:",
    data.trackName,
    "by",
    data.artistName
  );

  // ソース表示を更新
  updateSourceDisplay(data);

  // 楽曲が変わった場合のアニメーション
  const newTrackId = `${data.trackName}-${data.artistName}`;
  if (currentTrack !== newTrackId) {
    containerElement.classList.add("track-change");
    setTimeout(() => {
      containerElement.classList.remove("track-change");
    }, 600);
    currentTrack = newTrackId;

    // 新しい楽曲の場合、音源分析をリクエスト
    requestSourceAnalysis(data.trackName, data.artistName);
  }

  // 再生状態によって表示を調整
  const playingIndicator = data.isPlaying ? "♪ " : "⏸ ";
  const newTrackText = playingIndicator + data.trackName;
  const newArtistText = data.artistName;

  console.log("=== Updating DOM Elements ===");
  console.log("Setting track text to:", newTrackText);
  console.log("Setting artist text to:", newArtistText);

  trackNameElement.textContent = newTrackText;
  artistNameElement.textContent = newArtistText;

  console.log(
    "DOM updated - trackNameElement.textContent:",
    trackNameElement.textContent
  );
  console.log(
    "DOM updated - artistNameElement.textContent:",
    artistNameElement.textContent
  );

  // 再生状態によってスタイルを変更
  if (data.isPlaying) {
    containerElement.classList.remove("paused");
  } else {
    containerElement.classList.add("paused");
  }

  containerElement.classList.remove("no-track");
}

function showNoTrack() {
  trackNameElement.textContent = "楽曲が再生されていません";
  artistNameElement.textContent = "音楽を再生してください";
  sourceNameElement.textContent = "未接続";
  sourceNameElement.className = "source-disconnected";
  containerElement.classList.add("no-track");
  currentTrack = null;
  lastSource = "";
}

// ソース表示の更新
function updateSourceDisplay(data) {
  console.log("=== updateSourceDisplay called ===");
  console.log("Input data:", data);
  console.log("data.source:", data.source);

  let sourceText = "不明";
  let sourceClass = "source-unknown";
  let sourceConfidence = "";

  // サーバーから送られてきたソース情報を使用
  if (data.source) {
    console.log("Found source field:", data.source);
    const source = data.source;

    // より詳細なソース判定
    if (source.includes("Spotify")) {
      sourceText = "Spotify";
      sourceClass = "source-spotify";
      console.log("Detected as Spotify from source field");
    } else if (source.includes("VLC")) {
      sourceText = "VLC";
      sourceClass = "source-vlc";
      console.log("Detected as VLC from source field");
    } else {
      sourceText = "不明";
      sourceClass = "source-unknown";
      console.log("Unknown source type:", source);
    }

    // 音源分析データがある場合、信頼度を表示
    if (sourceAnalysisData && sourceAnalysisData.confidence) {
      sourceConfidence = ` (${sourceAnalysisData.confidence}%)`;
    }

    console.log(
      "Set sourceText to:",
      sourceText,
      "sourceClass to:",
      sourceClass
    );
  } else {
    console.log("No source field found, using fallback detection");
    // フォールバック: トラック情報から推測（より保守的な判定）
    if (data.trackName && data.artistName) {
      // 明確にファイル形式の場合のみVLC
      if (data.trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
        console.log("Detected as VLC from file extension");
      } else if (
        data.artistName === "Unknown Artist" &&
        data.trackName === "Unknown Track"
      ) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
        console.log("Detected as VLC from unknown artist/track");
      } else {
        // デフォルトはSpotify（通常のアーティスト名とトラック名）
        sourceText = "Spotify";
        sourceClass = "source-spotify";
        console.log(
          "Detected as Spotify by default (normal artist/track names)"
        );
      }
    } else {
      console.log("Insufficient data for source detection");
    }
  }

  // ソース表示を更新（変更時のみ）
  const fullSourceText = sourceText + sourceConfidence;
  if (lastSource !== fullSourceText) {
    console.log("=== Updating Source Display ===");
    console.log("Previous source:", lastSource);
    console.log("New source:", fullSourceText, "with class:", sourceClass);

    sourceNameElement.textContent = fullSourceText;
    sourceNameElement.className = sourceClass;
    lastSource = fullSourceText;

    console.log("Source element updated:");
    console.log("- textContent:", sourceNameElement.textContent);
    console.log("- className:", sourceNameElement.className);

    // 音源分析結果をコンソールに表示
    if (sourceAnalysisData) {
      showSourceAnalysis();
    }
  } else {
    console.log("Source unchanged, skipping update:", fullSourceText);
  }
}
