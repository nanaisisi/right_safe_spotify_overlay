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
    const { trackName, artistName, isPlaying } = trackData;

    if (!trackName || !artistName) {
      this.showNoTrack();
      return;
    }

    const playingIndicator = isPlaying ? "♪ " : "⏸ ";

    this.elements.trackName.textContent = playingIndicator + trackName;
    this.elements.artistName.textContent = artistName;

    this.updateContainerState(isPlaying);
  }

  /**
   * ソース情報を更新
   */
  updateSourceInfo(sourceText, sourceClass, confidence = null) {
    const displayText = confidence
      ? `${sourceText} (${confidence}%)`
      : sourceText;

    this.elements.sourceName.textContent = displayText;
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

    // ソース表示を更新
    this.updateSourceDisplay(data);

    // 楽曲変更チェック
    const newTrackId = `${data.trackName}-${data.artistName}`;
    if (this.currentTrack !== newTrackId) {
      this.domManager.triggerTrackChangeAnimation();
      this.currentTrack = newTrackId;

      // 新しい楽曲の場合、音源分析をリクエスト
      this.requestSourceAnalysis(data.trackName, data.artistName);
    }

    // DOM更新
    this.domManager.updateTrackInfo(data);

    console.log(`Track updated: ${data.trackName} by ${data.artistName}`);
  }

  /**
   * ソース表示を更新
   */
  updateSourceDisplay(data) {
    let sourceText = "不明";
    let sourceClass = "source-unknown";
    let confidence = null;

    if (data.source) {
      if (data.source.includes("Spotify")) {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
      } else if (data.source.includes("VLC")) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      }

      // 音源分析データから信頼度を取得
      const analysis = this.sourceAnalyzer.getCurrentAnalysis();
      if (analysis && analysis.confidence) {
        confidence = analysis.confidence;
      }
    } else {
      // フォールバック判定
      if (data.trackName && data.artistName) {
        if (data.trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
          sourceText = "VLC";
          sourceClass = "source-vlc";
        } else if (
          data.artistName === "Unknown Artist" &&
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

    const fullSourceText = confidence
      ? `${sourceText} (${confidence}%)`
      : sourceText;

    if (this.lastSource !== fullSourceText) {
      this.domManager.updateSourceInfo(sourceText, sourceClass, confidence);
      this.lastSource = fullSourceText;
      console.log("Updated source display:", fullSourceText);
    }
  }

  /**
   * 音源分析結果を処理
   */
  handleSourceAnalysisResult(data) {
    const analysisResult = this.sourceAnalyzer.handleAnalysisResult(data);

    // 現在表示中の楽曲と一致する場合、表示を更新
    if (this.currentTrack === `${data.trackName}-${data.artistName}`) {
      console.log("Analysis matches current track, updating display");

      const fullSourceText = `${analysisResult.sourceText} (${analysisResult.confidence}%)`;

      if (this.lastSource !== fullSourceText) {
        this.domManager.updateSourceInfo(
          analysisResult.sourceText,
          analysisResult.sourceClass,
          analysisResult.confidence
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
    this.domManager.showNoTrack();
    this.currentTrack = null;
    this.lastSource = "";
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
