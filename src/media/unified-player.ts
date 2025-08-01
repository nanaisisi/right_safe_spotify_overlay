import { SpotifyPlayer, TrackInfo } from "./spotify-player.ts";
import { VLCPlayer } from "./vlc-player.ts";

export class UnifiedPlayer {
  private spotifyPlayer: SpotifyPlayer;
  private vlcPlayer: VLCPlayer;
  private config: any;

  // VLC停止時刻を記録
  private vlcStoppedTime: number | null = null;
  // フォールバックモード中かどうか
  private isInFallbackMode: boolean = false;
  // 実際に使用したソースを記録
  private lastUsedSource: string = "";

  constructor(spotifyPlayer: SpotifyPlayer, vlcPlayer: VLCPlayer, config: any) {
    this.spotifyPlayer = spotifyPlayer;
    this.vlcPlayer = vlcPlayer;
    this.config = config;
  }

  get currentSource(): string {
    return this.lastUsedSource;
  }

  async getCurrentlyPlaying(): Promise<TrackInfo | null> {
    if (this.config.vlcEnabled) {
      console.log("=== UnifiedPlayer Debug ===");
      console.log("フォールバックモード:", this.isInFallbackMode);
      console.log("VLC停止時刻:", this.vlcStoppedTime);

      // フォールバックモード中はSpotifyを優先使用
      if (this.isInFallbackMode) {
        console.log("フォールバックモード中 - Spotifyをチェック");
        const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
        if (spotifyTrack && spotifyTrack.isPlaying) {
          // Spotify再生中 - VLCチェックは不要
          this.lastUsedSource = "Spotify (VLC→10s fallback)";
          console.log("→ Spotify再生中を使用");
          return spotifyTrack;
        } else {
          // Spotifyも停止中 - VLCの状態を再確認してフォールバックモードを解除するかチェック
          console.log("Spotify停止中 - VLCを再確認");
          const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
          console.log("VLC再確認結果:", vlcTrack);
          if (vlcTrack && vlcTrack.isPlaying) {
            // VLCが再生開始 - フォールバックモード解除
            console.log("→ VLC再生開始検出 - フォールバックモード解除");
            this.vlcStoppedTime = null;
            this.isInFallbackMode = false;
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
      }

      // 通常モード - まずVLCを確認
      console.log("通常モード - VLCをチェック");
      const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
      console.log("VLC取得結果:", vlcTrack);

      if (vlcTrack && vlcTrack.isPlaying) {
        // VLC再生中 - すべての状態をリセット
        console.log("→ VLC再生中を使用");
        this.vlcStoppedTime = null;
        this.isInFallbackMode = false;
        this.lastUsedSource = "VLC";
        return vlcTrack;
      } else if (vlcTrack && !vlcTrack.isPlaying) {
        // VLC一時停止中
        console.log("VLC一時停止中");
        if (this.vlcStoppedTime === null) {
          this.vlcStoppedTime = Date.now();
          console.log("VLC停止時刻を記録:", this.vlcStoppedTime);
        }

        // 停止から設定された時間経過していない場合はVLCの情報を返す
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

        // 10秒経過 - Spotifyをチェックしてフォールバックモードに移行
        console.log("閾値超過 - Spotifyフォールバックを検討");
        const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
        console.log("Spotify情報:", spotifyTrack);
        if (spotifyTrack) {
          console.log("→ Spotifyフォールバックモードに移行");
          this.isInFallbackMode = true;
          this.lastUsedSource = "Spotify (VLC→10s fallback)";
          return spotifyTrack;
        } else {
          console.log("→ VLC一時停止情報を使用（Spotify利用不可）");
          this.lastUsedSource = "VLC (paused, Spotify unavailable)";
          return vlcTrack;
        }
      } else {
        // VLC接続失敗またはデータなし
        console.log("VLC接続失敗またはデータなし");
        this.vlcStoppedTime = null;
        const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
        console.log("Spotifyフォールバック:", spotifyTrack);
        if (spotifyTrack) {
          console.log("→ Spotify使用（VLC利用不可）");
          this.lastUsedSource = "Spotify (VLC unavailable)";
          return spotifyTrack;
        } else {
          console.log("→ 両方とも利用不可");
          this.lastUsedSource = "None (both unavailable)";
          return null;
        }
      }
    } else {
      // VLC無効 - Spotifyのみ使用
      console.log("VLC無効モード - Spotifyのみ使用");
      this.lastUsedSource = "Spotify";
      return await this.spotifyPlayer.getCurrentlyPlaying();
    }
  }
}
