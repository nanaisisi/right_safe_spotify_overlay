import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.140.0/http/file_server.ts";
import { encode } from "https://deno.land/std@0.140.0/encoding/base64.ts";
import { loadConfig, validateConfig } from "../config.ts";

// Load configuration
const config = loadConfig();
validateConfig(config);

// VLC process management - only used if auto-start is enabled
let vlcProcess: Deno.ChildProcess | null = null;

// Start VLC if auto-start is enabled (not recommended for production)
if (config.vlcEnabled && config.vlcAutoStart) {
    console.log("⚠️  VLC auto-start is enabled. This may cause issues when closing the application.");
    startVLC();
}

async function startVLC() {
    if (vlcProcess) {
        console.log("VLC is already running");
        return;
    }

    try {
        const guiText = config.vlcShowGui ? "GUI and " : "";
        console.log(`Starting VLC (${config.vlcExePath}) with ${guiText}web interface...`);
        
        const args = [
            "--extraintf", "http",       // Add HTTP interface as extra interface
            "--http-password", config.vlcPassword,
            "--http-port", config.vlcPort.toString(),
            "--http-host", "127.0.0.1",  // Use IPv4 explicitly
            "--http-src", "127.0.0.1",   // Source address for HTTP interface
            "--no-ipv6"                  // Disable IPv6
        ];
        
        // Add GUI control options
        if (!config.vlcShowGui) {
            args.push("--intf", "dummy");  // No GUI interface
        }
        
        const command = new Deno.Command(config.vlcExePath, {
            args: args,
            stdout: "piped",
            stderr: "piped"
        });
        
        vlcProcess = command.spawn();
        
        console.log(`✓ VLC started with PID: ${vlcProcess.pid}`);
        
        // Wait longer for VLC to initialize
        console.log("⏳ Waiting for VLC to initialize...");
        await delay(5000);
        
        // Check if VLC web interface is accessible
        await checkVLCWebInterface();
        
    } catch (error) {
        console.error("Failed to start VLC:", error);
        vlcProcess = null;
    }
}

async function checkVLCWebInterface() {
    const maxRetries = 3;
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`http://127.0.0.1:${config.vlcPort}/requests/status.json`, {
                headers: {
                    'Authorization': 'Basic ' + btoa(':' + config.vlcPassword)
                }
            });
            
            if (response.ok) {
                console.log("✓ VLC web interface is accessible");
                return;
            } else {
                console.error(`✗ VLC web interface returned error: ${response.status} (attempt ${i + 1}/${maxRetries})`);
            }
        } catch (error) {
            lastError = error;
            console.error(`✗ VLC connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
            if (i < maxRetries - 1) {
                console.log("⏳ Retrying in 2 seconds...");
                await delay(2000);
            }
        }
    }
    
    console.error("✗ Failed to connect to VLC web interface after all retries");
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: number | null = null;

const connectedClients = new Set<WebSocket>();
let lastTrackInfo: any = null;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000; // Reset API call counter every minute

// 未ログイン警告の状態管理
let loginWarningCount = 0;
let lastLoginWarningTime = 0;
const LOGIN_WARNING_INTERVAL = 120000; // 2分間隔で警告

async function refreshAccessToken() {
    if (!refreshToken) {
        console.error("No refresh token available");
        return;
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + encode(`${config.clientId}:${config.clientSecret}`),
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        console.error(`Error refreshing token: ${body}`);
        // Potentially handle this by forcing a re-login
        accessToken = null;
        refreshToken = null;
        return;
    }

    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    console.log("Access token refreshed");
}

async function getCurrentlyPlaying() {
    if (!accessToken) {
        // 未ログイン警告（2分間隔で最大2回まで）
        const now = Date.now();
        if (loginWarningCount < 2 && (now - lastLoginWarningTime) > LOGIN_WARNING_INTERVAL) {
            loginWarningCount++;
            lastLoginWarningTime = now;
            console.warn(`⚠️  Spotify not authenticated! (Warning ${loginWarningCount}/2)`);
            console.warn(`   Please go to http://127.0.0.1:${config.port}/login to authenticate`);
            console.warn(`   Without authentication, no track information will be available.`);
        }
        return null;
    }

    // Rate limiting check - max 30 calls per minute
    const now = Date.now();
    if (now > apiCallResetTime) {
        apiCallCount = 0;
        apiCallResetTime = now + 60000;
    }
    
    if (apiCallCount >= 30) {
        console.log("API rate limit reached, skipping request");
        return lastTrackInfo; // Return cached info
    }

    if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
        await refreshAccessToken();
    }

    apiCallCount++;
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        },
    });

    if (res.status === 204) {
        // No content, nothing is playing
        lastTrackInfo = null;
        return null;
    }
    if (res.status === 401) {
        // Unauthorized, token might have expired
        await refreshAccessToken();
        return getCurrentlyPlaying(); // Retry after refreshing
    }
    if (res.status === 429) {
        // Rate limited by Spotify
        const retryAfter = res.headers.get("Retry-After");
        console.log(`Rate limited by Spotify. Retry after: ${retryAfter} seconds`);
        return lastTrackInfo; // Return cached info
    }
    if (!res.ok) {
        const body = await res.text();
        console.error(`Error fetching currently playing: ${body}`);
        return lastTrackInfo; // Return cached info on error
    }

    const data = await res.json();
    if (!data.item) {
        lastTrackInfo = null;
        return null;
    }

    const trackInfo = {
        trackName: data.item.name,
        artistName: data.item.artists.map((artist: any) => artist.name).join(", "),
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        durationMs: data.item.duration_ms,
    };

    lastTrackInfo = trackInfo;
    return trackInfo;
}

// VLC Media Player integration
async function getCurrentlyPlayingVLC() {
    if (!config.vlcEnabled) {
        return null;
    }

    try {
        const auth = btoa(`:${config.vlcPassword}`);
        const vlcUrl = `http://127.0.0.1:${config.vlcPort}/requests/status.json`;
        
        const res = await fetch(vlcUrl, {
            headers: {
                "Authorization": `Basic ${auth}`,
            },
            signal: AbortSignal.timeout(3000) // 3秒でタイムアウト
        });

        if (!res.ok) {
            // エラーログを減らす - 初回のみ表示
            if (!lastTrackInfo) {
                if (res.status === 404) {
                    console.error(`✗ VLC Web Interface not found. Please enable HTTP interface in VLC.`);
                } else if (res.status === 401) {
                    console.error(`✗ VLC authentication failed. Check VLC_PASSWORD setting.`);
                }
            }
            return lastTrackInfo;
        }

        const data = await res.json();
        
        if (!data.information || !data.information.category || !data.information.category.meta) {
            lastTrackInfo = null;
            return null;
        }

        const meta = data.information.category.meta;
        const trackName = meta.title || meta.filename || "Unknown Track";
        const artistName = meta.artist || meta.album || "Unknown Artist";
        
        const trackInfo = {
            trackName: trackName,
            artistName: artistName,
            isPlaying: data.state === "playing",
            progressMs: Math.floor((data.time || 0) * 1000),
            durationMs: Math.floor((data.length || 0) * 1000),
        };

        lastTrackInfo = trackInfo;
        return trackInfo;
    } catch (error) {
        // エラーログを静かに - 接続エラーは頻繁に発生する可能性がある
        // 初回接続エラーのみログに記録
        if (!lastTrackInfo && error.message.includes("connection")) {
            console.error("✗ VLC connection failed. Please ensure VLC is running with HTTP interface enabled.");
        }
        return lastTrackInfo;
    }
}

// Unified function to get currently playing from either Spotify or VLC
async function getCurrentlyPlayingUnified() {
    if (config.vlcEnabled) {
        // VLC併用 - VLCからの取得を優先し、失敗時はSpotifyにフォールバック
        const vlcTrack = await getCurrentlyPlayingVLC();
        if (vlcTrack) {
            return vlcTrack;
        }
        // VLCで取得できない場合はSpotifyを試す
        return await getCurrentlyPlaying();
    } else {
        return await getCurrentlyPlaying();
    }
}

// Adaptive polling system for currently playing song
let lastBroadcastTrack: any = null;
let lastTrackChangeTime = Date.now();
let consecutiveNoChanges = 0;
let currentPollingInterval = 5000; // Default start
// Spotify用の間隔（API制限を考慮して長め）
const spotifyShortInterval = 10000; // 10秒間隔
const spotifyLongInterval = 60000;  // 60秒間隔
// VLC用の間隔（ローカルAPIなので短め）
const vlcShortInterval = 5000;  // 5秒間隔
const vlcLongInterval = 10000;  // 10秒間隔

async function checkAndBroadcastTrack() {
    const nowPlaying = await getCurrentlyPlayingUnified();
    
    // Only broadcast if track changed or if it's the first time
    const currentTrackId = nowPlaying ? `${nowPlaying.trackName}-${nowPlaying.artistName}-${nowPlaying.isPlaying}` : null;
    const lastTrackId = lastBroadcastTrack ? `${lastBroadcastTrack.trackName}-${lastBroadcastTrack.artistName}-${lastBroadcastTrack.isPlaying}` : null;
    
    // 使用するポーリング間隔を決定（SpotifyとVLCで異なる間隔）
    const shortInterval = config.vlcEnabled ? vlcShortInterval : spotifyShortInterval;
    const longInterval = config.vlcEnabled ? vlcLongInterval : spotifyLongInterval;
    
    if (currentTrackId !== lastTrackId) {
        // Track changed - broadcast and reset polling to frequent mode
        const message = JSON.stringify(nowPlaying);
        for (const client of connectedClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
        lastBroadcastTrack = nowPlaying;
        lastTrackChangeTime = Date.now();
        consecutiveNoChanges = 0;
        currentPollingInterval = shortInterval;
        const source = config.vlcEnabled ? "VLC/Spotify" : "Spotify";
        console.log(`Track updated (${source}): ${nowPlaying ? `${nowPlaying.trackName} by ${nowPlaying.artistName}` : 'No track playing'} (polling: ${currentPollingInterval}ms)`);
    } else {
        // No change detected
        consecutiveNoChanges++;
        const timeSinceLastChange = Date.now() - lastTrackChangeTime;
        
        // If no changes for more than 30 seconds, switch to long interval
        if (timeSinceLastChange > 30000 && currentPollingInterval === shortInterval) {
            currentPollingInterval = longInterval;
            console.log(`Switching to long polling interval (${longInterval}ms) - no track changes for ${Math.round(timeSinceLastChange / 1000)}s`);
        }
    }
    
    // Schedule next check with current interval
    setTimeout(checkAndBroadcastTrack, currentPollingInterval);
}

// Start the adaptive polling
setTimeout(checkAndBroadcastTrack, 1000); // Start after 1 second


serve(async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/login") {
        const scope = "user-read-currently-playing";
        const authUrl = new URL("https://accounts.spotify.com/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", config.clientId);
        authUrl.searchParams.set("scope", scope);
        authUrl.searchParams.set("redirect_uri", config.redirectUri);
        return Response.redirect(authUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (!code) {
            return new Response("Error: No code provided", { status: 400 });
        }

        const res = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + encode(`${config.clientId}:${config.clientSecret}`),
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: config.redirectUri,
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            return new Response(`Error: ${body}`, { status: res.status });
        }

        const data = await res.json();
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        tokenExpiresAt = Date.now() + data.expires_in * 1000;

        // ログイン成功時に警告カウントをリセット
        loginWarningCount = 0;
        lastLoginWarningTime = 0;
        console.log("✓ Spotify authentication successful!");

        // Redirect to home page after successful login
        return Response.redirect(`http://127.0.0.1:${config.port}/`, 302);
    }

    if (url.pathname === "/ws") {
        const { response, socket } = Deno.upgradeWebSocket(req);

        socket.onopen = () => {
            console.log("WebSocket connection opened");
            connectedClients.add(socket);
            
            // Send current track info immediately to new client
            if (lastBroadcastTrack && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(lastBroadcastTrack));
                console.log("Sent current track info to new client");
            }
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
            connectedClients.delete(socket);
        };

        socket.onerror = (e) => {
            console.error("WebSocket error:", e);
        };

        return response;
    }

    if (url.pathname === "/vlc-debug") {
        if (!config.vlcEnabled) {
            return new Response("VLC mode is not enabled. Set VLC_ENABLED=true in .env", 
                { status: 400 });
        }

        let debugInfo = `VLC Debug Information\n=====================\n\n`;
        debugInfo += `Configuration:\n`;
        debugInfo += `- Host: ${config.vlcHost}\n`;
        debugInfo += `- Port: ${config.vlcPort}\n`;
        debugInfo += `- Password: ${config.vlcPassword ? '[SET]' : '[NOT SET]'}\n\n`;

        try {
            const auth = btoa(`:${config.vlcPassword}`);
            const testUrl = `http://${config.vlcHost}:${config.vlcPort}/requests/status.json`;
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

        return new Response(debugInfo, {
            headers: { "Content-Type": "text/plain" }
        });
    }

    if (url.pathname === "/favicon.ico") {
        // Return a simple 16x16 transparent PNG favicon
        const favicon = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0xf3, 0xff, 0x61, 0x00, 0x00, 0x00,
            0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
        ]);
        
        return new Response(favicon, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400"
            }
        });
    }

    if (url.pathname === "/vlc-test" && config.vlcEnabled) {
        // VLC diagnostic endpoint
        try {
            const auth = btoa(`:${config.vlcPassword}`);
            const vlcUrl = `http://${config.vlcHost}:${config.vlcPort}/requests/status.json`;
            
            const res = await fetch(vlcUrl, {
                headers: {
                    "Authorization": `Basic ${auth}`,
                },
            });

            const diagnostic = {
                vlcUrl: vlcUrl,
                status: res.status,
                statusText: res.statusText,
                ok: res.ok,
                data: res.ok ? await res.json() : null,
                config: {
                    vlcEnabled: config.vlcEnabled,
                    vlcHost: config.vlcHost,
                    vlcPort: config.vlcPort,
                    vlcPassword: config.vlcPassword ? "***" : "NOT SET"
                }
            };

            return new Response(JSON.stringify(diagnostic, null, 2), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                error: error.message,
                config: {
                    vlcEnabled: config.vlcEnabled,
                    vlcHost: config.vlcHost,
                    vlcPort: config.vlcPort,
                    vlcPassword: config.vlcPassword ? "***" : "NOT SET"
                }
            }, null, 2), {
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
}, { port: config.port });

// Graceful shutdown
function gracefulShutdown() {
    if (vlcProcess) {
        console.log("Terminating VLC process...");
        try {
            vlcProcess.kill("SIGTERM");
        } catch (error) {
            console.error("Error terminating VLC process:", error);
        }
        vlcProcess = null;
    }
    console.log("Server shutting down...");
    Deno.exit(0);
}

// Handle shutdown signals (Windows compatible)
Deno.addSignalListener("SIGINT", gracefulShutdown);  // Ctrl+C
if (Deno.build.os !== "windows") {
    // SIGTERM is not supported on Windows
    Deno.addSignalListener("SIGTERM", gracefulShutdown);
}

console.log(`Spotify Overlay Server is running on:`);
console.log(`  - Local:   http://127.0.0.1:${config.port}/`);
console.log(`  - Network: http://localhost:${config.port}/`);
console.log(`\nMedia Source: ${config.vlcEnabled ? 'VLC Media Player (with Spotify fallback)' : 'Spotify'}`);
if (config.vlcEnabled) {
    console.log(`VLC Connection: http://${config.vlcHost}:${config.vlcPort}/`);
    console.log(`Fallback: Spotify Web API`);
    if (config.vlcAutoStart) {
        console.log(`VLC Auto-start: Enabled (${config.vlcExePath})`);
    }
}
console.log(`\nTo get started:`);
console.log(`  1. Open http://127.0.0.1:${config.port}/ in your browser`);
if (!config.vlcEnabled) {
    console.log(`  2. ⚠️  Spotify authentication required!`);
    console.log(`     Go to http://127.0.0.1:${config.port}/login to authenticate with Spotify`);
    console.log(`     Note: This connects to your Spotify account to read currently playing tracks`);
} else {
    console.log(`  2. Make sure VLC Web Interface is enabled (Preferences > Interface > Main interfaces > Web)`);
    console.log(`  3. If VLC connection fails, run 'vlc-setup-helper.bat' for detailed setup instructions`);
}
