# Gemini プロジェクト概要

## プロジェクト名: right_safe_spotify_overlay

OBS(Open Broadcaster Software)での利用を想定した、Spotify で現在再生中の楽曲情報を表示するための Web ベースのオーバーレイです。Deno で構築されたローカルサーバーが、WebSocket を介してフロントエンドに楽曲情報を提供します。

著作権に配慮し、アルバムアートワークや Spotify のロゴは意図的に使用していません。

### 主な使用技術

- **フロントエンド:** HTML, CSS, JavaScript
- **バックエンド:** Deno, TypeScript
- **通信:** WebSocket

### ファイル構成

- `public/index.html`: オーバーレイ表示用のメイン HTML ファイルです。
- `public/style.css`: オーバーレイのスタイルシートです。
- `public/script.js`: WebSocket に接続し、受信した楽曲情報で表示を更新するクライアントサイドの JavaScript です。
- `src/main.ts`: フロントエンドの静的ファイルを提供し、WebSocket を介して楽曲情報を配信する Deno サーバーのメインファイルです。

### 実行方法

1.  **サーバーの起動:**
    ```bash
    deno run --allow-net --allow-read src/main.ts
    ```
2.  **オーバーレイの表示:**
    Web ブラウザで `http://localhost:8081` を開きます。OBS のブラウザソースにこの URL を指定することで、配信画面にオーバーレイを表示できます。

### プロジェクトの目的とロジック

このプロジェクトの中核は `src/main.ts` にあります。このファイルはポート 8081 で HTTP サーバーを起動します。

- **静的ファイルの配信:** 通常の HTTP リクエストに対しては、`public` ディレクトリ内の静的ファイル（`index.html`, `style.css`, `script.js`）を配信します。
- **WebSocket エンドポイント:** `/ws` へのリクエストがあった場合、サーバーは接続を WebSocket にアップグレードします。
- **楽曲情報のブロードキャスト:** 現在の実装では、3 秒ごとにダミーの楽曲情報（"Test Track" by "Test Artist"）を接続されている全ての WebSocket クライアントに送信します。実際の運用では、この部分を Spotify API と連携させ、実際に再生されている楽曲情報を取得する処理に置き換える必要があります。
- **フロントエンドでの表示:** クライアント側の `script.js` は WebSocket からのメッセージを待ち受けます。メッセージを受信すると、JSON データを解析し、`index.html` 内の楽曲名とアーティスト名を表示する要素（`#track-name`, `#artist-name`）の内容を更新します。
