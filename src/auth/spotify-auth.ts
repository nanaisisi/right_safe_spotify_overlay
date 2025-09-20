export class SpotifyAuth {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private config: any;

  // トークン保存ファイルパス
  private readonly tokenFilePath = "./spotify_tokens.json";

  // 未ログイン警告の状態管理
  private loginWarningCount = 0;
  private lastLoginWarningTime = 0;

  constructor(config: any) {
    this.config = config;
    // コンストラクタで保存されたトークンを読み込む
    this.loadTokensFromFile();
  }

  get isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  get token(): string | null {
    return this.accessToken;
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      console.error("No refresh token available");
      return;
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(`${this.config.clientId}:${this.config.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Error refreshing token: ${body}`);
      // Potentially handle this by forcing a re-login
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = null;

      // 期限切れのトークンファイルを削除
      try {
        await Deno.remove(this.tokenFilePath);
        console.log("Removed expired token file");
      } catch (error) {
        // ファイルが存在しない場合は無視
      }

      return;
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    console.log("Access token refreshed");

    // トークンをファイルに保存
    await this.saveTokensToFile();
  }

  async handleCallback(code: string): Promise<boolean> {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(`${this.config.clientId}:${this.config.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Authentication error: ${body}`);
      return false;
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    // ログイン成功時に警告カウントをリセット
    this.loginWarningCount = 0;
    this.lastLoginWarningTime = 0;
    console.log("✓ Spotify authentication successful!");

    // トークンをファイルに保存
    await this.saveTokensToFile();

    return true;
  }

  getAuthUrl(): string {
    const scope = "user-read-currently-playing";
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", this.config.clientId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", this.config.redirectUri);
    return authUrl.toString();
  }

  checkTokenExpiration(): void {
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
      this.refreshAccessToken();
    }
  }

  showLoginWarning(): void {
    const now = Date.now();
    if (
      this.loginWarningCount < this.config.loginWarningMaxCount &&
      now - this.lastLoginWarningTime > this.config.loginWarningInterval
    ) {
      this.loginWarningCount++;
      this.lastLoginWarningTime = now;
      console.warn(
        `⚠️  Spotify not authenticated! (Warning ${this.loginWarningCount}/${this.config.loginWarningMaxCount})`
      );
      console.warn(
        `   Please go to http://127.0.0.1:${this.config.port}/login to authenticate`
      );
      console.warn(
        `   Without authentication, no track information will be available.`
      );
    }
  }

  /**
   * トークンをファイルに保存
   */
  private async saveTokensToFile(): Promise<void> {
    try {
      const tokenData = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiresAt: this.tokenExpiresAt,
        savedAt: new Date().toISOString(),
      };

      await Deno.writeTextFile(
        this.tokenFilePath,
        JSON.stringify(tokenData, null, 2)
      );
      console.log("✓ Spotify tokens saved to file");
    } catch (error) {
      console.error("Error saving tokens to file:", error);
    }
  }

  /**
   * ファイルからトークンを読み込み
   */
  private async loadTokensFromFile(): Promise<void> {
    try {
      const tokenDataText = await Deno.readTextFile(this.tokenFilePath);
      const tokenData = JSON.parse(tokenDataText);

      // トークンの有効性をチェック
      if (tokenData.tokenExpiresAt && Date.now() < tokenData.tokenExpiresAt) {
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
        this.tokenExpiresAt = tokenData.tokenExpiresAt;
        console.log("✓ Spotify tokens loaded from file");
        console.log(
          `  Expires: ${new Date(tokenData.tokenExpiresAt).toLocaleString()}`
        );
      } else {
        console.log(
          "⚠️  Saved tokens have expired, will need re-authentication"
        );
        // 期限切れのトークンファイルを削除
        await Deno.remove(this.tokenFilePath);
      }
    } catch (error) {
      // ファイルが存在しない場合は何もしない（初回起動時など）
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error("Error loading tokens from file:", error);
      }
    }
  }
}
