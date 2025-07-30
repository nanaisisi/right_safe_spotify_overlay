const trackName = document.getElementById("track-name");
const artistName = document.getElementById("artist-name");
const sourceName = document.getElementById("source-name");
const loginBtn = document.getElementById("login-btn");
const loginStatus = document.getElementById("login-status");

let isAuthenticated = false;
let lastSource = "";

const ws = new WebSocket(`ws://${location.host}/ws`);

// WebSocket接続時の処理
ws.onopen = () => {
  console.log("WebSocket connected");
  updateLoginStatus();
};

// WebSocketメッセージ受信時の処理
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received WebSocket message:", data);

  // トラック情報更新
  if (data) {
    trackName.textContent = data.trackName || "再生中の楽曲なし";
    artistName.textContent = data.artistName || "アーティスト不明";

    // ソース判定（メッセージから推測）
    const currentSource = determineSource(data);
    console.log("Determined source:", currentSource);

    // Spotify認証状態は、実際にSpotifyから情報を受信している場合のみtrue
    isAuthenticated = currentSource === "spotify";
    console.log("Authentication status:", isAuthenticated);
  } else {
    trackName.textContent = "再生中の楽曲なし";
    artistName.textContent = "";
    sourceName.textContent = "未接続";
    sourceName.className = "source-disconnected";
    isAuthenticated = false;
  }

  updateLoginStatus();
};

// WebSocket切断時の処理
ws.onclose = () => {
  console.log("WebSocket disconnected");
  sourceName.textContent = "接続切断";
  sourceName.className = "source-disconnected";
  updateLoginStatus();
};

// エラー時の処理
ws.onerror = (error) => {
  console.error("WebSocket error:", error);
  sourceName.textContent = "接続エラー";
  sourceName.className = "source-error";
};

// ソース判定（トラック情報から推測）
function determineSource(data) {
  // サーバーから送られてきたソース情報を優先使用
  if (data.source) {
    const source = data.source;
    if (source.includes("VLC")) {
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else if (source.includes("Spotify")) {
      setSourceIndicator("Spotify", "spotify");
      return "spotify";
    } else {
      setSourceIndicator("不明", "unknown");
      return "unknown";
    }
  }

  // フォールバック: トラック情報から推測
  if (data.trackName && data.artistName) {
    // ファイル名形式の場合はVLC
    if (
      data.trackName.includes(".") &&
      (data.trackName.includes(".mp3") ||
        data.trackName.includes(".flac") ||
        data.trackName.includes(".wav"))
    ) {
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else if (
      data.artistName === "Unknown Artist" ||
      data.trackName === "Unknown Track"
    ) {
      setSourceIndicator("VLC", "vlc");
      return "vlc";
    } else {
      // 通常のアーティスト名とトラック名の場合はSpotify
      setSourceIndicator("Spotify", "spotify");
      return "spotify";
    }
  } else {
    setSourceIndicator("不明", "unknown");
    return "unknown";
  }
}

// ソース表示の更新
function setSourceIndicator(source, type) {
  if (lastSource !== source) {
    sourceName.textContent = source;
    sourceName.className = `source-${type}`;
    lastSource = source;
    console.log(`Source changed to: ${source}`);
  }
}

// ログイン状態の更新
function updateLoginStatus() {
  const currentSource = sourceName.textContent;
  console.log(
    "Updating login status - currentSource:",
    currentSource,
    "isAuthenticated:",
    isAuthenticated
  );

  if (isAuthenticated) {
    loginBtn.style.display = "none";
    loginStatus.textContent = "✅ Spotify認証済み";
    loginStatus.className = "status-authenticated";
  } else {
    // VLC使用中でもSpotifyログインボタンを表示
    loginBtn.style.display = "inline-block";

    if (currentSource === "VLC") {
      loginStatus.textContent = "🎵 VLC使用中 (Spotifyも利用可能)";
      loginStatus.className = "status-vlc-mode";
    } else {
      loginStatus.textContent = "⚠️ Spotify未認証";
      loginStatus.className = "status-unauthenticated";
    }
  }
  console.log("Login button display:", loginBtn.style.display);
  console.log("Login status text:", loginStatus.textContent);
}

// 初期状態の設定
updateLoginStatus();

// ログイン関数
function handleLogin() {
  window.location.href = "/login";
}
