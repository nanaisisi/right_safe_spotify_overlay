/**
 * Spotify Overlay WebSocket Client
 * OBS用のSpotify楽曲情報表示オーバーレイ
 */

/**
 * DOM要素を管理するクラス
 */
class DOMManager {
  constructor() {
    this.elements = {
      container: document.getElementById("overlay-container"),
      trackName: document.getElementById("track-name"),
      artistName: document.getElementById("artist-name"),
      sourceName: document.getElementById("source-name"),
      currentTime: document.getElementById("current-time"),
      trackDuration: document.getElementById("track-duration"),
      playlistIndicator: document.getElementById("playlist-indicator"),
    };

    this.validateElements();
  }

  /**
   * 必要なDOM要素が存在するかチェック
   */
  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing DOM elements: ${missingElements.join(", ")}`);
    }
  }

  /**
   * トラック情報を表示
   */
  updateTrackInfo(trackData) {
    const {
      trackName,
      artistName,
      isPlaying,
      source,
      duration,
      progressMs,
      isInPlaylist,
    } = trackData;

    if (!trackName || !artistName) {
      this.showNoTrack();
      return;
    }

    const playingIndicator = isPlaying ? "♪ " : "⏸ ";

    // 楽曲情報とソース情報を同時に更新
    this.elements.trackName.textContent = playingIndicator + trackName;
    this.elements.artistName.textContent = artistName;

    // 現在の再生時間を更新
    this.updateCurrentTime(progressMs);

    // 秒数表示を更新
    this.updateTrackDuration(duration);

    // プレイリスト情報を更新（Spotifyの場合のみ）
    this.updatePlaylistIndicator(source, isInPlaylist);

    // ソース情報を更新
    this.updateSourceInfo(source);

    this.updateContainerState(isPlaying);
  }

  /**
   * trackDataからソース情報を直接更新
   */
  updateSourceInfoFromData(data) {
    console.log("=== updateSourceInfoFromData 詳細デバッグ ===");
    console.log("受信データ:", data);
    console.log("data.source:", data.source);
    console.log("data.trackName:", data.trackName);
    console.log("data.artistName:", data.artistName);

    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (data.source) {
      console.log("data.sourceが存在します:", data.source);
      if (data.source.includes("Spotify")) {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
        console.log("→ Spotify判定");
      } else if (data.source.includes("VLC")) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
        console.log("→ VLC判定");
      } else {
        console.log("→ 不明なソース:", data.source);
      }
    } else {
      console.log("data.sourceが未定義、フォールバック判定を実行");
      // フォールバック判定
      if (data.trackName && data.artistName) {
        if (data.trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
          sourceText = "VLC";
          sourceClass = "source-vlc";
          console.log("→ ファイル拡張子によりVLC判定");
        } else if (
          data.artistName === "Unknown Artist" &&
          data.trackName === "Unknown Track"
        ) {
          sourceText = "VLC";
          sourceClass = "source-vlc";
          console.log("→ Unknown Artist/TrackによりVLC判定");
        } else {
          sourceText = "Spotify";
          sourceClass = "source-spotify";
          console.log("→ デフォルトでSpotify判定");
        }
      }
    }

    console.log("最終判定結果:", { sourceText, sourceClass });
    console.log(
      "DOM更新前 - 現在の表示:",
      this.elements.sourceName.textContent
    );

    this.elements.sourceName.textContent = sourceText;
    this.elements.sourceName.className = sourceClass;

    console.log(
      "DOM更新後 - 新しい表示:",
      this.elements.sourceName.textContent
    );
    console.log("=== updateSourceInfoFromData 完了 ===");
  }

  /**
   * 現在の再生時間を更新
   */
  updateCurrentTime(progressMs) {
    if (progressMs && typeof progressMs === "number") {
      const currentSeconds = Math.floor(progressMs / 1000);
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      this.elements.currentTime.textContent = formattedTime;
      console.log("現在の再生時間更新:", formattedTime);
    } else {
      this.elements.currentTime.textContent = "0:00";
      console.log("現在の再生時間リセット");
    }
  }

  /**
   * トラックの秒数表示を更新
   */
  updateTrackDuration(duration) {
    if (duration && typeof duration === "number") {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
      this.elements.trackDuration.textContent = `/ ${formattedDuration}`;
      console.log("総時間更新:", formattedDuration);
    } else {
      this.elements.trackDuration.textContent = "/ 0:00";
      console.log("総時間リセット");
    }
  }

  /**
   * プレイリストインジケーターを更新
   */
  updatePlaylistIndicator(source, isInPlaylist) {
    if (source && source.includes("Spotify") && isInPlaylist === true) {
      this.elements.playlistIndicator.style.display = "inline";
      console.log("プレイリストインジケーター表示");
    } else {
      this.elements.playlistIndicator.style.display = "none";
      console.log("プレイリストインジケーター非表示");
    }
  }

  /**
   * ソース情報を更新（シンプル版）
   */
  updateSourceInfo(source) {
    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (source) {
      if (source.includes("Spotify")) {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
      } else if (source.includes("VLC")) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      }
    }

    console.log("ソース情報更新:", { sourceText, sourceClass });
    this.elements.sourceName.textContent = sourceText;
    this.elements.sourceName.className = sourceClass;
  }

  /**
   * トラック無し状態を表示
   */
  showNoTrack() {
    this.elements.trackName.textContent = "楽曲が再生されていません";
    this.elements.artistName.textContent = "音楽を再生してください";
    this.elements.sourceName.textContent = "未接続";
    this.elements.sourceName.className = "source-disconnected";
    this.elements.currentTime.textContent = "0:00";
    this.elements.trackDuration.textContent = "/ 0:00";
    this.elements.playlistIndicator.style.display = "none";
    this.elements.container.classList.add("no-track");
  }

  /**
   * コンテナの状態を更新
   */
  updateContainerState(isPlaying) {
    this.elements.container.classList.toggle("paused", !isPlaying);
    this.elements.container.classList.remove("no-track");
  }

  /**
   * トラック変更アニメーションを実行
   */
  triggerTrackChangeAnimation() {
    this.elements.container.classList.add("track-change");
    setTimeout(() => {
      this.elements.container.classList.remove("track-change");
    }, 600);
  }
}

/**
 * 音源分析を管理するクラス
 */
class SourceAnalyzer {
  constructor() {
    this.analysisData = null;
  }

  /**
   * 分析結果を処理
   */
  handleAnalysisResult(data) {
    console.log("=== Source Analysis Result Received ===");
    console.log(`Analysis for: "${data.trackName}" by "${data.artistName}"`);
    console.log("Analysis result:", data.analysis);

    this.analysisData = data.analysis;
    this.logAnalysisDetails();

    return {
      sourceText: this.getSourceText(data.analysis.detectedSource),
      sourceClass: this.getSourceClass(data.analysis.detectedSource),
      confidence: data.analysis.confidence,
    };
  }

  /**
   * 分析結果の詳細をログ出力
   */
  logAnalysisDetails() {
    if (!this.analysisData) return;

    const analysisInfo = [
      `音源: ${this.analysisData.detectedSource}`,
      `信頼度: ${this.analysisData.confidence}%`,
      `判定理由: ${this.analysisData.reasons.join(", ")}`,
      `メタデータ品質: ${this.analysisData.metadataQuality}`,
    ];

    console.log("=== 音源分析結果 ===");
    analysisInfo.forEach((info) => console.log(info));
  }

  /**
   * ソース種別からテキストを取得
   */
  getSourceText(detectedSource) {
    const sourceMap = {
      Spotify: "Spotify",
      VLC: "VLC",
    };
    return sourceMap[detectedSource] || "不明";
  }

  /**
   * ソース種別からCSSクラスを取得
   */
  getSourceClass(detectedSource) {
    const classMap = {
      Spotify: "source-spotify",
      VLC: "source-vlc",
    };
    return classMap[detectedSource] || "source-unknown";
  }

  /**
   * 現在の分析データを取得
   */
  getCurrentAnalysis() {
    return this.analysisData;
  }
}

/**
 * WebSocket通信を管理するクラス
 */
class WebSocketClient {
  constructor(url, messageHandler) {
    this.url = url;
    this.messageHandler = messageHandler;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;

    this.connect();
  }

  /**
   * WebSocket接続を開始
   */
  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * イベントハンドラーを設定
   */
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log("WebSocket connected for OBS overlay");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.messageHandler.handleConnectionLost();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.messageHandler.handleConnectionLost();
    };
  }

  /**
   * メッセージを処理
   */
  handleMessage(event) {
    console.log("=== WebSocket Message Received ===");
    console.log("Raw data:", event.data);

    if (event.data === "null") {
      console.log("Received null data, showing no track");
      this.messageHandler.handleNoTrack();
      return;
    }

    try {
      const data = JSON.parse(event.data);
      console.log("=== Parsed JSON Data ===");
      console.log("Full data object:", data);

      this.messageHandler.handleMessage(data);
    } catch (error) {
      console.error("=== JSON Parse Error ===");
      console.error("Error:", error);
      console.error("Raw data that failed:", event.data);
      this.messageHandler.handleNoTrack();
    }
  }

  /**
   * メッセージを送信
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn("WebSocket is not connected");
    return false;
  }

  /**
   * 再接続をスケジュール
   */
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }
}

/**
 * オーバーレイアプリケーションのメインクラス
 */
class SpotifyOverlay {
  constructor() {
    this.domManager = new DOMManager();
    this.sourceAnalyzer = new SourceAnalyzer();
    this.currentTrack = null;
    this.lastSource = "";
    this.currentProgressMs = 0;
    this.currentDuration = 0;
    this.isPlaying = false;
    this.updateTimer = null;

    // WebSocket接続を初期化
    this.wsClient = new WebSocketClient("ws://127.0.0.1:8081/ws", this);
  }

  /**
   * メッセージハンドラー（WebSocketClientから呼び出される）
   */
  handleMessage(data) {
    // 音源分析結果の場合
    if (data.type === "sourceAnalysisResult") {
      this.handleSourceAnalysisResult(data);
      return;
    }

    // 通常の楽曲情報の場合
    console.log("trackName:", data.trackName);
    console.log("artistName:", data.artistName);
    console.log("source:", data.source);
    console.log("isPlaying:", data.isPlaying);

    this.updateTrackInfo(data);
  }

  /**
   * トラック情報を更新
   */
  updateTrackInfo(data) {
    console.log("=== updateTrackInfo called ===");

    if (!data || !data.trackName || !data.artistName) {
      console.log("Missing required data, calling showNoTrack");
      this.handleNoTrack();
      return;
    }

    // 現在の再生状態を保存
    this.currentProgressMs = data.progressMs || 0;
    this.currentDuration = data.duration || 0;
    this.isPlaying = data.isPlaying || false;

    // 楽曲情報とソース情報を同時に更新（一度だけDOM操作）
    this.domManager.updateTrackInfo(data);

    // タイマーを開始/停止
    this.updatePlaybackTimer();

    // 楽曲変更チェック
    const newTrackId = `${data.trackName}-${data.artistName}`;
    if (this.currentTrack !== newTrackId) {
      this.domManager.triggerTrackChangeAnimation();
      this.currentTrack = newTrackId;

      // 新しい楽曲の場合、音源分析をリクエスト
      this.requestSourceAnalysis(data.trackName, data.artistName);
    }

    console.log(`Track updated: ${data.trackName} by ${data.artistName}`);
  }

  /**
   * 再生タイマーを開始/停止
   */
  updatePlaybackTimer() {
    // 既存のタイマーをクリア
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // 再生中の場合のみタイマーを開始
    if (this.isPlaying && this.currentDuration > 0) {
      this.updateTimer = setInterval(() => {
        this.currentProgressMs += 1000; // 1秒進める

        // 楽曲の終わりを超えないようにする
        if (this.currentProgressMs > this.currentDuration * 1000) {
          this.currentProgressMs = this.currentDuration * 1000;
          this.isPlaying = false;
          this.updatePlaybackTimer(); // タイマーを停止
        }

        // 現在の再生時間を更新
        this.updateCurrentTime(this.currentProgressMs);
      }, 1000); // 1秒ごとに更新
    }
  }

  /**
   * 現在の再生時間を更新
   */
  updateCurrentTime(progressMs) {
    if (progressMs && typeof progressMs === 'number') {
      const currentSeconds = Math.floor(progressMs / 1000);
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      this.domManager.elements.currentTime.textContent = formattedTime;
      console.log("現在の再生時間更新:", formattedTime);
    } else {
      this.domManager.elements.currentTime.textContent = "0:00";
      console.log("現在の再生時間リセット");
    }
  }

  /**
   * トラック情報を更新
   */
  }

  /**
   * ソース表示を更新（現在は DOMManager.updateTrackInfo で直接実行）
   * 互換性のため残しているが、実際の処理は DOMManager で行われる
   */
  updateSourceDisplay(data) {
    // この関数は現在使用されていません
    // DOM更新は DOMManager.updateTrackInfo で同期実行されます
    console.log(
      "updateSourceDisplay called (deprecated - use DOMManager.updateTrackInfo)"
    );
  }

  /**
   * 音源分析結果を処理
   */
  handleSourceAnalysisResult(data) {
    console.log("=== 音源分析結果受信（一時的に無効化） ===");
    console.log("分析対象:", data.trackName, "by", data.artistName);
    console.log("分析結果:", data.analysis);

    // 一時的に分析結果による上書きを無効化
    console.log("現在は分析結果による上書きを無効化中です");
    console.log("初期判定結果を維持します");

    const analysisResult = this.sourceAnalyzer.handleAnalysisResult(data);
    return; // 早期リターンで上書きを防ぐ

    // 以下は無効化されているコード
    if (this.currentTrack === `${data.trackName}-${data.artistName}`) {
      console.log("Analysis matches current track, updating display");

      const fullSourceText = analysisResult.sourceText;

      if (this.lastSource !== fullSourceText) {
        this.domManager.updateSourceInfo(
          analysisResult.sourceText,
          analysisResult.sourceClass
        );
        this.lastSource = fullSourceText;
        console.log(
          "Updated source display with analysis result:",
          fullSourceText
        );
      }
    } else {
      console.log("Analysis for different track, storing for later use");
    }
  }

  /**
   * 音源分析をリクエスト
   */
  requestSourceAnalysis(trackName, artistName) {
    const analysisRequest = {
      type: "sourceAnalysis",
      trackName: trackName,
      artistName: artistName,
      timestamp: Date.now(),
    };

    console.log("Sending source analysis request:", analysisRequest);
    this.wsClient.send(analysisRequest);
  }

  /**
   * トラック無し状態を処理
   */
  handleNoTrack() {
    // タイマーをクリア
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.domManager.showNoTrack();
    this.currentTrack = null;
    this.lastSource = "";
    this.currentProgressMs = 0;
    this.currentDuration = 0;
    this.isPlaying = false;
  }

  /**
   * 接続断線を処理
   */
  handleConnectionLost() {
    this.handleNoTrack();
  }
}

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
  try {
    new SpotifyOverlay();
    console.log("Spotify Overlay initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Spotify Overlay:", error);
  }
});
