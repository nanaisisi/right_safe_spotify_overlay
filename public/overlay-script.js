const ws = new WebSocket("ws://127.0.0.1:8081/ws");
const trackNameElement = document.getElementById("track-name");
const artistNameElement = document.getElementById("artist-name");
const sourceNameElement = document.getElementById("source-name");
const containerElement = document.getElementById("overlay-container");

let currentTrack = null;
let lastSource = "";

ws.onopen = function () {
  // WebSocket接続完了
};

ws.onmessage = function (event) {
  console.log("Received WebSocket data:", event.data);

  try {
    const data = JSON.parse(event.data);
    console.log("Parsed data:", data);
    console.log("Source field:", data.source);
    updateTrackInfo(data);
  } catch (error) {
    console.error("Error parsing WebSocket data:", error);
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
  if (!data || !data.trackName || !data.artistName) {
    showNoTrack();
    return;
  }

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
  trackNameElement.textContent = playingIndicator + data.trackName;
  artistNameElement.textContent = data.artistName;

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
  console.log("updateSourceDisplay called with:", data);
  let sourceText = "不明";
  let sourceClass = "source-unknown";

  // サーバーから送られてきたソース情報を使用
  if (data.source) {
    console.log("Found source field:", data.source);
    const source = data.source;
    if (source.includes("VLC")) {
      sourceText = "VLC";
      sourceClass = "source-vlc";
    } else if (source.includes("Spotify")) {
      sourceText = "Spotify";
      sourceClass = "source-spotify";
    }
    console.log(
      "Set sourceText to:",
      sourceText,
      "sourceClass to:",
      sourceClass
    );
  } else {
    console.log("No source field found, using fallback detection");
    // フォールバック: トラック情報から推測
    if (data.trackName && data.artistName) {
      if (
        data.trackName.includes(".") &&
        (data.trackName.includes(".mp3") ||
          data.trackName.includes(".flac") ||
          data.trackName.includes(".wav"))
      ) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      } else if (
        data.artistName === "Unknown Artist" ||
        data.trackName === "Unknown Track"
      ) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      } else {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
      }
    }
  }

  // ソース表示を更新（変更時のみ）
  if (lastSource !== sourceText) {
    console.log(
      "Updating source display:",
      sourceText,
      "with class:",
      sourceClass
    );
    sourceNameElement.textContent = sourceText;
    sourceNameElement.className = sourceClass;
    lastSource = sourceText;
    console.log(
      "Source element updated, textContent:",
      sourceNameElement.textContent,
      "className:",
      sourceNameElement.className
    );
  } else {
    console.log("Source unchanged, skipping update:", sourceText);
  }
}
