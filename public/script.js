console.log("=== Script.js loaded ===");

const trackName = document.getElementById("track-name");
const artistName = document.getElementById("artist-name");
const sourceName = document.getElementById("source-name");
const loginBtn = document.getElementById("login-btn");

console.log("=== DOM Elements Check (Main Page) ===");
console.log("trackName element:", trackName);
console.log("artistName element:", artistName);
console.log("sourceName element:", sourceName);
console.log("loginBtn element:", loginBtn);

if (!trackName || !artistName || !sourceName) {
  console.error("ERROR: Critical DOM elements not found!");
  console.error("Missing elements:", {
    trackName: !trackName,
    artistName: !artistName,
    sourceName: !sourceName,
  });
}

let lastSource = "";

console.log("=== Creating WebSocket connection ===");

// WebSocket接続を明示的にlocalhostに固定
const ws = new WebSocket("ws://127.0.0.1:8081/ws");
console.log("WebSocket object created:", ws);

// WebSocket接続時の処理
ws.onopen = () => {
  console.log("=== WebSocket Connected (Main Page) ===");
  console.log("WebSocket readyState:", ws.readyState);
};

// WebSocketメッセージ受信時の処理
ws.onmessage = (event) => {
  console.log("=== Main Page WebSocket Message Received ===");
  console.log("Raw data:", event.data);
  console.log("Data type:", typeof event.data);
  console.log("Data length:", event.data.length);

  // nullデータの処理
  if (event.data === "null") {
    console.log("Received null data, showing no track (main page)");
    trackName.textContent = "再生中の楽曲なし";
    artistName.textContent = "";
    sourceName.textContent = "待機中";
    sourceName.className = "source-disconnected";
    return;
  }

  try {
    const data = JSON.parse(event.data);
    console.log("=== Parsed JSON Data (main page) ===");
    console.log("Full data object:", data);
    console.log("trackName:", data.trackName);
    console.log("artistName:", data.artistName);
    console.log("source:", data.source);
    console.log("isPlaying:", data.isPlaying);

    // トラック情報更新
    if (data && data.trackName && data.artistName) {
      console.log("=== Updating Main Page Display ===");
      console.log("Setting trackName to:", data.trackName);
      console.log("Setting artistName to:", data.artistName);

      trackName.textContent = data.trackName;
      artistName.textContent = data.artistName;

      console.log("DOM elements after update:");
      console.log("- trackName element:", trackName);
      console.log("- trackName.textContent:", trackName.textContent);
      console.log("- artistName element:", artistName);
      console.log("- artistName.textContent:", artistName.textContent);

      // ソース判定（メッセージから推測）
      const currentSource = determineSource(data);
      console.log("Determined source:", currentSource);
    } else {
      console.log("Missing trackName or artistName - data:", data);
      console.log("data.trackName:", data.trackName);
      console.log("data.artistName:", data.artistName);
      trackName.textContent = "再生中の楽曲なし";
      artistName.textContent = "";
      sourceName.textContent = "待機中";
      sourceName.className = "source-disconnected";
    }
  } catch (error) {
    console.error("=== JSON Parse Error (main page) ===");
    console.error("Error:", error);
    console.error("Raw data that failed:", event.data);
    trackName.textContent = "データ解析エラー";
    artistName.textContent = "";
    sourceName.textContent = "エラー";
    sourceName.className = "source-error";
  }
}; // WebSocket切断時の処理
ws.onclose = () => {
  console.log("WebSocket disconnected (main page)");
  sourceName.textContent = "接続切断";
  sourceName.className = "source-disconnected";
};

// エラー時の処理
ws.onerror = (error) => {
  console.error("WebSocket error (main page):", error);
  sourceName.textContent = "接続エラー";
  sourceName.className = "source-error";
};

// ソース判定（トラック情報から推測）
function determineSource(data) {
  console.log("=== determineSource called ===");
  console.log("data.source:", data.source);

  // サーバーから送られてきたソース情報を優先使用
  if (data.source) {
    const source = data.source;
    console.log("Using server source info:", source);

    if (source.includes("Spotify")) {
      console.log("Setting source as Spotify");
      setSourceIndicator("Spotify", "spotify");
      return "spotify";
    } else if (source.includes("VLC")) {
      console.log("Setting source as VLC");
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else {
      console.log("Unknown source type:", source);
      setSourceIndicator("不明", "unknown");
      return "unknown";
    }
  }

  console.log("No source field, using fallback detection");
  // フォールバック: トラック情報から推測
  if (data.trackName && data.artistName) {
    // ファイル名形式の場合はVLC
    if (data.trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
      console.log("File extension detected, setting as VLC");
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else if (
      data.artistName === "Unknown Artist" ||
      data.trackName === "Unknown Track"
    ) {
      console.log("Unknown artist/track, setting as VLC");
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else {
      console.log("Normal track info, setting as Spotify");
      setSourceIndicator("Spotify", "spotify");
      return "spotify";
    }
  } else {
    console.log("Insufficient data for source detection");
    setSourceIndicator("不明", "unknown");
    return "unknown";
  }
}

// ソース表示の更新
function setSourceIndicator(source, type) {
  console.log("=== setSourceIndicator called ===");
  console.log("Setting source to:", source, "type:", type);
  console.log("Current lastSource:", lastSource);

  if (lastSource !== source) {
    console.log("Source changed, updating display");
    sourceName.textContent = source;
    sourceName.className = `source-${type}`;
    lastSource = source;

    console.log("Updated sourceName:");
    console.log("- textContent:", sourceName.textContent);
    console.log("- className:", sourceName.className);
  } else {
    console.log("Source unchanged, skipping update");
  }
}

// ログイン関数
function handleLogin() {
  window.location.href = "/login";
}
