import { SpotifyAuth } from "../auth/spotify-auth.ts";

export interface TrackInfo {
  trackName: string;
  artistName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  duration: number; // 秒数表示用
  isInPlaylist: boolean; // プレイリスト情報用
  source: string; // 音源情報
}

export class SpotifyPlayer {
  private auth: SpotifyAuth;
  private config: any;
  private lastTrackInfo: TrackInfo | null = null;
  private apiCallCount = 0;
  private apiCallResetTime: number;

  constructor(auth: SpotifyAuth, config: any) {
    this.auth = auth;
    this.config = config;
    this.apiCallResetTime = Date.now() + config.spotifyRateLimitWindow;
  }

  async getCurrentlyPlaying(): Promise<TrackInfo | null> {
    if (!this.auth.isAuthenticated) {
      this.auth.showLoginWarning();
      return null;
    }

    // Rate limiting check - configurable API limit
    const now = Date.now();
    if (now > this.apiCallResetTime) {
      this.apiCallCount = 0;
      this.apiCallResetTime = now + this.config.spotifyRateLimitWindow;
    }

    if (this.apiCallCount >= this.config.spotifyApiLimit) {
      console.log("API rate limit reached, skipping request");
      return this.lastTrackInfo; // Return cached info
    }

    this.auth.checkTokenExpiration();

    this.apiCallCount++;
    const res = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${this.auth.token}`,
        },
      }
    );

    if (res.status === 204) {
      // No content, nothing is playing
      this.lastTrackInfo = null;
      return null;
    }
    if (res.status === 401) {
      // Unauthorized, token might have expired
      await this.auth.refreshAccessToken();
      return this.getCurrentlyPlaying(); // Retry after refreshing
    }
    if (res.status === 429) {
      // Rate limited by Spotify
      const retryAfter = res.headers.get("Retry-After");
      console.log(
        `Rate limited by Spotify. Retry after: ${retryAfter} seconds`
      );
      return this.lastTrackInfo; // Return cached info
    }
    if (!res.ok) {
      const body = await res.text();
      console.error(`Error fetching currently playing: ${body}`);
      return this.lastTrackInfo; // Return cached info on error
    }

    const data = await res.json();
    if (!data.item) {
      this.lastTrackInfo = null;
      return null;
    }

    // プレイリスト情報をチェック
    const isInPlaylist = data.context && data.context.type === "playlist";
    console.log("Spotify API Response Debug:");
    console.log("- Context:", data.context);
    console.log("- Context Type:", data.context?.type);
    console.log("- Is in Playlist:", isInPlaylist);

    const trackInfo: TrackInfo = {
      trackName: data.item.name,
      artistName: data.item.artists
        .map((artist: any) => artist.name)
        .join(", "),
      isPlaying: data.is_playing,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
      duration: Math.floor(data.item.duration_ms / 1000), // ミリ秒から秒に変換
      isInPlaylist: isInPlaylist,
      source: "Spotify",
    };

    this.lastTrackInfo = trackInfo;
    return trackInfo;
  }
}
