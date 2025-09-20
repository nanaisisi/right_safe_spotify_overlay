import { SpotifyPlayer, TrackInfo } from "./spotify-player.ts";
import { VLCPlayer } from "./vlc-player.ts";
import { FallbackManager } from "./core/fallback-manager.ts";

export class UnifiedPlayer {
  private fallbackManager: FallbackManager;

  constructor(spotifyPlayer: SpotifyPlayer, vlcPlayer: VLCPlayer, config: any) {
    this.fallbackManager = new FallbackManager(
      spotifyPlayer,
      vlcPlayer,
      config
    );
  }

  get currentSource(): string {
    return this.fallbackManager.currentSource;
  }

  async getCurrentlyPlaying(): Promise<TrackInfo | null> {
    return await this.fallbackManager.getCurrentlyPlaying();
  }
}
