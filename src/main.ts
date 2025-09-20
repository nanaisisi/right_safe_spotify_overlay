/**
 * Main Server Entry Point - 分割後のサーバー起動ファイル
 * ServerAppクラスを使用してサーバーを開始
 */

import { ServerApp } from "./server/server-app.ts";

// サーバーアプリケーションを作成して開始
try {
  const app = new ServerApp();
  await app.start();
} catch (error) {
  console.error("Failed to start server:", error);
  (globalThis as any).Deno.exit(1);
}
