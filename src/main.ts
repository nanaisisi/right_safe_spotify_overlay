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

    if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
        await refreshAccessToken();
    }

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        },
    });

    if (res.status === 204) {
        // No content, nothing is playing
        return null;
    }
    if (res.status === 401) {
        // Unauthorized, token might have expired
        await refreshAccessToken();
        return getCurrentlyPlaying(); // Retry after refreshing
    }
    if (!res.ok) {
        const body = await res.text();
        console.error(`Error fetching currently playing: ${body}`);
        return null;
    }

    const data = await res.json();
    if (!data.item) {
        return null;
    }

    return {
        trackName: data.item.name,
        artistName: data.item.artists.map((artist: any) => artist.name).join(", "),
    };
}

// Periodically fetch currently playing song and broadcast to clients
setInterval(async () => {
    const nowPlaying = await getCurrentlyPlaying();
    if (nowPlaying) {
        const message = JSON.stringify(nowPlaying);
        for (const client of connectedClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
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

    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
}, { port: config.port });
