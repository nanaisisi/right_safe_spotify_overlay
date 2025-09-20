import { UnifiedPlayer } from "../media/unified-player.ts";
import { TrackInfo } from "../media/spotify-player.ts";
import {
  SourceAnalyzer,
  SourceAnalysisResult,
} from "../media/source-analyzer.ts";

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
  private readonly spotifyShortInterval: number;
  private readonly spotifyLongInterval: number;
  // VLC用の間隔（ローカルAPIなので短め）
  private readonly vlcShortInterval: number;
  private readonly vlcLongInterval: number;

  constructor(unifiedPlayer: UnifiedPlayer, config: any) {
    this.unifiedPlayer = unifiedPlayer;
    this.config = config;

    // 設定ファイルからポーリング間隔を読み込み
    this.spotifyShortInterval = config.spotifyShortInterval || 10000;
    this.spotifyLongInterval = config.spotifyLongInterval || 30000;
    this.vlcShortInterval = config.vlcShortInterval || 5000;
    this.vlcLongInterval = config.vlcLongInterval || 10000;

    // Start the adaptive polling - 即座に開始
    setTimeout(() => this.checkAndBroadcastTrack(), 100); // 100msで開始
  }

  handleConnection(socket: WebSocket): void {
    console.log("WebSocket connection opened");
    this.connectedClients.add(socket);

    // メッセージハンドラーを設定
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        this.handleMessage(socket, message);
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    // Send current track info immediately to new client
    const sendCurrentTrack = async () => {
      try {
        const currentTrack = await this.unifiedPlayer.getCurrentlyPlaying();
        const messageData = currentTrack
          ? {
              ...currentTrack,
              source: this.unifiedPlayer.currentSource,
            }
          : null;

        if (socket.readyState === WebSocket.OPEN) {
          const message = JSON.stringify(messageData);
          socket.send(message);
          console.log("Sent current track info to new client:", message);
        }
      } catch (error) {
        console.error("Error sending current track to new client:", error);
      }
    };

    sendCurrentTrack();

    socket.onclose = () => {
      this.connectedClients.delete(socket);
      console.log("WebSocket connection closed");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.connectedClients.delete(socket);
    };
  }

  private async handleMessage(socket: WebSocket, message: any): Promise<void> {
    console.log("Received WebSocket message:", message);

    if (message.type === "sourceAnalysis") {
      await this.handleSourceAnalysisRequest(socket, message);
    }
  }

  private async handleSourceAnalysisRequest(
    socket: WebSocket,
    request: any
  ): Promise<void> {
    try {
      const { trackName, artistName } = request;

      if (!trackName || !artistName) {
        console.log(
          "Invalid source analysis request: missing trackName or artistName"
        );
        return;
      }

      console.log(
        `Performing source analysis for: "${trackName}" by "${artistName}"`
      );

      // 現在の楽曲情報を取得
      const currentTrack = await this.unifiedPlayer.getCurrentlyPlaying();

      // 音源分析を実行
      const analysisResult = SourceAnalyzer.analyzeSource(
        trackName,
        artistName,
        {
          source: this.unifiedPlayer.currentSource,
          duration: currentTrack?.durationMs,
        }
      );

      console.log("Source analysis result:", analysisResult);

      // 分析結果をクライアントに送信
      const response = {
        type: "sourceAnalysisResult",
        trackName,
        artistName,
        analysis: analysisResult,
        timestamp: Date.now(),
      };

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error("Error in source analysis:", error);
    }
  }

  private async checkAndBroadcastTrack(): Promise<void> {
    const nowPlaying = await this.unifiedPlayer.getCurrentlyPlaying();

    // Create a unique ID for comparison
    const currentTrackId = nowPlaying
      ? `${nowPlaying.trackName}-${nowPlaying.artistName}-${nowPlaying.isPlaying}`
      : null;
    const lastTrackId = this.lastBroadcastTrack
      ? `${this.lastBroadcastTrack.trackName}-${this.lastBroadcastTrack.artistName}-${this.lastBroadcastTrack.isPlaying}`
      : null;

    const hasChanged = currentTrackId !== lastTrackId;

    if (hasChanged) {
      console.log("Track changed, broadcasting update");
      this.consecutiveNoChanges = 0;
      this.lastTrackChangeTime = Date.now();
      this.lastBroadcastTrack = nowPlaying;

      // 音源情報を含めてブロードキャスト
      const messageData = nowPlaying
        ? {
            trackName: nowPlaying.trackName,
            artistName: nowPlaying.artistName,
            isPlaying: nowPlaying.isPlaying,
            progressMs: nowPlaying.progressMs,
            durationMs: nowPlaying.durationMs,
            duration: nowPlaying.duration,
            isInPlaylist: nowPlaying.isInPlaylist,
            source: this.unifiedPlayer.currentSource,
            // 新しいフィールドを追加
            contextType: nowPlaying.contextType,
            contextUri: nowPlaying.contextUri,
            popularity: nowPlaying.popularity,
            isLocal: nowPlaying.isLocal,
            playlistStatus: nowPlaying.playlistStatus,
          }
        : null;

      console.log("Broadcasting track data:", messageData);
      this.broadcastToAllClients(JSON.stringify(messageData));
    } else {
      this.consecutiveNoChanges++;
    }

    // Determine the current source type and use appropriate intervals
    const currentSource = this.unifiedPlayer.currentSource;
    const isVLCSource = currentSource.includes("VLC");

    // Adaptive interval calculation
    const timeSinceLastChange = Date.now() - this.lastTrackChangeTime;

    let nextInterval: number;

    if (isVLCSource) {
      // VLC用の間隔（より頻繁にチェック）
      if (timeSinceLastChange < this.config.longPollingThreshold) {
        nextInterval = this.vlcShortInterval;
      } else {
        nextInterval = this.vlcLongInterval;
      }
    } else {
      // Spotify用の間隔（API制限を考慮）
      if (timeSinceLastChange < this.config.longPollingThreshold) {
        nextInterval = this.spotifyShortInterval;
      } else {
        nextInterval = this.spotifyLongInterval;
      }
    }

    this.currentPollingInterval = nextInterval;

    console.log(
      `Next check in ${nextInterval}ms (${
        hasChanged ? "changed" : "no change"
      }, consecutive no changes: ${
        this.consecutiveNoChanges
      }, source: ${currentSource})`
    );

    // Schedule next check
    setTimeout(() => this.checkAndBroadcastTrack(), nextInterval);
  }

  private broadcastToAllClients(message: string): void {
    const clientsToRemove: WebSocket[] = [];

    for (const client of this.connectedClients) {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        } else {
          clientsToRemove.push(client);
        }
      } catch (error) {
        console.error("Error broadcasting to client:", error);
        clientsToRemove.push(client);
      }
    }

    // Clean up closed connections
    clientsToRemove.forEach((client) => this.connectedClients.delete(client));

    if (clientsToRemove.length > 0) {
      console.log(`Cleaned up ${clientsToRemove.length} closed connections`);
    }
  }
}
