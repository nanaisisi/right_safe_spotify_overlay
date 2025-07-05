# Gemini プロジェクト概要

## プロジェクト名: right_safe_spotify_overlay

OBS(Open Broadcaster Software)での利用を想定した、Spotifyで現在再生中の楽曲情報を表示するためのWebベースのオーバーレイです。Denoで構築されたローカルサーバーが、WebSocketを介してフロントエンドに楽曲情報を提供します。

著作権に配慮し、アルバムアートワークやSpotifyのロゴは意図的に使用していません。

### 主な使用技術

*   **フロントエンド:** HTML, CSS, JavaScript
*   **バックエンド:** Deno, TypeScript
*   **通信:** WebSocket

### ファイル構成

*   `public/index.html`: オーバーレイ表示用のメインHTMLファイルです。
*   `public/style.css`: オーバーレイのスタイルシートです。
*   `public/script.js`: WebSocketに接続し、受信した楽曲情報で表示を更新するクライアントサイドのJavaScriptです。
*   `src/main.ts`: フロントエンドの静的ファイルを提供し、WebSocketを介して楽曲情報を配信するDenoサーバーのメインファイルです。

### 実行方法

1.  **サーバーの起動:**
    ```bash
    deno run --allow-net --allow-read src/main.ts
    ```
2.  **オーバーレイの表示:**
    Webブラウザで `http://localhost:8081` を開きます。OBSのブラウザソースにこのURLを指定することで、配信画面にオーバーレイを表示できます。

### プロジェクトの目的とロジック

このプロジェクトの中核は `src/main.ts` にあります。このファイルはポート8081でHTTPサーバーを起動します。

*   **静的ファイルの配信:** 通常のHTTPリクエストに対しては、`public` ディレクトリ内の静的ファイル（`index.html`, `style.css`, `script.js`）を配信します。
*   **WebSocketエンドポイント:** `/ws` へのリクエストがあった場合、サーバーは接続をWebSocketにアップグレードします。
*   **楽曲情報のブロードキャスト:** 現在の実装では、3秒ごとにダミーの楽曲情報（"Test Track" by "Test Artist"）を接続されている全てのWebSocketクライアントに送信します。実際の運用では、この部分をSpotify APIと連携させ、実際に再生されている楽曲情報を取得する処理に置き換える必要があります。
*   **フロントエンドでの表示:** クライアント側の `script.js` はWebSocketからのメッセージを待ち受けます。メッセージを受信すると、JSONデータを解析し、`index.html` 内の楽曲名とアーティスト名を表示する要素（`#track-name`, `#artist-name`）の内容を更新します。