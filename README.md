# Media Overlay Application (Windows 専用)

Spotify または VLC Media Player で現在再生中の楽曲を表示する Web アプリケーションです。

> **⚠️ 注意**: このアプリケーションは Windows 環境専用です。ヘルパースクリプト（`.bat`ファイル）やパス設定が Windows 用に最適化されています。

## 動作環境

- **OS**: Windows 10/11
- **ランタイム**: Deno (最新版推奨)
- **ブラウザ**: Chrome, Firefox, Edge など現代的な Web ブラウザ
- **VLC**: VLC Media Player 3.x 以降（VLC モード使用時）

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

というよりもうちょっと単純でいい

```
vlc --http-password 'vlc'
```

```
vlc --intf http --http-password vlc --http-port 8080
```

**VLC ショートカットでの設定:**

1. VLC のショートカットを右クリック → プロパティ
2. リンク先に以下を追加： `--intf http --http-password vlc --http-port 8080`
3. 例：`"C:\Program Files\VideoLAN\VLC\vlc.exe" --intf http --http-password vlc --http-port 8080`

**便利なバッチファイル (Windows 専用):**

このプロジェクトには `start-vlc-with-web.bat` が含まれています。これを実行すると、Web インターフェースが有効な状態で VLC が起動します。

> **📝 Linux/macOS**: バッチファイルの代わりに、上記のコマンドライン起動方法をシェルスクリプトとして作成してください。

### 2. 設定ファイル

#### TOML 設定ファイル（推奨）

`config_example.toml` ファイルをコピーして `config.toml` ファイルを作成し、適切な値を設定してください：

**Windows:**

```cmd
copy config_example.toml config.toml
```

**Linux/macOS:**

```bash
cp config_example.toml config.toml
```

**Spotify モードの場合:**

```toml
[server]
port = 8081
redirect_uri = "http://127.0.0.1:8081/callback"

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
redirect_uri = "http://127.0.0.1:8081/callback"

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

[polling]
# VLC用ポーリング間隔（ローカルAPIなので高頻度）
vlc_short_interval = 5000      # VLC短間隔ポーリング (5秒)
vlc_long_interval = 10000      # VLC長間隔ポーリング (10秒)

# Spotify用ポーリング間隔（API制限を考慮して低頻度）
spotify_short_interval = 10000 # Spotify短間隔ポーリング (10秒)
spotify_long_interval = 30000  # Spotify長間隔ポーリング (30秒)
```

#### 設定ファイルの準備

上記の設定例を参考に、あなたの環境に合わせて設定値を更新してください。

> **💡 ヒント**: Windows でファイルをコピーした後、メモ帳や VS Code などで`config.toml`を編集してください。

### 3. 実行

**通常の実行:**

```bash
deno run --allow-net --allow-read --allow-run src/main.ts
```

**便利なバッチファイル (Windows 専用):**

プロジェクトには以下のヘルパースクリプトが含まれています：

- `scripts/start-vlc-gui.bat` - VLC を GUI モードで起動
- `scripts/start-vlc-with-web.bat` - VLC を Web インターフェース有効で起動
- `scripts/vlc-setup-helper.bat` - VLC 設定のヘルプ表示

> **📝 他の OS**: Linux/macOS をご利用の場合は、上記のバッチファイルを参考にシェルスクリプト（`.sh`）を作成してください。

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

## 設定オプション

### 基本設定

| 設定項目              | 説明                   | デフォルト値                   |
| --------------------- | ---------------------- | ------------------------------ |
| `server.port`         | サーバーのポート番号   | 8081                           |
| `server.redirect_uri` | OAuth リダイレクト URI | http://127.0.0.1:8081/callback |

### Spotify 設定

| 設定項目                | 説明                                 | デフォルト値 |
| ----------------------- | ------------------------------------ | ------------ |
| `spotify.client_id`     | Spotify API クライアント ID          | 必須         |
| `spotify.client_secret` | Spotify API クライアントシークレット | 必須         |

### VLC 設定

| 設定項目         | 説明                                 | デフォルト値                              |
| ---------------- | ------------------------------------ | ----------------------------------------- |
| `vlc.enabled`    | VLC モードの有効化                   | false                                     |
| `vlc.host`       | VLC Web インターフェースのホスト     | 127.0.0.1                                 |
| `vlc.port`       | VLC Web インターフェースのポート     | 8080                                      |
| `vlc.password`   | VLC Web インターフェースのパスワード | 必須                                      |
| `vlc.exe_path`   | VLC 実行ファイルのパス (Windows)     | C:\\Program Files\\VideoLAN\\VLC\\vlc.exe |
| `vlc.auto_start` | VLC 自動起動（非推奨）               | false                                     |
| `vlc.show_gui`   | VLC GUI 表示                         | true                                      |

### ポーリング設定

| 設定項目                         | 説明                                       | デフォルト値 |
| -------------------------------- | ------------------------------------------ | ------------ |
| `polling.vlc_short_interval`     | VLC 短間隔ポーリング（ミリ秒）             | 5000         |
| `polling.vlc_long_interval`      | VLC 長間隔ポーリング（ミリ秒）             | 10000        |
| `polling.spotify_short_interval` | Spotify 短間隔ポーリング（ミリ秒）         | 10000        |
| `polling.spotify_long_interval`  | Spotify 長間隔ポーリング（ミリ秒）         | 30000        |
| `polling.long_polling_threshold` | 長間隔ポーリングに切り替える時間（ミリ秒） | 30000        |

## 適応的ポーリングシステム

このアプリケーションは効率的な適応的ポーリングシステムを使用しています：

### ソース別ポーリング間隔

**VLC モード（ローカル API）:**

- **短間隔**: 5 秒間隔（楽曲変更検出時）
- **長間隔**: 10 秒間隔（30 秒間変更がない場合）

**Spotify モード（Web API）:**

- **短間隔**: 10 秒間隔（楽曲変更検出時）
- **長間隔**: 30 秒間隔（30 秒間変更がない場合）

### ポーリング間隔の自動調整

- **アクティブモード**: 楽曲変更後は短間隔で高レスポンス
- **アイドルモード**: 30 秒間変更がない場合、長間隔に切り替えて効率化
- **リアルタイム復帰**: 楽曲が変わると即座に短間隔に戻る
- **ソース切り替え対応**: VLC⇔Spotify フォールバック時も適切な間隔を使用

### 利点

- **レスポンシブ**: 楽曲変更時は素早く検出（VLC:5 秒、Spotify:10 秒）
- **効率的**: 変更がない時は API 呼び出しを削減
- **レート制限対応**: Spotify API 制限を考慮した設計
- **VLC 最適化**: ローカル API なので高頻度ポーリングが可能

## レート制限対策

このアプリケーションには以下のレート制限対策が実装されています：

### Spotify API 制限対応

- **API 呼び出し制限**: 1 分間に最大 30 回の Spotify API コール
- **適応的ポーリング**: Spotify 使用時は 10 秒/30 秒間隔で効率化
- **変更検知**: 楽曲が変わった場合のみクライアントに通知
- **キャッシュ機能**: レート制限時は前回の結果を返す
- **429 エラー処理**: Spotify からのレート制限レスポンスを適切に処理

### VLC 最適化

- **高速ポーリング**: ローカル API なので 5 秒/10 秒間隔で高レスポンス
- **フォールバック機能**: VLC 停止時は自動的に Spotify に切り替え
- **接続エラー処理**: VLC 接続失敗時の適切なエラーハンドリング

### 推奨設定

- 適応的ポーリングが自動で最適化するため、特別な設定は不要
- VLC 使用時: 1 時間あたり約 360-720 回のローカル API 呼び出し
- Spotify 使用時: 1 時間あたり 120-360 回の API 呼び出しで、制限内に収まります

## プロジェクト構造

```
src/
├── main.ts                    # メインサーバー
├── auth/
│   └── spotify-auth.ts        # Spotify認証管理
├── media/
│   ├── spotify-player.ts      # Spotify再生情報取得
│   ├── vlc-player.ts          # VLC再生情報取得
│   └── unified-player.ts      # 統合再生情報管理
├── vlc/
│   └── vlc-process.ts         # VLCプロセス管理
├── websocket/
│   └── websocket-handler.ts   # WebSocket接続・ポーリング管理
└── utils/
    └── helpers.ts             # ユーティリティ関数

scripts/                       # Windows専用ヘルパースクリプト
├── start-vlc-gui.bat         # VLC GUI起動 (Windows)
├── start-vlc-with-web.bat    # VLC Web起動 (Windows)
└── vlc-setup-helper.bat      # VLC設定ヘルプ (Windows)

public/                        # 静的ファイル
├── index.html                # メインページ
├── script.js                 # クライアントJavaScript
├── style.css                 # スタイルシート
├── overlay.html              # オーバーレイページ
├── overlay-script.js         # オーバーレイJavaScript
└── overlay-style.css         # オーバーレイスタイル

config_example.toml            # 設定ファイルテンプレート
```

## ライセンス

## 本ソフトウェア

デュアルライセンスからライセンスを選択してご使用ください。

Licensed under either of

Apache License, Version 2.0, (LICENSE-APACHE or
https://www.apache.org/licenses/LICENSE-2.0) MIT license (LICENSE-MIT or
https://opensource.org/licenses/MIT) at your option.
