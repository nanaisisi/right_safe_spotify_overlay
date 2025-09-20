import { createBasicAuth } from "../utils/helpers.ts";
import { TrackInfo } from "./spotify-player.ts";

export class VLCPlayer {
  private config: any;
  private lastTrackInfo: TrackInfo | null = null;

  constructor(config: any) {
    this.config = config;
  }

  async getCurrentlyPlaying(): Promise<TrackInfo | null> {
    if (!this.config.vlcEnabled) {
      return null;
    }

    try {
      const auth = createBasicAuth(this.config.vlcPassword);
      const vlcUrl = `http://127.0.0.1:${this.config.vlcPort}/requests/status.json`;

      const res = await fetch(vlcUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        signal: AbortSignal.timeout(this.config.vlcConnectionTimeout), // 設定可能なタイムアウト
      });

      if (!res.ok) {
        // エラーログを減らす - 初回のみ表示
        if (!this.lastTrackInfo) {
          if (res.status === 404) {
            console.error(
              `✗ VLC Web Interface not found. Please enable HTTP interface in VLC.`
            );
          } else if (res.status === 401) {
            console.error(
              `✗ VLC authentication failed. Check vlc.password setting in config.toml.`
            );
          }
        }
        return this.lastTrackInfo;
      }

      const data = await res.json();

      if (
        !data.information ||
        !data.information.category ||
        !data.information.category.meta
      ) {
        this.lastTrackInfo = null;
        return null;
      }

      const meta = data.information.category.meta;

      // デバッグ: 取得されたメタデータを確認
      console.log("VLC Meta data:", JSON.stringify(meta, null, 2));

      const trackName = meta.title || meta.filename || "Unknown Track";

      // より多くのアーティスト情報の候補を試す
      let artistName =
        meta.artist ||
        meta.album_artist ||
        meta.albumartist ||
        meta.composer ||
        meta.performer ||
        meta.album;

      // ファイル名からアーティスト情報を抽出を試みる
      if (
        !artistName ||
        artistName === "Unknown Artist" ||
        artistName === "アーティスト情報なし"
      ) {
        const filename = meta.filename || "";
        console.log("Trying to extract artist from filename:", filename);

        // ファイル拡張子を除去
        const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

        // さまざまなパターンを試す
        const patterns = [
          // "番号 アーティスト - 曲名" のパターン
          /^\d+\s+(.+?)\s*[-–—]\s*(.+)/,
          // "アーティスト - 曲名" のパターン
          /^(.+?)\s*[-–—]\s*(.+)/,
          // "アーティスト_曲名" のパターン
          /^(.+?)_(.+)/,
          // "[アーティスト] 曲名" のパターン
          /^\[(.+?)\]\s*(.+)/,
          // "曲名 by アーティスト" のパターン
          /^(.+?)\s+by\s+(.+)/i,
          // "番号 曲名" のパターン（曲名のみ）
          /^\d+\s+(.+)/,
        ];

        for (const pattern of patterns) {
          const match = nameWithoutExt.match(pattern);
          if (match) {
            console.log("Pattern matched:", pattern, "Result:", match);

            if (pattern.source.includes("\\d+\\s+(.+?)\\s*[-–—]")) {
              // "番号 アーティスト - 曲名" パターン
              const potentialArtist = match[1].trim();
              const potentialTitle = match[2].trim();

              // アーティスト名らしいかチェック（曲名と同じでないか）
              if (potentialArtist !== trackName.replace(/\s*-.*$/, "")) {
                artistName = potentialArtist;
                console.log("Extracted artist (pattern 1):", artistName);
              } else {
                console.log(
                  "Potential artist matches track name, skipping:",
                  potentialArtist
                );
              }
            } else if (pattern.source.includes("by")) {
              // "曲名 by アーティスト" パターン
              artistName = match[2].trim();
              console.log("Extracted artist (by pattern):", artistName);
            } else if (match.length >= 3) {
              // 通常のパターン - より短い方をアーティスト名として採用
              const part1 = match[1].trim();
              const part2 = match[2].trim();

              // 楽曲名と重複していないかチェック
              if (
                part1 !== trackName &&
                part1.length < part2.length &&
                part1.length > 1
              ) {
                artistName = part1;
                console.log("Extracted artist (length-based):", artistName);
              } else if (
                part2 !== trackName &&
                part2.length < part1.length &&
                part2.length > 1
              ) {
                artistName = part2;
                console.log("Extracted artist (length-based):", artistName);
              } else {
                console.log("No suitable artist found in parts:", {
                  part1,
                  part2,
                  trackName,
                });
              }
            } else if (pattern.source.includes("\\d+\\s+(.+)")) {
              // "番号 曲名" パターン - アーティスト情報なし
              console.log("Number + title pattern, no artist found");
            }

            if (
              artistName &&
              artistName !== "アーティスト情報なし" &&
              artistName !== trackName
            ) {
              break;
            }
          }
        }
      } // 最終的にアーティスト情報が見つからない場合
      if (!artistName) {
        artistName = "アーティスト情報なし";
      }

      const trackInfo: TrackInfo = {
        trackName: trackName,
        artistName: artistName,
        isPlaying: data.state === "playing",
        progressMs: Math.floor((data.time || 0) * 1000),
        durationMs: Math.floor((data.length || 0) * 1000),
        duration: Math.floor(data.length || 0), // VLCのlengthは秒単位
        isInPlaylist: false, // VLCではプレイリスト情報を取得できない
        source: "VLC",
      };

      this.lastTrackInfo = trackInfo;
      return trackInfo;
    } catch (error) {
      // エラーログを静かに - 接続エラーは頻繁に発生する可能性がある
      // 初回接続エラーのみログに記録
      if (
        !this.lastTrackInfo &&
        error instanceof Error &&
        error.message.includes("connection")
      ) {
        console.error(
          "✗ VLC connection failed. Please ensure VLC is running with HTTP interface enabled."
        );
      }
      return this.lastTrackInfo;
    }
  }

  async getDebugInfo(): Promise<string> {
    let debugInfo = `VLC Debug Information\n=====================\n\n`;
    debugInfo += `Configuration:\n`;
    debugInfo += `- Host: ${this.config.vlcHost}\n`;
    debugInfo += `- Port: ${this.config.vlcPort}\n`;
    debugInfo += `- Password: ${
      this.config.vlcPassword ? "[SET]" : "[NOT SET]"
    }\n\n`;

    try {
      const auth = createBasicAuth(this.config.vlcPassword);
      const testUrl = `http://${this.config.vlcHost}:${this.config.vlcPort}/requests/status.json`;
      debugInfo += `Testing connection to: ${testUrl}\n\n`;

      const res = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      debugInfo += `Response Status: ${res.status} ${res.statusText}\n`;
      debugInfo += `Response Headers:\n`;
      for (const [key, value] of res.headers.entries()) {
        debugInfo += `  ${key}: ${value}\n`;
      }

      if (res.ok) {
        const data = await res.json();
        debugInfo += `\nResponse Data:\n`;
        debugInfo += `- State: ${data.state || "unknown"}\n`;
        debugInfo += `- Position: ${data.position || "unknown"}\n`;
        debugInfo += `- Time: ${data.time || "unknown"}\n`;
        debugInfo += `- Length: ${data.length || "unknown"}\n`;

        if (data.information) {
          debugInfo += `- Information available: Yes\n`;
          if (data.information.category && data.information.category.meta) {
            const meta = data.information.category.meta;
            debugInfo += `- Title: ${meta.title || "Not available"}\n`;
            debugInfo += `- Artist: ${meta.artist || "Not available"}\n`;
            debugInfo += `- Filename: ${meta.filename || "Not available"}\n`;
          } else {
            debugInfo += `- Metadata: Not available\n`;
          }
        } else {
          debugInfo += `- Information available: No\n`;
        }
      } else {
        debugInfo += `\nError Details:\n`;
        const errorText = await res.text();
        debugInfo += errorText;

        if (res.status === 401) {
          debugInfo += `\n\nTroubleshooting for 401 Unauthorized:\n`;
          debugInfo += `1. Check if VLC Web Interface password is set\n`;
          debugInfo += `2. VLC Settings: Interface > Main interfaces > Lua > Lua HTTP > Password\n`;
          debugInfo += `3. Or start VLC with: vlc --intf http --http-password vlc --http-port 8080\n`;
        } else if (res.status === 404) {
          debugInfo += `\n\nTroubleshooting for 404 Not Found:\n`;
          debugInfo += `1. Make sure VLC Web Interface is enabled\n`;
          debugInfo += `2. Check "WEB" in Interface > Main interfaces\n`;
          debugInfo += `3. Restart VLC completely\n`;
        }
      }
    } catch (error) {
      debugInfo += `\nConnection Error:\n${
        error instanceof Error ? error.message : String(error)
      }\n`;
    }

    return debugInfo;
  }

  async getTestDiagnostic(): Promise<any> {
    try {
      const auth = createBasicAuth(this.config.vlcPassword);
      const vlcUrl = `http://${this.config.vlcHost}:${this.config.vlcPort}/requests/status.json`;

      const res = await fetch(vlcUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      return {
        vlcUrl: vlcUrl,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data: res.ok ? await res.json() : null,
        config: {
          vlcEnabled: this.config.vlcEnabled,
          vlcHost: this.config.vlcHost,
          vlcPort: this.config.vlcPort,
          vlcPassword: this.config.vlcPassword ? "***" : "NOT SET",
        },
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        config: {
          vlcEnabled: this.config.vlcEnabled,
          vlcHost: this.config.vlcHost,
          vlcPort: this.config.vlcPort,
          vlcPassword: this.config.vlcPassword ? "***" : "NOT SET",
        },
      };
    }
  }
}
