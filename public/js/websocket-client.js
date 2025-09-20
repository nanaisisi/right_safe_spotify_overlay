/**
 * WebSocket Client - サーバーとの通信管理
 * 自動再接続機能付きWebSocketクライアント
 */

export class WebSocketClient {
  constructor(url, messageHandler) {
    this.url = url;
    this.messageHandler = messageHandler;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // 1秒
    this.isConnected = false;

    this.connect();
  }

  /**
   * WebSocket接続を確立
   */
  connect() {
    try {
      console.log("Attempting to connect to WebSocket:", this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = (event) => {
        console.log("✓ WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          this.messageHandler.handleMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        console.log("WebSocket connection closed:", event.code, event.reason);

        if (event.code !== 1000) {
          // 正常な終了でない場合は再接続を試行
          this.scheduleReconnect();
        }

        // 接続が失われたことをハンドラーに通知
        if (this.messageHandler.handleConnectionLost) {
          this.messageHandler.handleConnectionLost();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * メッセージを送信
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn("WebSocket is not connected");
    return false;
  }

  /**
   * 再接続をスケジュール
   */
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  /**
   * 接続を閉じる
   */
  close() {
    if (this.ws) {
      this.ws.close(1000, "Client initiated close");
    }
  }
}
