const ws = new WebSocket("ws://127.0.0.1:8081/ws");
const trackNameElement = document.getElementById("track-name");
const artistNameElement = document.getElementById("artist-name");
const sourceNameElement = document.getElementById("source-name");
const containerElement = document.getElementById("overlay-container");

let currentTrack = null;
let lastSource = "";

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
    console.log("trackName:", data.trackName);
    console.log("artistName:", data.artistName);
    console.log("source:", data.source);
    console.log("isPlaying:", data.isPlaying);
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
  if (lastSource !== sourceText) {
    console.log("=== Updating Source Display ===");
    console.log("Previous source:", lastSource);
    console.log("New source:", sourceText, "with class:", sourceClass);

    sourceNameElement.textContent = sourceText;
    sourceNameElement.className = sourceClass;
    lastSource = sourceText;

    console.log("Source element updated:");
    console.log("- textContent:", sourceNameElement.textContent);
    console.log("- className:", sourceNameElement.className);
  } else {
    console.log("Source unchanged, skipping update:", sourceText);
  }
}
