// Configuration file for the Spotify overlay application
import { parse as parseToml } from "https://deno.land/std@0.213.0/toml/mod.ts";

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
    vlcExePath: string;
    vlcAutoStart: boolean;
    vlcShowGui: boolean;
    // Timing settings
    vlcConnectionTimeout: number;
    vlcInitDelay: number;
    vlcRetryDelay: number;
    vlcFallbackDelay: number;
    // API rate limiting
    spotifyApiLimit: number;
    spotifyRateLimitWindow: number;
    // Warning settings
    loginWarningInterval: number;
    loginWarningMaxCount: number;
    // Polling intervals
    longPollingThreshold: number;
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

// Load configuration from TOML file with fallback to environment variables
export function loadConfig(): Config {
    let configData: any = {};
    
    // Try to load config.toml file first, fallback to config_example.toml
    try {
        const tomlContent = Deno.readTextFileSync('config.toml');
        configData = parseToml(tomlContent);
        console.log("✓ Loaded configuration from config.toml");
    } catch (error) {
        console.log("No config.toml found, trying config_example.toml...");
        
        try {
            const tomlContent = Deno.readTextFileSync('config_example.toml');
            configData = parseToml(tomlContent);
            console.log("✓ Loaded configuration from config_example.toml");
        } catch (exampleError) {
            console.log("No TOML configuration found, trying .env file...");
            
            // Fallback to .env file
            try {
                const envContent = Deno.readTextFileSync('.env');
                const envVars = parseEnvFile(envContent);
                // Set environment variables from .env file
                for (const [key, value] of Object.entries(envVars)) {
                    Deno.env.set(key, value);
                }
                console.log("✓ Loaded configuration from .env file");
            } catch (envError) {
                console.log("No .env file found, using system environment variables or defaults");
            }
        }
    }
    
    // Extract values from TOML or use environment variables as fallback
    const port = configData.server?.port || parseInt(Deno.env.get("PORT") || "8081");
    
    return {
        clientId: configData.spotify?.client_id || Deno.env.get("SPOTIFY_CLIENT_ID") || "",
        clientSecret: configData.spotify?.client_secret || Deno.env.get("SPOTIFY_CLIENT_SECRET") || "",
        redirectUri: configData.server?.redirect_uri || Deno.env.get("REDIRECT_URI") || `http://127.0.0.1:${port}/callback`,
        port: port,
        pollingInterval: configData.server?.polling_interval || parseInt(Deno.env.get("POLLING_INTERVAL") || "5000"),
        // VLC settings
        vlcEnabled: configData.vlc?.enabled ?? (Deno.env.get("VLC_ENABLED") === "true"),
        vlcHost: configData.vlc?.host || Deno.env.get("VLC_HOST") || "127.0.0.1", 
        vlcPort: configData.vlc?.port || parseInt(Deno.env.get("VLC_PORT") || "8080"),
        vlcPassword: configData.vlc?.password || Deno.env.get("VLC_PASSWORD") || "vlc",
        vlcExePath: configData.vlc?.exe_path || Deno.env.get("VLC_EXE_PATH") || "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
        vlcAutoStart: configData.vlc?.auto_start ?? (Deno.env.get("VLC_AUTO_START") === "true"),
        vlcShowGui: configData.vlc?.show_gui ?? (Deno.env.get("VLC_SHOW_GUI") !== "false"), // Default to true
        // Timing settings
        vlcConnectionTimeout: configData.timing?.vlc_connection_timeout || parseInt(Deno.env.get("VLC_CONNECTION_TIMEOUT") || "3000"),
        vlcInitDelay: configData.timing?.vlc_init_delay || parseInt(Deno.env.get("VLC_INIT_DELAY") || "5000"),
        vlcRetryDelay: configData.timing?.vlc_retry_delay || parseInt(Deno.env.get("VLC_RETRY_DELAY") || "2000"),
        vlcFallbackDelay: configData.timing?.vlc_fallback_delay || parseInt(Deno.env.get("VLC_FALLBACK_DELAY") || "10000"),
        // API rate limiting
        spotifyApiLimit: configData.api?.spotify_api_limit || parseInt(Deno.env.get("SPOTIFY_API_LIMIT") || "30"),
        spotifyRateLimitWindow: configData.api?.spotify_rate_limit_window || parseInt(Deno.env.get("SPOTIFY_RATE_LIMIT_WINDOW") || "60000"),
        // Warning settings
        loginWarningInterval: configData.warnings?.login_warning_interval || parseInt(Deno.env.get("LOGIN_WARNING_INTERVAL") || "120000"),
        loginWarningMaxCount: configData.warnings?.login_warning_max_count || parseInt(Deno.env.get("LOGIN_WARNING_MAX_COUNT") || "2"),
        // Polling intervals
        longPollingThreshold: configData.polling?.long_polling_threshold || parseInt(Deno.env.get("LONG_POLLING_THRESHOLD") || "30000"),
    };
}

// Validate that required configuration is present
export function validateConfig(config: Config): void {
    // Only require Spotify credentials if VLC is not enabled or if both are enabled
    if (!config.vlcEnabled) {
        if (!config.clientId) {
            throw new Error("SPOTIFY_CLIENT_ID environment variable is required");
        }
        if (!config.clientSecret) {
            throw new Error("SPOTIFY_CLIENT_SECRET environment variable is required");
        }
    }
    
    // VLC-specific validation
    if (config.vlcEnabled) {
        if (!config.vlcHost) {
            throw new Error("VLC_HOST is required when VLC is enabled");
        }
        if (!config.vlcPort || config.vlcPort <= 0) {
            throw new Error("VLC_PORT must be a valid port number when VLC is enabled");
        }
    }
}
