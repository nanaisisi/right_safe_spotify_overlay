/**
 * DOM Manager - DOM要素の管理と操作
 * オーバーレイのDOM要素への読み書きを担当
 */

export class DOMManager {
  constructor() {
    this.elements = {
      container: document.getElementById("overlay-container"),
      trackName: document.getElementById("track-name"),
      artistName: document.getElementById("artist-name"),
      sourceName: document.getElementById("source-name"),
      currentTime: document.getElementById("current-time"),
      trackDuration: document.getElementById("track-duration"),
      playlistInIndicator: document.getElementById("playlist-in-indicator"),
      playlistOtherIndicator: document.getElementById(
        "playlist-other-indicator"
      ),
      playlistNoneIndicator: document.getElementById("playlist-none-indicator"),
      popularityIndicator: document.getElementById("popularity-indicator"),
      localIndicator: document.getElementById("local-indicator"),
    };

    this.validateElements();
  }

  /**
   * 必要なDOM要素が存在するかチェック
   */
  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing DOM elements: ${missingElements.join(", ")}`);
    }
  }

  /**
   * トラック情報を表示
   */
  updateTrackInfo(trackData) {
    console.log("=== updateTrackInfo 受信データ詳細 ===");
    console.log("Raw trackData:", trackData);
    console.log(
      "playlistStatus:",
      trackData.playlistStatus,
      typeof trackData.playlistStatus
    );
    console.log(
      "popularity:",
      trackData.popularity,
      typeof trackData.popularity
    );
    console.log("isLocal:", trackData.isLocal, typeof trackData.isLocal);
    console.log("contextType:", trackData.contextType);
    console.log("contextUri:", trackData.contextUri);

    const {
      trackName,
      artistName,
      isPlaying,
      source,
      duration,
      progressMs,
      isInPlaylist,
      contextType,
      contextUri,
      popularity,
      isLocal,
      playlistStatus,
    } = trackData;

    if (!trackName || !artistName) {
      this.showNoTrack();
      return;
    }

    const playingIndicator = isPlaying ? "♪ " : "⏸ ";

    // 楽曲情報とソース情報を同時に更新
    this.elements.trackName.textContent = playingIndicator + trackName;
    this.elements.artistName.textContent = artistName;

    // 現在の再生時間を更新
    this.updateCurrentTime(progressMs);

    // 秒数表示を更新
    this.updateTrackDuration(duration);

    // プレイリスト情報を更新（新しい判定方式を使用）
    this.updatePlaylistIndicator(
      source,
      playlistStatus,
      contextType,
      contextUri
    );

    // 人気度とローカル再生情報を更新
    this.updatePopularityIndicator(source, popularity);
    this.updateLocalIndicator(source, isLocal);

    // ソース情報を更新
    this.updateSourceInfo(source);

    this.updateContainerState(isPlaying);

    console.log("TrackInfo updated:", {
      trackName,
      source,
      playlistStatus,
      popularity: typeof popularity,
      isLocal: typeof isLocal,
    });
  }

  /**
   * trackDataからソース情報を直接更新
   */
  updateSourceInfoFromData(data) {
    console.log("=== updateSourceInfoFromData 詳細デバッグ ===");
    console.log("受信データ:", data);
    console.log("data.source:", data.source);
    console.log("data.trackName:", data.trackName);
    console.log("data.artistName:", data.artistName);

    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (data.source) {
      console.log("data.sourceが存在します:", data.source);
      if (data.source.includes("Spotify")) {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
        console.log("→ Spotify判定");
      } else if (data.source.includes("VLC")) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
        console.log("→ VLC判定");
      } else {
        console.log("→ 不明なソース:", data.source);
      }
    } else {
      console.log("data.sourceが未定義、フォールバック判定を実行");
      // フォールバック判定
      if (data.trackName && data.artistName) {
        if (data.trackName.match(/\.(mp3|flac|wav|m4a|aac|ogg)$/i)) {
          sourceText = "VLC";
          sourceClass = "source-vlc";
          console.log("→ ファイル拡張子によりVLC判定");
        } else if (
          data.artistName === "Unknown Artist" &&
          data.trackName === "Unknown Track"
        ) {
          sourceText = "VLC";
          sourceClass = "source-vlc";
          console.log("→ Unknown Artist/TrackによりVLC判定");
        } else {
          sourceText = "Spotify";
          sourceClass = "source-spotify";
          console.log("→ デフォルトでSpotify判定");
        }
      }
    }

    console.log("最終判定結果:", { sourceText, sourceClass });
    console.log(
      "DOM更新前 - 現在の表示:",
      this.elements.sourceName.textContent
    );

    this.elements.sourceName.textContent = sourceText;
    this.elements.sourceName.className = sourceClass;

    console.log(
      "DOM更新後 - 新しい表示:",
      this.elements.sourceName.textContent
    );
    console.log("=== updateSourceInfoFromData 完了 ===");
  }

  /**
   * 現在の再生時間を更新
   */
  updateCurrentTime(progressMs) {
    if (progressMs && typeof progressMs === "number") {
      const currentSeconds = Math.floor(progressMs / 1000);
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      this.elements.currentTime.textContent = formattedTime;
      console.log("現在の再生時間更新:", formattedTime);
    } else {
      this.elements.currentTime.textContent = "0:00";
      console.log("現在の再生時間リセット");
    }
  }

  /**
   * トラックの秒数表示を更新
   */
  updateTrackDuration(duration) {
    if (duration && typeof duration === "number") {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
      this.elements.trackDuration.textContent = formattedDuration;
      console.log("総時間更新:", formattedDuration);
    } else {
      this.elements.trackDuration.textContent = "0:00";
      console.log("総時間リセット");
    }
  }

  /**
   * プレイリストインジケーターを更新（実際の含有状況ベース）
   */
  updatePlaylistIndicator(
    source,
    playlistStatus,
    contextType = null,
    contextUri = null
  ) {
    // 全てのインジケーターを一旦非表示
    this.elements.playlistInIndicator.style.display = "none";
    this.elements.playlistOtherIndicator.style.display = "none";
    this.elements.playlistNoneIndicator.style.display = "none";

    // Spotify再生の場合のみインジケーターを表示
    if (source && source.includes("Spotify") && playlistStatus) {
      console.log("プレイリスト判定（実際の含有確認）:", {
        playlistStatus,
        contextType,
        contextUri,
      });

      if (playlistStatus === "current") {
        // 楽曲が実際にプレイリストに含まれている
        this.elements.playlistInIndicator.style.display = "inline";
        console.log("✓ 楽曲がプレイリストに実際に含まれています:", contextUri);
      } else if (playlistStatus === "other") {
        // アルバム/アーティストから再生中（他のプレイリストにある可能性）
        this.elements.playlistOtherIndicator.style.display = "inline";
        console.log(`✓ ${contextType}から再生中（プレイリストにもある可能性）`);
      } else if (playlistStatus === "none") {
        // 楽曲がプレイリストに含まれていない、またはミックス/レコメンド再生
        this.elements.playlistNoneIndicator.style.display = "inline";
        if (contextType === "playlist") {
          console.log(
            "✗ プレイリストコンテキストだが楽曲は実際には含まれていません"
          );
        } else {
          console.log(
            "✓ ミックス/レコメンド/検索などから再生中（プレイリスト外）"
          );
        }
      }
    } else {
      // VLCなどSpotify以外の場合、またはplaylistStatusが未定義の場合は非表示
      console.log(
        "非Spotify再生またはplaylistStatus未定義のためインジケーター非表示"
      );
    }
  }

  /**
   * 人気度インジケーターを更新
   */
  updatePopularityIndicator(source, popularity) {
    if (
      source &&
      source.includes("Spotify") &&
      typeof popularity === "number" &&
      popularity >= 0
    ) {
      this.elements.popularityIndicator.textContent = `人気度: ${popularity}`;
      this.elements.popularityIndicator.style.display = "inline";
      console.log("人気度表示:", popularity);
    } else {
      this.elements.popularityIndicator.style.display = "none";
      if (source && source.includes("Spotify")) {
        console.log("人気度データなし:", typeof popularity, popularity);
      }
    }
  }

  /**
   * ローカル再生インジケーターを更新
   */
  updateLocalIndicator(source, isLocal) {
    if (source && source.includes("Spotify") && typeof isLocal === "boolean") {
      this.elements.localIndicator.textContent = isLocal ? "ローカル" : "";
      this.elements.localIndicator.style.display = isLocal ? "inline" : "none";
      console.log("ローカル再生:", isLocal ? "あり" : "なし");
    } else {
      this.elements.localIndicator.style.display = "none";
      if (source && source.includes("Spotify")) {
        console.log("ローカル再生データなし:", typeof isLocal, isLocal);
      }
    }
  }

  /**
   * ソース情報を更新（シンプル版）
   */
  updateSourceInfo(source) {
    let sourceText = "不明";
    let sourceClass = "source-unknown";

    if (source) {
      if (source.includes("Spotify")) {
        sourceText = "Spotify";
        sourceClass = "source-spotify";
      } else if (source.includes("VLC")) {
        sourceText = "VLC";
        sourceClass = "source-vlc";
      }
    }

    this.elements.sourceName.textContent = sourceText;
    this.elements.sourceName.className = sourceClass;
  }

  /**
   * コンテナの状態を更新
   */
  updateContainerState(isPlaying) {
    if (isPlaying) {
      this.elements.container.classList.add("playing");
      this.elements.container.classList.remove("paused", "no-track");
    } else {
      this.elements.container.classList.add("paused");
      this.elements.container.classList.remove("playing", "no-track");
    }
  }

  /**
   * トラック変更時のアニメーション
   */
  triggerTrackChangeAnimation() {
    this.elements.container.classList.remove("track-changed");
    // Force reflow
    this.elements.container.offsetHeight;
    this.elements.container.classList.add("track-changed");

    console.log("Track change animation triggered");
  }

  /**
   * トラック情報が無い状態を表示
   */
  showNoTrack() {
    this.elements.trackName.textContent = "楽曲を取得中...";
    this.elements.artistName.textContent = "アーティスト名";
    this.elements.sourceName.textContent = "音源取得中...";
    this.elements.sourceName.className = "source-unknown";
    this.elements.currentTime.textContent = "0:00";
    this.elements.trackDuration.textContent = "0:00";
    this.elements.playlistInIndicator.style.display = "none";
    this.elements.playlistOtherIndicator.style.display = "none";
    this.elements.playlistNoneIndicator.style.display = "none";
    this.elements.popularityIndicator.style.display = "none";
    this.elements.localIndicator.style.display = "none";

    this.elements.container.classList.add("no-track");
    this.elements.container.classList.remove("playing", "paused");

    console.log("Showing no track state");
  }
}
