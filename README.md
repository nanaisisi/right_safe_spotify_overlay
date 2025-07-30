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
2. `ツール` → `設定` (または `Ctrl+P`)
3. 左下の `設定の表示` で `すべて` を選択
4. `インターフェース` → `メインインターフェース` を展開
5. `WEB` にチェックを入れる
6. `インターフェース` → `メインインターフェース` → `Lua` を展開
7. `Lua HTTP` を選択
8. `パスワード` フィールドにパスワードを設定（例：vlc）
9. `ポート` が 8080 になっていることを確認
10. `ポート` が 8080 になっていることを確認
11. `保存` をクリック
12. VLC を完全に終了して再起動

#### 2. 接続テスト

1. VLC でなにかメディアファイルを再生
2. ブラウザで `http://localhost:8080` にアクセス
3. ユーザー名は空欄、パスワードに設定したパスワード（例：vlc）を入力
4. VLC Web インターフェースが表示され、再生中のメディア情報が確認できることを確認

#### 3. トラブルシューティング

**404 エラーが発生する場合：**

1. **VLC の完全再起動**: VLC を完全に終了してから再起動
2. **設定の確認**:
   - `WEB` インターフェースがチェックされているか
   - `Lua` インターフェースが選択されているか
   - パスワードが正しく設定されているか
3. **ポートの確認**: 他のアプリケーションがポート 8080 を使用していないか
4. **ファイアウォール**: Windows ファイアウォールがポート 8080 をブロックしていないか
5. **VLC のバージョン**: 古いバージョンの VLC では手順が異なる場合があります

**VLC 診断機能の使用:**

- アプリケーション起動後、`http://127.0.0.1:8081/vlc-debug` にアクセス
- VLC の接続状況と詳細なエラー情報を確認できます

**代替設定方法（VLC 3.x 以降）:**

1. VLC → `ツール` → `設定`
2. `インターフェース` タブ
3. `Web` にチェック
4. `詳細設定` → `インターフェース` → `メインインターフェース` → `HTTP`
5. パスワードを設定

**コマンドライン起動方法:**

VLC を以下のコマンドで起動することもできます：

```bash
vlc --intf http --http-password vlc --http-port 8080
```

**VLC ショートカットでの設定:**

1. VLC のショートカットを右クリック → プロパティ
2. リンク先に以下を追加： `--intf http --http-password vlc --http-port 8080`
3. 例：`"C:\Program Files\VideoLAN\VLC\vlc.exe" --intf http --http-password vlc --http-port 8080`

**便利なバッチファイル:**

このプロジェクトには `start-vlc-with-web.bat` が含まれています。これを実行すると、Web インターフェースが有効な状態で VLC が起動します。

### 2. 設定ファイル

#### TOML 設定ファイル（推奨）

`config.toml.example` ファイルをコピーして `config.toml` ファイルを作成し、適切な値を設定してください：

```bash
cp config.toml.example config.toml
```

**Spotify モードの場合:**

```toml
[server]
port = 8081
redirect_uri = "http://127.0.0.1:8081/callback"
polling_interval = 5000

[spotify]
client_id = "あなたのSpotifyクライアントID"
client_secret = "あなたのSpotifyクライアントシークレット"

[vlc]
enabled = false
```

**VLC モードの場合:**

```toml
[server]
port = 8081
polling_interval = 5000

[spotify]
client_id = ""
client_secret = ""

[vlc]
enabled = true
host = "127.0.0.1"
port = 8080
password = "your_secure_password"
exe_path = "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
auto_start = false
show_gui = true
```

#### .env 設定ファイル（フォールバック）

TOML ファイルが見つからない場合、従来の`.env`ファイルも使用できます。

#### VLC モードの場合：

```bash
# VLC 設定
VLC_ENABLED=true
VLC_HOST=localhost
VLC_PORT=8080
VLC_PASSWORD=vlc

# VLC 自動起動設定（オプション）
VLC_EXE_PATH=C:\Program Files\VideoLAN\VLC\vlc.exe
VLC_AUTO_START=true

# サーバー設定
PORT=8081
POLLING_INTERVAL=10000

# Spotify設定（VLCモードでは不要）
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

**VLC 自動起動機能（非推奨）:**

`VLC_AUTO_START=true` を設定すると、アプリケーション起動時に自動的に VLC が起動されますが、以下の問題があるため推奨しません：

- アプリケーション終了時に VLC も一緒に終了してしまう
- 既存のプレイリストが消える
- VLC の設定が初期化される

**推奨する使用方法:**

1. VLC を手動で起動
2. VLC 設定: ツール > 設定 > インターフェース > メインインターフェース > Web にチェック
3. VLC 設定: インターフェース > Lua > Lua HTTP > パスワードを設定
4. VLC を再起動
5. アプリケーションを起動

### 3. 実行

**通常の実行:**

```bash
deno run --allow-net --allow-env --allow-read --allow-run src/main.ts
```

**便利なバッチファイル:**

- `start-spotify.bat` - Spotify モードで起動
- `start-vlc.bat` - VLC モード（手動設定）で起動
- `start-vlc-auto.bat` - VLC モード（自動起動）で起動

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
