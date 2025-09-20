/**
 * Timer Manager - 再生時間の管理とリアルタイム更新
 * 楽曲の再生時間をクライアントサイドで管理
 */

export class TimerManager {
  constructor(domManager) {
    this.domManager = domManager;
    this.currentProgressMs = 0;
    this.currentDuration = 0;
    this.isPlaying = false;
    this.updateTimer = null;
  }

  /**
   * タイマーの状態を更新
   */
  updateTimerState(progressMs, duration, isPlaying) {
    this.currentProgressMs = progressMs || 0;
    this.currentDuration = duration || 0;
    this.isPlaying = isPlaying || false;

    this.updatePlaybackTimer();
  }

  /**
   * 再生タイマーを開始/停止
   */
  updatePlaybackTimer() {
    // 既存のタイマーをクリア
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // 再生中の場合のみタイマーを開始
    if (this.isPlaying && this.currentDuration > 0) {
      this.updateTimer = setInterval(() => {
        this.currentProgressMs += 1000; // 1秒進める

        // 楽曲の終わりを超えないようにする
        if (this.currentProgressMs > this.currentDuration * 1000) {
          this.currentProgressMs = this.currentDuration * 1000;
          this.isPlaying = false;
          this.updatePlaybackTimer(); // タイマーを停止
        }

        // 現在の再生時間を更新
        this.updateCurrentTime(this.currentProgressMs);
      }, 1000); // 1秒ごとに更新
    }
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
      this.domManager.elements.currentTime.textContent = formattedTime;
      console.log("現在の再生時間更新:", formattedTime);
    } else {
      this.domManager.elements.currentTime.textContent = "0:00";
      console.log("現在の再生時間リセット");
    }
  }

  /**
   * タイマーを停止してリセット
   */
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.currentProgressMs = 0;
    this.currentDuration = 0;
    this.isPlaying = false;
    this.updateCurrentTime(0);
  }
}
