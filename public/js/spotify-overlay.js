/**
 * Spotify Overlay Application - メインアプリケーション
 * 全コンポーネントを統合したオーバーレイアプリ
 */

import { DOMManager } from "./dom-manager.js";
import { WebSocketClient } from "./websocket-client.js";
import { TimerManager } from "./timer-manager.js";
import { SourceAnalyzer } from "./source-analyzer.js";

export class SpotifyOverlay {
  constructor() {
    this.domManager = new DOMManager();
    this.timerManager = new TimerManager(this.domManager);
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

    // タイマー管理を更新
    this.timerManager.updateTimerState(
      data.progressMs,
      data.duration,
      data.isPlaying
    );

    // DOM更新
    this.domManager.updateTrackInfo(data);

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
    this.timerManager.stop();
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
