/**
 * Server Application Manager - サーバーアプリケーションの管理
 * コンポーネントの初期化とサーバー起動を担当
 */

import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { loadConfig, validateConfig } from "../../config.ts";
import { VLCProcessManager } from "../vlc/vlc-process.ts";
import { SpotifyAuth } from "../auth/spotify-auth.ts";
import { SpotifyPlayer } from "../media/spotify-player.ts";
import { VLCPlayer } from "../media/vlc-player.ts";
import { UnifiedPlayer } from "../media/unified-player.ts";
import { WebSocketManager } from "../websocket/websocket-handler.ts";
import { RouteHandler } from "./route-handler.ts";

export class ServerApp {
  private config!: any;
  private vlcProcessManager!: VLCProcessManager;
  private spotifyAuth!: SpotifyAuth;
  private spotifyPlayer!: SpotifyPlayer;
  private vlcPlayer!: VLCPlayer;
  private unifiedPlayer!: UnifiedPlayer;
  private webSocketManager!: WebSocketManager;
  private routeHandler!: RouteHandler;

  constructor() {
    this.initializeComponents();
  }

  /**
   * 全コンポーネントを初期化
   */
  private initializeComponents() {
    // 設定を読み込み
    this.config = loadConfig();
    validateConfig(this.config);

    // コンポーネントを初期化
    this.vlcProcessManager = new VLCProcessManager(this.config);
    this.spotifyAuth = new SpotifyAuth(this.config);
    this.spotifyPlayer = new SpotifyPlayer(this.spotifyAuth, this.config);
    this.vlcPlayer = new VLCPlayer(this.config);
    this.unifiedPlayer = new UnifiedPlayer(
      this.spotifyPlayer,
      this.vlcPlayer,
      this.config
    );
    this.webSocketManager = new WebSocketManager(
      this.unifiedPlayer,
      this.config
    );
    this.routeHandler = new RouteHandler(
      this.config,
      this.spotifyAuth,
      this.vlcPlayer,
      this.webSocketManager
    );

    console.log("✓ All components initialized successfully");
  }

  /**
   * VLCプロセスを開始（必要な場合）
   */
  private startVLCIfNeeded() {
    if (this.config.vlcEnabled && this.config.vlcAutoStart) {
      console.log(
        "⚠️  VLC auto-start is enabled. This may cause issues when closing the application."
      );
      this.vlcProcessManager.startVLC();
    }
  }

  /**
   * サーバーを開始
   */
  async start() {
    // VLCを開始（必要な場合）
    this.startVLCIfNeeded();

    // リクエストハンドラーを設定
    const handler = (req: Request) => this.routeHandler.handleRequest(req);

    // サーバーを開始
    serve(handler, { port: this.config.port });

    // 開始メッセージを表示
    this.displayStartupMessage();

    // シャットダウンハンドラーを設定
    this.setupShutdownHandlers();
  }

  /**
   * 開始メッセージを表示
   */
  private displayStartupMessage() {
    console.log(`Spotify Overlay Server is running on:`);
    console.log(`  - Local:   http://127.0.0.1:${this.config.port}/`);
    console.log(`  - Network: http://localhost:${this.config.port}/`);
    console.log(`\nOBS Overlay URLs:`);
    console.log(
      `  - Main Overlay: http://127.0.0.1:${this.config.port}/overlay`
    );
    console.log(
      `  - Direct File:  http://127.0.0.1:${this.config.port}/overlay.html`
    );
    console.log(
      `\nMedia Source: ${
        this.config.vlcEnabled
          ? "VLC Media Player (with Spotify fallback)"
          : "Spotify"
      }`
    );

    if (this.config.vlcEnabled) {
      console.log(
        `VLC Connection: http://${this.config.vlcHost}:${this.config.vlcPort}/`
      );
      console.log(`Fallback: Spotify Web API`);
      if (this.config.vlcAutoStart) {
        console.log(`VLC Auto-start: Enabled (${this.config.vlcExePath})`);
      }
    }

    console.log(`\nTo get started:`);
    console.log(
      `  1. Open http://127.0.0.1:${this.config.port}/ in your browser`
    );
    console.log(
      `  2. 🎵 For Spotify login: http://127.0.0.1:${this.config.port}/login`
    );
    console.log(
      `  3. 📺 For OBS overlay: http://127.0.0.1:${this.config.port}/overlay`
    );

    if (!this.config.vlcEnabled) {
      console.log(`  4. ⚠️  Spotify authentication required for track info!`);
    } else {
      console.log(
        `  4. Make sure VLC Web Interface is enabled (Preferences > Interface > Main interfaces > Web)`
      );
      console.log(
        `  5. If VLC connection fails, run helper scripts for detailed setup instructions`
      );
    }
  }

  /**
   * シャットダウンハンドラーを設定
   */
  private setupShutdownHandlers() {
    const gracefulShutdown = () => {
      this.vlcProcessManager.shutdown();
      console.log("Server shutting down...");
      (globalThis as any).Deno.exit(0);
    };

    // Handle shutdown signals (Windows compatible)
    (globalThis as any).Deno.addSignalListener("SIGINT", gracefulShutdown); // Ctrl+C
    if ((globalThis as any).Deno.build.os !== "windows") {
      // SIGTERM is not supported on Windows
      (globalThis as any).Deno.addSignalListener("SIGTERM", gracefulShutdown);
    }
  }
}
