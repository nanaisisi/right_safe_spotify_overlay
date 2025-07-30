import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.140.0/http/file_server.ts";
import { loadConfig, validateConfig } from "../config.ts";
import { VLCProcessManager } from "./vlc/vlc-process.ts";
import { SpotifyAuth } from "./auth/spotify-auth.ts";
import { SpotifyPlayer } from "./media/spotify-player.ts";
import { VLCPlayer } from "./media/vlc-player.ts";
import { UnifiedPlayer } from "./media/unified-player.ts";
import { WebSocketManager } from "./websocket/websocket-handler.ts";
import { generateFavicon } from "./utils/helpers.ts";

// Load configuration
const config = loadConfig();
validateConfig(config);

// Initialize components
const vlcProcessManager = new VLCProcessManager(config);
const spotifyAuth = new SpotifyAuth(config);
const spotifyPlayer = new SpotifyPlayer(spotifyAuth, config);
const vlcPlayer = new VLCPlayer(config);
const unifiedPlayer = new UnifiedPlayer(spotifyPlayer, vlcPlayer, config);
const webSocketManager = new WebSocketManager(unifiedPlayer, config);

// Start VLC if auto-start is enabled (not recommended for production)
if (config.vlcEnabled && config.vlcAutoStart) {
    console.log("⚠️  VLC auto-start is enabled. This may cause issues when closing the application.");
    vlcProcessManager.startVLC();
}


serve(async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/login") {
        return Response.redirect(spotifyAuth.getAuthUrl(), 302);
    }

    if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (!code) {
            return new Response("Error: No code provided", { status: 400 });
        }

        const success = await spotifyAuth.handleCallback(code);
        if (!success) {
            return new Response("Authentication failed", { status: 400 });
        }

        // Redirect to home page after successful login
        return Response.redirect(`http://127.0.0.1:${config.port}/`, 302);
    }

    if (url.pathname === "/ws") {
        const { response, socket } = (globalThis as any).Deno.upgradeWebSocket(req);
        webSocketManager.handleConnection(socket);
        return response;
    }

    if (url.pathname === "/vlc-debug") {
        if (!config.vlcEnabled) {
            return new Response("VLC mode is not enabled. Set vlc.enabled=true in config.toml", 
                { status: 400 });
        }

        const debugInfo = await vlcPlayer.getDebugInfo();
        return new Response(debugInfo, {
            headers: { "Content-Type": "text/plain" }
        });
    }

    if (url.pathname === "/favicon.ico") {
        const favicon = generateFavicon();
        return new Response(favicon, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400"
            }
        });
    }

    if (url.pathname === "/vlc-test" && config.vlcEnabled) {
        const diagnostic = await vlcPlayer.getTestDiagnostic();
        return new Response(JSON.stringify(diagnostic, null, 2), {
            headers: { "Content-Type": "application/json" }
        });
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
    vlcProcessManager.shutdown();
    console.log("Server shutting down...");
    (globalThis as any).Deno.exit(0);
}

// Handle shutdown signals (Windows compatible)
(globalThis as any).Deno.addSignalListener("SIGINT", gracefulShutdown);  // Ctrl+C
if ((globalThis as any).Deno.build.os !== "windows") {
    // SIGTERM is not supported on Windows
    (globalThis as any).Deno.addSignalListener("SIGTERM", gracefulShutdown);
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
    console.log(`  3. If VLC connection fails, run helper scripts for detailed setup instructions`);
    console.log(`  4. 🎵 For Spotify integration: http://127.0.0.1:${config.port}/login`);
}
