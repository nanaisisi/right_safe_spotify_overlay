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

    // プレイリスト情報を更新（Spotifyの場合のみ）
    this.updatePlaylistIndicator(source, isInPlaylist, contextType, contextUri);

    // ソース情報を更新
    this.updateSourceInfo(source);

    this.updateContainerState(isPlaying);
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
   * プレイリストインジケーターを更新
   */
  updatePlaylistIndicator(
    source,
    isInPlaylist,
    contextType = null,
    contextUri = null
  ) {
    // 全てのインジケーターを一旦非表示
    this.elements.playlistInIndicator.style.display = "none";
    this.elements.playlistOtherIndicator.style.display = "none";
    this.elements.playlistNoneIndicator.style.display = "none";

    // Spotify再生の場合のみインジケーターを表示
    if (source && source.includes("Spotify")) {
      if (isInPlaylist === true && contextType === "playlist") {
        // 現在のプレイリストから再生中
        this.elements.playlistInIndicator.style.display = "inline";
        console.log("現在のプレイリストから再生中:", contextUri);
      } else if (isInPlaylist === false) {
        // プレイリスト外から再生中 - コンテキストタイプで詳細判定
        if (contextType === "album") {
          // アルバムから再生中 - 他のプレイリストにある可能性
          this.elements.playlistOtherIndicator.style.display = "inline";
          console.log("アルバムから再生中（他のプレイリストにある可能性）");
        } else if (contextType === "artist") {
          // アーティストから再生中 - 他のプレイリストにある可能性
          this.elements.playlistOtherIndicator.style.display = "inline";
          console.log("アーティストから再生中（他のプレイリストにある可能性）");
        } else if (contextType === "search") {
          // 検索結果から再生中 - 他のプレイリストにある可能性
          this.elements.playlistOtherIndicator.style.display = "inline";
          console.log("検索結果から再生中（他のプレイリストにある可能性）");
        } else {
          // ミックス、レコメンド、ラジオなど - どのプレイリストにもない可能性が高い
          this.elements.playlistNoneIndicator.style.display = "inline";
          console.log("ミックス/レコメンド再生中（プレイリスト外の可能性）");
        }
      } else {
        // isInPlaylistが不明な場合は非表示
        console.log("プレイリスト状態不明のため非表示");
      }
    } else {
      // VLCなどSpotify以外の場合は非表示
      console.log("非Spotify再生のためインジケーター非表示");
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

    this.elements.container.classList.add("no-track");
    this.elements.container.classList.remove("playing", "paused");

    console.log("Showing no track state");
  }
}
