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
            // フォールバックモード中はSpotifyを優先使用
            if (this.isInFallbackMode) {
                const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
                if (spotifyTrack && spotifyTrack.isPlaying) {
                    // Spotify再生中 - VLCチェックは不要
                    this.lastUsedSource = "Spotify (VLC→10s fallback)";
                    return spotifyTrack;
                } else {
                    // Spotifyも停止中 - VLCの状態を再確認してフォールバックモードを解除するかチェック
                    const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
                    if (vlcTrack && vlcTrack.isPlaying) {
                        // VLCが再生開始 - フォールバックモード解除
                        this.vlcStoppedTime = null;
                        this.isInFallbackMode = false;
                        this.lastUsedSource = "VLC";
                        return vlcTrack;
                    } else {
                        // VLCも停止中 - フォールバックモード継続
                        this.lastUsedSource = spotifyTrack ? "Spotify (VLC→10s fallback)" : "None (both unavailable)";
                        return spotifyTrack;
                    }
                }
            }

            // 通常モード - まずVLCを確認
            const vlcTrack = await this.vlcPlayer.getCurrentlyPlaying();
            
            if (vlcTrack && vlcTrack.isPlaying) {
                // VLC再生中 - すべての状態をリセット
                this.vlcStoppedTime = null;
                this.isInFallbackMode = false;
                this.lastUsedSource = "VLC";
                return vlcTrack;
            } else if (vlcTrack && !vlcTrack.isPlaying) {
                // VLC一時停止中
                if (this.vlcStoppedTime === null) {
                    this.vlcStoppedTime = Date.now();
                }
                
                // 停止から設定された時間経過していない場合はVLCの情報を返す
                const timeSinceStopped = Date.now() - this.vlcStoppedTime;
                if (timeSinceStopped < this.config.vlcFallbackDelay) {
                    this.lastUsedSource = "VLC (paused)";
                    return vlcTrack;
                }
                
                // 10秒経過 - Spotifyをチェックしてフォールバックモードに移行
                const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
                if (spotifyTrack) {
                    this.isInFallbackMode = true;
                    this.lastUsedSource = "Spotify (VLC→10s fallback)";
                    return spotifyTrack;
                } else {
                    this.lastUsedSource = "VLC (paused, Spotify unavailable)";
                    return vlcTrack;
                }
            } else {
                // VLC接続失敗 - 即座にSpotifyにフォールバック
                this.vlcStoppedTime = null;
                const spotifyTrack = await this.spotifyPlayer.getCurrentlyPlaying();
                if (spotifyTrack) {
                    this.lastUsedSource = "Spotify (VLC unavailable)";
                    return spotifyTrack;
                } else {
                    this.lastUsedSource = "None (both unavailable)";
                    return null;
                }
            }
        } else {
            this.lastUsedSource = "Spotify";
            return await this.spotifyPlayer.getCurrentlyPlaying();
        }
    }
}
