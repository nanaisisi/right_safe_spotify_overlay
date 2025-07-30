// Configuration file for the Spotify overlay application

export interface Config {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    port: number;
    pollingInterval: number;
    // VLC settings
    vlcEnabled: boolean;
    vlcHost: string;
    vlcPort: number;
    vlcPassword: string;
}

// Simple .env file parser
function parseEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex !== -1) {
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                env[key] = value;
            }
        }
    }
    
    return env;
}

// Load configuration from environment variables with fallback defaults
export function loadConfig(): Config {
    let envVars: Record<string, string> = {};
    
    // Try to load .env file
    try {
        const envContent = Deno.readTextFileSync('.env');
        envVars = parseEnvFile(envContent);
        // Set environment variables from .env file
        for (const [key, value] of Object.entries(envVars)) {
            Deno.env.set(key, value);
        }
    } catch (error) {
        // .env file might not exist, which is okay
        console.log("No .env file found, using system environment variables or defaults");
    }
    
    const port = parseInt(Deno.env.get("PORT") || "8081");
    
    return {
        clientId: Deno.env.get("SPOTIFY_CLIENT_ID") || "",
        clientSecret: Deno.env.get("SPOTIFY_CLIENT_SECRET") || "",
        redirectUri: Deno.env.get("REDIRECT_URI") || `http://127.0.0.1:${port}/callback`,
        port: port,
        pollingInterval: parseInt(Deno.env.get("POLLING_INTERVAL") || "3000"),
        // VLC settings
        vlcEnabled: Deno.env.get("VLC_ENABLED") === "true",
        vlcHost: Deno.env.get("VLC_HOST") || "localhost",
        vlcPort: parseInt(Deno.env.get("VLC_PORT") || "8080"),
        vlcPassword: Deno.env.get("VLC_PASSWORD") || "vlc",
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
