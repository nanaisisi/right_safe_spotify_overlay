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
                    "Authorization": `Basic ${auth}`,
                },
                signal: AbortSignal.timeout(this.config.vlcConnectionTimeout) // 設定可能なタイムアウト
            });

            if (!res.ok) {
                // エラーログを減らす - 初回のみ表示
                if (!this.lastTrackInfo) {
                    if (res.status === 404) {
                        console.error(`✗ VLC Web Interface not found. Please enable HTTP interface in VLC.`);
                    } else if (res.status === 401) {
                        console.error(`✗ VLC authentication failed. Check vlc.password setting in config.toml.`);
                    }
                }
                return this.lastTrackInfo;
            }

            const data = await res.json();
            
            if (!data.information || !data.information.category || !data.information.category.meta) {
                this.lastTrackInfo = null;
                return null;
            }

            const meta = data.information.category.meta;
            const trackName = meta.title || meta.filename || "Unknown Track";
            const artistName = meta.artist || meta.album || "Unknown Artist";
            
            const trackInfo: TrackInfo = {
                trackName: trackName,
                artistName: artistName,
                isPlaying: data.state === "playing",
                progressMs: Math.floor((data.time || 0) * 1000),
                durationMs: Math.floor((data.length || 0) * 1000),
            };

            this.lastTrackInfo = trackInfo;
            return trackInfo;
        } catch (error) {
            // エラーログを静かに - 接続エラーは頻繁に発生する可能性がある
            // 初回接続エラーのみログに記録
            if (!this.lastTrackInfo && error.message.includes("connection")) {
                console.error("✗ VLC connection failed. Please ensure VLC is running with HTTP interface enabled.");
            }
            return this.lastTrackInfo;
        }
    }

    async getDebugInfo(): Promise<string> {
        let debugInfo = `VLC Debug Information\n=====================\n\n`;
        debugInfo += `Configuration:\n`;
        debugInfo += `- Host: ${this.config.vlcHost}\n`;
        debugInfo += `- Port: ${this.config.vlcPort}\n`;
        debugInfo += `- Password: ${this.config.vlcPassword ? '[SET]' : '[NOT SET]'}\n\n`;

        try {
            const auth = createBasicAuth(this.config.vlcPassword);
            const testUrl = `http://${this.config.vlcHost}:${this.config.vlcPort}/requests/status.json`;
            debugInfo += `Testing connection to: ${testUrl}\n\n`;

            const res = await fetch(testUrl, {
                headers: {
                    "Authorization": `Basic ${auth}`,
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
                debugInfo += `- State: ${data.state || 'unknown'}\n`;
                debugInfo += `- Position: ${data.position || 'unknown'}\n`;
                debugInfo += `- Time: ${data.time || 'unknown'}\n`;
                debugInfo += `- Length: ${data.length || 'unknown'}\n`;
                
                if (data.information) {
                    debugInfo += `- Information available: Yes\n`;
                    if (data.information.category && data.information.category.meta) {
                        const meta = data.information.category.meta;
                        debugInfo += `- Title: ${meta.title || 'Not available'}\n`;
                        debugInfo += `- Artist: ${meta.artist || 'Not available'}\n`;
                        debugInfo += `- Filename: ${meta.filename || 'Not available'}\n`;
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
            debugInfo += `\nConnection Error:\n${error.message}\n`;
        }

        return debugInfo;
    }

    async getTestDiagnostic(): Promise<any> {
        try {
            const auth = createBasicAuth(this.config.vlcPassword);
            const vlcUrl = `http://${this.config.vlcHost}:${this.config.vlcPort}/requests/status.json`;
            
            const res = await fetch(vlcUrl, {
                headers: {
                    "Authorization": `Basic ${auth}`,
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
                    vlcPassword: this.config.vlcPassword ? "***" : "NOT SET"
                }
            };
        } catch (error) {
            return {
                error: error.message,
                config: {
                    vlcEnabled: this.config.vlcEnabled,
                    vlcHost: this.config.vlcHost,
                    vlcPort: this.config.vlcPort,
                    vlcPassword: this.config.vlcPassword ? "***" : "NOT SET"
                }
            };
        }
    }
}
