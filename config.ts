// Configuration file for the Spotify overlay application

export interface Config {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    port: number;
    pollingInterval: number;
}

// Load configuration from environment variables with fallback defaults
export function loadConfig(): Config {
    const port = parseInt((globalThis as any).Deno?.env?.get("PORT") || "8081");
    
    return {
        clientId: (globalThis as any).Deno?.env?.get("SPOTIFY_CLIENT_ID") || "",
        clientSecret: (globalThis as any).Deno?.env?.get("SPOTIFY_CLIENT_SECRET") || "",
        redirectUri: (globalThis as any).Deno?.env?.get("REDIRECT_URI") || `http://127.0.0.1:${port}/callback`,
        port: port,
        pollingInterval: parseInt((globalThis as any).Deno?.env?.get("POLLING_INTERVAL") || "3000"),
    };
}

// Validate that required configuration is present
export function validateConfig(config: Config): void {
    if (!config.clientId) {
        throw new Error("SPOTIFY_CLIENT_ID environment variable is required");
    }
    if (!config.clientSecret) {
        throw new Error("SPOTIFY_CLIENT_SECRET environment variable is required");
    }
}
