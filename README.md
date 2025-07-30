# Media Overlay Application

Spotify または VLC Media Player で現在再生中の楽曲を表示する Web アプリケーションです。

## セットアップ

### Spotify モード

#### 1. Spotify アプリケーションの作成

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) にアクセス
2. 新しいアプリケーションを作成
3. Client ID と Client Secret を取得
4. Redirect URI に `http://127.0.0.1:8081/callback` を追加

### VLC モード

#### 1. VLC Web インターフェースの有効化

1. VLC を起動
2. `ツール` → `設定` → `インターフェース` → `メインインターフェース`
3. `Web` にチェックを入れる
4. `HTTP パスワード` を設定（例：vlc）
5. VLC を再起動

#### 2. 接続テスト

ブラウザで `http://localhost:8080` にアクセスして、VLC Web インターフェースが表示されることを確認してください。

### 2. 環境変数の設定

`.env.example` ファイルをコピーして `.env` ファイルを作成し、適切な値を設定してください：

#### Spotify モードの場合：

```bash
# Spotify 設定
SPOTIFY_CLIENT_ID=あなたのSpotifyクライアントID
SPOTIFY_CLIENT_SECRET=あなたのSpotifyクライアントシークレット
VLC_ENABLED=false

# サーバー設定
PORT=8081
REDIRECT_URI=http://127.0.0.1:8081/callback
POLLING_INTERVAL=10000
```

#### VLC モードの場合：

```bash
# VLC 設定
VLC_ENABLED=true
VLC_HOST=localhost
VLC_PORT=8080
VLC_PASSWORD=vlc

# サーバー設定
PORT=8081
POLLING_INTERVAL=10000

# Spotify設定（VLCモードでは不要）
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

### 3. 実行

```bash
deno run --allow-net --allow-env --allow-read src/main.ts
```

## 使用方法

### Spotify モード

1. アプリケーションを起動
2. ブラウザで `http://127.0.0.1:8081` にアクセス
3. `/login` エンドポイントで Spotify にログイン
4. WebSocket を使用してリアルタイムで現在再生中の楽曲情報を取得

### VLC モード

1. VLC で動画/音楽ファイルを再生
2. アプリケーションを起動
3. ブラウザで `http://127.0.0.1:8081` にアクセス
4. 自動的に VLC の再生情報を取得・表示

## 設定可能な環境変数

### 共通設定

| 変数名             | 説明                         | デフォルト値 |
| ------------------ | ---------------------------- | ------------ |
| `PORT`             | サーバーのポート番号         | 8081         |
| `POLLING_INTERVAL` | 楽曲情報の更新間隔（ミリ秒） | 10000        |

### Spotify モード設定

| 変数名                  | 説明                                 | デフォルト値                     |
| ----------------------- | ------------------------------------ | -------------------------------- |
| `SPOTIFY_CLIENT_ID`     | Spotify API クライアント ID          | 必須                             |
| `SPOTIFY_CLIENT_SECRET` | Spotify API クライアントシークレット | 必須                             |
| `REDIRECT_URI`          | OAuth リダイレクト URI               | http://127.0.0.1:{PORT}/callback |

### VLC モード設定

| 変数名             | 説明                                 | デフォルト値                     |
| ------------------ | ------------------------------------ | -------------------------------- |
| `VLC_ENABLED`      | VLC モードの有効化                   | false                            |
| `VLC_HOST`         | VLC Web インターフェースのホスト     | localhost                        |
| `VLC_PORT`         | VLC Web インターフェースのポート     | 8080                             |
| `VLC_PASSWORD`     | VLC Web インターフェースのパスワード | vlc                              |
| `REDIRECT_URI`     | OAuth リダイレクト URI               | http://127.0.0.1:{PORT}/callback |
| `POLLING_INTERVAL` | 楽曲情報の更新間隔（ミリ秒）         | 10000 (推奨: 10000-15000)        |

## 適応的ポーリングシステム

このアプリケーションは効率的な適応的ポーリングシステムを使用しています：

### ポーリング間隔の自動調整

- **アクティブモード**: 楽曲変更後の 10 秒間隔
- **アイドルモード**: 30 秒間変更がない場合、60 秒間隔に切り替え
- **リアルタイム復帰**: 楽曲が変わると即座に 10 秒間隔に戻る

### 利点

- **レスポンシブ**: 楽曲変更時は素早く検出
- **効率的**: 変更がない時は API 呼び出しを大幅削減
- **レート制限対応**: 1 時間あたり最大 360 回の API 呼び出し（通常は 60-120 回）

## レート制限対策

このアプリケーションには以下のレート制限対策が実装されています：

- **API 呼び出し制限**: 1 分間に最大 30 回の Spotify API コール
- **適応的ポーリング**: 楽曲変更頻度に応じた間隔調整
- **変更検知**: 楽曲が変わった場合のみクライアントに通知
- **キャッシュ機能**: レート制限時は前回の結果を返す
- **429 エラー処理**: Spotify からのレート制限レスポンスを適切に処理

推奨設定:

- 適応的ポーリングが自動で最適化するため、特別な設定は不要
- 通常の使用では 1 時間あたり 60-120 回の API 呼び出しで済みます

## ライセンス

## 本ソフトウェア

デュアルライセンスからライセンスを選択してご使用ください。

Licensed under either of

Apache License, Version 2.0, (LICENSE-APACHE or
https://www.apache.org/licenses/LICENSE-2.0) MIT license (LICENSE-MIT or
https://opensource.org/licenses/MIT) at your option.
