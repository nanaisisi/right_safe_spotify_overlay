import { UnifiedPlayer } from "../media/unified-player.ts";
import { TrackInfo } from "../media/spotify-player.ts";

export class WebSocketManager {
    private connectedClients = new Set<WebSocket>();
    private unifiedPlayer: UnifiedPlayer;
    private config: any;
    
    // Adaptive polling system for currently playing song
    private lastBroadcastTrack: any = null;
    private lastTrackChangeTime = Date.now();
    private consecutiveNoChanges = 0;
    private currentPollingInterval = 5000; // Default start
    
    // Spotify用の間隔（API制限を考慮して長め）
    private readonly spotifyShortInterval = 10000; // 10秒間隔
    private readonly spotifyLongInterval = 60000;  // 60秒間隔
    // VLC用の間隔（ローカルAPIなので短め）
    private readonly vlcShortInterval = 5000;  // 5秒間隔
    private readonly vlcLongInterval = 10000;  // 10秒間隔

    constructor(unifiedPlayer: UnifiedPlayer, config: any) {
        this.unifiedPlayer = unifiedPlayer;
        this.config = config;
        
        // Start the adaptive polling
        setTimeout(() => this.checkAndBroadcastTrack(), 1000); // Start after 1 second
    }

    handleConnection(socket: WebSocket): void {
        console.log("WebSocket connection opened");
        this.connectedClients.add(socket);
        
        // Send current track info immediately to new client
        if (this.lastBroadcastTrack && socket.readyState === WebSocket.OPEN) {
            const messageData = {
                ...this.lastBroadcastTrack,
                source: this.unifiedPlayer.currentSource
            };
            socket.send(JSON.stringify(messageData));
            console.log("Sent current track info to new client");
        }

        socket.onclose = () => {
            console.log("WebSocket connection closed");
            this.connectedClients.delete(socket);
        };

        socket.onerror = (e) => {
            console.error("WebSocket error:", e);
        };
    }

    private async checkAndBroadcastTrack(): Promise<void> {
        const nowPlaying = await this.unifiedPlayer.getCurrentlyPlaying();
        
        // Only broadcast if track changed or if it's the first time
        const currentTrackId = nowPlaying ? `${nowPlaying.trackName}-${nowPlaying.artistName}-${nowPlaying.isPlaying}` : null;
        const lastTrackId = this.lastBroadcastTrack ? `${this.lastBroadcastTrack.trackName}-${this.lastBroadcastTrack.artistName}-${this.lastBroadcastTrack.isPlaying}` : null;
        
        // 使用するポーリング間隔を決定（SpotifyとVLCで異なる間隔）
        const shortInterval = this.config.vlcEnabled ? this.vlcShortInterval : this.spotifyShortInterval;
        const longInterval = this.config.vlcEnabled ? this.vlcLongInterval : this.spotifyLongInterval;
        
        if (currentTrackId !== lastTrackId) {
            // Track changed - broadcast and reset polling to frequent mode
            const messageData = nowPlaying ? {
                ...nowPlaying,
                source: this.unifiedPlayer.currentSource
            } : null;
            
            const message = JSON.stringify(messageData);
            for (const client of this.connectedClients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            }
            this.lastBroadcastTrack = nowPlaying;
            this.lastTrackChangeTime = Date.now();
            this.consecutiveNoChanges = 0;
            this.currentPollingInterval = shortInterval;
            
            console.log(`Track updated (${this.unifiedPlayer.currentSource}): ${nowPlaying ? `${nowPlaying.trackName} by ${nowPlaying.artistName}` : 'No track playing'} (polling: ${this.currentPollingInterval}ms)`);
        } else {
            // No change detected
            this.consecutiveNoChanges++;
            const timeSinceLastChange = Date.now() - this.lastTrackChangeTime;
            
            // If no changes for more than configured threshold, switch to long interval
            if (timeSinceLastChange > this.config.longPollingThreshold && this.currentPollingInterval === shortInterval) {
                this.currentPollingInterval = longInterval;
                console.log(`Switching to long polling interval (${longInterval}ms) - no track changes for ${Math.round(timeSinceLastChange / 1000)}s`);
            }
        }
        
        // Schedule next check with current interval
        setTimeout(() => this.checkAndBroadcastTrack(), this.currentPollingInterval);
    }
}
