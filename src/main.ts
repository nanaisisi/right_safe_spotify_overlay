import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.140.0/http/file_server.ts";
import { encode } from "https://deno.land/std@0.140.0/encoding/base64.ts";
import { loadConfig, validateConfig } from "../config.ts";

// Load configuration
const config = loadConfig();
validateConfig(config);

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: number | null = null;

const connectedClients = new Set<WebSocket>();
let lastTrackInfo: any = null;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000; // Reset API call counter every minute

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

// Periodically fetch currently playing song and broadcast to clients
let lastBroadcastTrack: any = null;

setInterval(async () => {
    const nowPlaying = await getCurrentlyPlaying();
    
    // Only broadcast if track changed or if it's the first time
    const currentTrackId = nowPlaying ? `${nowPlaying.trackName}-${nowPlaying.artistName}-${nowPlaying.isPlaying}` : null;
    const lastTrackId = lastBroadcastTrack ? `${lastBroadcastTrack.trackName}-${lastBroadcastTrack.artistName}-${lastBroadcastTrack.isPlaying}` : null;
    
    if (currentTrackId !== lastTrackId) {
        const message = JSON.stringify(nowPlaying);
        for (const client of connectedClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
        lastBroadcastTrack = nowPlaying;
        console.log(`Track updated: ${nowPlaying ? `${nowPlaying.trackName} by ${nowPlaying.artistName}` : 'No track playing'}`);
    }
}, config.pollingInterval); // Use configuration for polling interval


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


        // Redirect to home page after successful login
        return Response.redirect(`http://127.0.0.1:${config.port}/`, 302);
    }

    if (url.pathname === "/ws") {
        const { response, socket } = Deno.upgradeWebSocket(req);

        socket.onopen = () => {
            console.log("WebSocket connection opened");
            connectedClients.add(socket);
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

    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
}, { port: config.port });

console.log(`Spotify Overlay Server is running on:`);
console.log(`  - Local:   http://127.0.0.1:${config.port}/`);
console.log(`  - Network: http://localhost:${config.port}/`);
console.log(`\nTo get started:`);
console.log(`  1. Open http://127.0.0.1:${config.port}/ in your browser`);
console.log(`  2. Go to http://127.0.0.1:${config.port}/login to authenticate with Spotify`);
