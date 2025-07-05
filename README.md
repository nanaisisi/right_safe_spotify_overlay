# Spotify Overlay Application

Spotify で現在再生中の楽曲を表示する Web アプリケーションです。

## セットアップ

### 1. Spotify アプリケーションの作成

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) にアクセス
2. 新しいアプリケーションを作成
3. Client ID と Client Secret を取得
4. Redirect URI に `http://127.0.0.1:8081/callback` を追加

### 2. 環境変数の設定

`.env.example` ファイルをコピーして `.env` ファイルを作成し、適切な値を設定してください：

```bash
# .env ファイル
SPOTIFY_CLIENT_ID=あなたのSpotifyクライアントID
SPOTIFY_CLIENT_SECRET=あなたのSpotifyクライアントシークレット
PORT=8081
REDIRECT_URI=http://127.0.0.1:8081/callback
POLLING_INTERVAL=3000
```

### 3. 実行

```bash
deno run --allow-net --allow-env src/main.ts
```

## 設定可能な環境変数

| 変数名                  | 説明                                 | デフォルト値                     |
| ----------------------- | ------------------------------------ | -------------------------------- |
| `SPOTIFY_CLIENT_ID`     | Spotify API クライアント ID          | 必須                             |
| `SPOTIFY_CLIENT_SECRET` | Spotify API クライアントシークレット | 必須                             |
| `PORT`                  | サーバーのポート番号                 | 8081                             |
| `REDIRECT_URI`          | OAuth リダイレクト URI               | http://127.0.0.1:{PORT}/callback |
| `POLLING_INTERVAL`      | 楽曲情報の更新間隔（ミリ秒）         | 3000                             |

## 使用方法

1. アプリケーションを起動
2. ブラウザで `http://127.0.0.1:8081` にアクセス
3. `/login` エンドポイントで Spotify にログイン
4. WebSocket を使用してリアルタイムで現在再生中の楽曲情報を取得
