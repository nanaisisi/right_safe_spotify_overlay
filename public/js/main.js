/**
 * Main Application Entry Point
 * アプリケーションの初期化とエラーハンドリング
 */

import { SpotifyOverlay } from "./spotify-overlay.js";

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
  try {
    new SpotifyOverlay();
    console.log("Spotify Overlay initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Spotify Overlay:", error);

    // エラー時の代替表示
    const container = document.getElementById("overlay-container");
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <h2>初期化エラー</h2>
          <p>オーバーレイの初期化に失敗しました。</p>
          <p>詳細: ${error.message}</p>
        </div>
      `;
    }
  }
});

// グローバルエラーハンドリング
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
