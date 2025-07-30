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

// Load configuration from TOML file with defaults
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
            console.log("No TOML configuration found, using defaults");
        }
    }
    
    // Extract values from TOML or use defaults
    const port = configData.server?.port || 8081;
    
    return {
        clientId: configData.spotify?.client_id || "",
        clientSecret: configData.spotify?.client_secret || "",
        redirectUri: configData.server?.redirect_uri || `http://127.0.0.1:${port}/callback`,
        port: port,
        pollingInterval: configData.server?.polling_interval || 5000,
        // VLC settings
        vlcEnabled: configData.vlc?.enabled ?? false,
        vlcHost: configData.vlc?.host || "127.0.0.1", 
        vlcPort: configData.vlc?.port || 8080,
        vlcPassword: configData.vlc?.password || "vlc",
        vlcExePath: configData.vlc?.exe_path || "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
        vlcAutoStart: configData.vlc?.auto_start ?? false,
        vlcShowGui: configData.vlc?.show_gui ?? true,
        // Timing settings
        vlcConnectionTimeout: configData.timing?.vlc_connection_timeout || 3000,
        vlcInitDelay: configData.timing?.vlc_init_delay || 5000,
        vlcRetryDelay: configData.timing?.vlc_retry_delay || 2000,
        vlcFallbackDelay: configData.timing?.vlc_fallback_delay || 10000,
        // API rate limiting
        spotifyApiLimit: configData.api?.spotify_api_limit || 30,
        spotifyRateLimitWindow: configData.api?.spotify_rate_limit_window || 60000,
        // Warning settings
        loginWarningInterval: configData.warnings?.login_warning_interval || 120000,
        loginWarningMaxCount: configData.warnings?.login_warning_max_count || 2,
        // Polling intervals
        longPollingThreshold: configData.polling?.long_polling_threshold || 30000,
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
