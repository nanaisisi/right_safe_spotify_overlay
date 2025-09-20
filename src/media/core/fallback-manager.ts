/**
 * Fallback Manager - フォールバック機能の管理
 * VLCとSpotifyの切り替えロジックを担当
 */

import { SpotifyPlayer, TrackInfo } from "../spotify-player.ts";
import { VLCPlayer } from "../vlc-player.ts";

export class FallbackManager {
  private vlcStoppedTime: number | null = null;
  private isInFallbackMode: boolean = false;
  private lastUsedSource: string = "";

  constructor(
    private spotifyPlayer: SpotifyPlayer,
    private vlcPlayer: VLCPlayer,
    private config: any
  ) {}

  get currentSource(): string {
    return this.lastUsedSource;
  }

  /**
   * 現在再生中の楽曲を取得（フォールバック機能付き）
   */
  async getCurrentlyPlaying(): Promise<TrackInfo | null> {
    if (!this.config.vlcEnabled) {
      // VLC無効時はSpotifyのみ
      const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
      this.lastUsedSource = spotifyTrack ? "Spotify" : "None";
      return spotifyTrack;
    }

    console.log("=== FallbackManager Debug ===");
    console.log("フォールバックモード:", this.isInFallbackMode);
    console.log("VLC停止時刻:", this.vlcStoppedTime);

    // フォールバックモード中はSpotifyを優先使用
    if (this.isInFallbackMode) {
      return await this.handleFallbackMode();
    }

    // 通常モード - まずVLCを確認
    return await this.handleNormalMode();
  }

  /**
   * フォールバックモードの処理
   */
  private async handleFallbackMode(): Promise<TrackInfo | null> {
    console.log("フォールバックモード中 - Spotifyをチェック");
    const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();

    if (spotifyTrack && spotifyTrack.isPlaying) {
      // Spotify再生中 - VLCチェックは不要
      this.lastUsedSource = "Spotify (VLC→10s fallback)";
      console.log("→ Spotify再生中を使用");
      return spotifyTrack;
    } else {
      // Spotifyも停止中 - VLCの状態を再確認
      return await this.recheckVLCStatus(spotifyTrack);
    }
  }

  /**
   * VLCの状態を再確認
   */
  private async recheckVLCStatus(
    spotifyTrack: TrackInfo | null
  ): Promise<TrackInfo | null> {
    console.log("Spotify停止中 - VLCを再確認");
    const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
    console.log("VLC再確認結果:", vlcTrack);

    if (vlcTrack && vlcTrack.isPlaying) {
      // VLCが再生開始 - フォールバックモード解除
      console.log("→ VLC再生開始検出 - フォールバックモード解除");
      this.resetToNormalMode();
      this.lastUsedSource = "VLC";
      return vlcTrack;
    } else {
      // VLCも停止中 - フォールバックモード継続
      this.lastUsedSource = spotifyTrack
        ? "Spotify (VLC→10s fallback)"
        : "None (both unavailable)";
      console.log("→ フォールバックモード継続");
      return spotifyTrack;
    }
  }

  /**
   * 通常モードの処理
   */
  private async handleNormalMode(): Promise<TrackInfo | null> {
    console.log("通常モード - VLCをチェック");
    const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
    console.log("VLC取得結果:", vlcTrack);

    if (vlcTrack && vlcTrack.isPlaying) {
      // VLC再生中 - すべての状態をリセット
      console.log("→ VLC再生中を使用");
      this.resetToNormalMode();
      this.lastUsedSource = "VLC";
      return vlcTrack;
    } else if (vlcTrack && !vlcTrack.isPlaying) {
      // VLC一時停止中
      return await this.handleVLCPaused(vlcTrack);
    } else {
      // VLC接続不可
      return await this.handleVLCUnavailable();
    }
  }

  /**
   * VLC一時停止時の処理
   */
  private async handleVLCPaused(
    vlcTrack: TrackInfo
  ): Promise<TrackInfo | null> {
    console.log("VLC一時停止中");

    if (this.vlcStoppedTime === null) {
      this.vlcStoppedTime = Date.now();
      console.log("VLC停止時刻を記録:", this.vlcStoppedTime);
    }

    const timeSinceStopped = Date.now() - this.vlcStoppedTime;
    console.log(
      "停止経過時間:",
      timeSinceStopped,
      "ms / 閾値:",
      this.config.vlcFallbackDelay,
      "ms"
    );

    if (timeSinceStopped < this.config.vlcFallbackDelay) {
      console.log("→ 閾値内 - VLC一時停止情報を使用");
      this.lastUsedSource = "VLC (paused)";
      return vlcTrack;
    }

    // 閾値経過 - Spotifyフォールバック
    return await this.initiateSpotifyFallback(vlcTrack);
  }

  /**
   * Spotifyフォールバックを開始
   */
  private async initiateSpotifyFallback(
    vlcTrack: TrackInfo
  ): Promise<TrackInfo | null> {
    console.log("閾値超過 - Spotifyフォールバックを検討");
    const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();

    if (spotifyTrack && spotifyTrack.isPlaying) {
      // Spotifyフォールバックモードに移行
      console.log("→ Spotifyフォールバックモードに移行");
      this.isInFallbackMode = true;
      this.lastUsedSource = "Spotify (VLC→10s fallback)";
      return spotifyTrack;
    } else {
      // Spotify利用不可 - VLC一時停止情報を使用
      console.log("→ VLC一時停止情報を使用（Spotify利用不可）");
      const spotifyStatus = spotifyTrack ? "available" : "unavailable";
      this.lastUsedSource = `VLC (paused, Spotify ${spotifyStatus})`;
      return vlcTrack;
    }
  }

  /**
   * VLC接続不可時の処理
   */
  private async handleVLCUnavailable(): Promise<TrackInfo | null> {
    console.log("VLC接続不可 - Spotifyをチェック");
    const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();

    if (spotifyTrack) {
      this.lastUsedSource = "Spotify (VLC unavailable)";
      console.log("→ Spotify使用（VLC接続不可）");
      return spotifyTrack;
    } else {
      this.lastUsedSource = "None (all unavailable)";
      console.log("→ すべて利用不可");
      return null;
    }
  }

  /**
   * 通常モードにリセット
   */
  private resetToNormalMode() {
    this.vlcStoppedTime = null;
    this.isInFallbackMode = false;
  }
}
