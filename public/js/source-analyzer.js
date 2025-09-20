/**
 * Source Analyzer - 楽曲ソースの分析と判定
 * 楽曲データからソース（Spotify/VLC）を分析
 */

export class SourceAnalyzer {
  constructor() {
    this.analysisCache = new Map();
    this.pendingAnalysis = new Map();
  }

  /**
   * 基本的なソース判定
   */
  analyzeSource(trackData) {
    const { trackName, artistName, source } = trackData;

    // サーバーからソース情報が提供されている場合はそれを優先
    if (source) {
      return this.parseSourceString(source);
    }

    // フォールバック判定
    return this.fallbackSourceAnalysis(trackName, artistName);
  }

  /**
   * ソース文字列を解析
   */
  parseSourceString(source) {
    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (source.includes("Spotify")) {
      sourceText = "Spotify";
      sourceClass = "source-spotify";
    } else if (source.includes("VLC")) {
      sourceText = "VLC";
      sourceClass = "source-vlc";
    }

    return { sourceText, sourceClass };
  }

  /**
   * フォールバック判定（サーバーからソース情報が無い場合）
   */
  fallbackSourceAnalysis(trackName, artistName) {
    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (trackName && artistName) {
      // ファイル拡張子による判定
      if (trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      }
      // Unknown情報による判定
      else if (
        artistName === "Unknown Artist" &&
        trackName === "Unknown Track"
      ) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      }
      // デフォルトはSpotify
      else {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
      }
    }

    return { sourceText, sourceClass };
  }

  /**
   * 高度な分析結果を処理（サーバーからの分析結果）
   */
  handleAnalysisResult(data) {
    const { trackName, artistName, analysis } = data;
    const trackId = `${trackName}-${artistName}`;

    // 分析結果をキャッシュ
    this.analysisCache.set(trackId, analysis);

    // 待機中の分析要求を解決
    if (this.pendingAnalysis.has(trackId)) {
      const resolver = this.pendingAnalysis.get(trackId);
      resolver(analysis);
      this.pendingAnalysis.delete(trackId);
    }

    console.log("Analysis result cached for:", trackId);
    return analysis;
  }

  /**
   * キャッシュされた分析結果を取得
   */
  getCachedAnalysis(trackName, artistName) {
    const trackId = `${trackName}-${artistName}`;
    return this.analysisCache.get(trackId);
  }

  /**
   * 分析結果を待機
   */
  waitForAnalysis(trackName, artistName, timeout = 5000) {
    const trackId = `${trackName}-${artistName}`;

    return new Promise((resolve, reject) => {
      // すでにキャッシュされている場合は即座に返す
      if (this.analysisCache.has(trackId)) {
        resolve(this.analysisCache.get(trackId));
        return;
      }

      // 待機中に追加
      this.pendingAnalysis.set(trackId, resolve);

      // タイムアウト処理
      setTimeout(() => {
        if (this.pendingAnalysis.has(trackId)) {
          this.pendingAnalysis.delete(trackId);
          reject(new Error("Analysis timeout"));
        }
      }, timeout);
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.analysisCache.clear();
    this.pendingAnalysis.clear();
  }
}
