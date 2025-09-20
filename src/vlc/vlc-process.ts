import { delay } from "../utils/helpers.ts";

export class VLCProcessManager {
  private vlcProcess: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async startVLC(): Promise<void> {
    if (this.vlcProcess) {
      console.log("VLC is already running");
      return;
    }

    try {
      const guiText = this.config.vlcShowGui ? "GUI and " : "";
      console.log(
        `Starting VLC (${this.config.vlcExePath}) with ${guiText}web interface...`
      );

      const args = [
        "--extraintf",
        "http", // Add HTTP interface as extra interface
        "--http-password",
        this.config.vlcPassword,
        "--http-port",
        this.config.vlcPort.toString(),
        "--http-host",
        "127.0.0.1", // Use IPv4 explicitly
        "--http-src",
        "127.0.0.1", // Source address for HTTP interface
        "--no-ipv6", // Disable IPv6
      ];

      // Add GUI control options
      if (!this.config.vlcShowGui) {
        args.push("--intf", "dummy"); // No GUI interface
      }

      const command = new (globalThis as any).Deno.Command(
        this.config.vlcExePath,
        {
          args: args,
          stdout: "piped",
          stderr: "piped",
        }
      );

      this.vlcProcess = command.spawn();

      console.log(`✓ VLC started with PID: ${this.vlcProcess.pid}`);

      // Wait longer for VLC to initialize
      console.log("⏳ Waiting for VLC to initialize...");
      await delay(this.config.vlcInitDelay);

      // Check if VLC web interface is accessible
      await this.checkVLCWebInterface();
    } catch (error) {
      console.error("Failed to start VLC:", error);
      this.vlcProcess = null;
    }
  }

  private async checkVLCWebInterface(): Promise<void> {
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `http://127.0.0.1:${this.config.vlcPort}/requests/status.json`,
          {
            headers: {
              Authorization: "Basic " + btoa(":" + this.config.vlcPassword),
            },
          }
        );

        if (response.ok) {
          console.log("✓ VLC web interface is accessible");
          return;
        } else {
          console.error(
            `✗ VLC web interface returned error: ${response.status} (attempt ${
              i + 1
            }/${maxRetries})`
          );
        }
      } catch (error) {
        lastError = error;
        console.error(
          `✗ VLC connection attempt ${i + 1}/${maxRetries} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        if (i < maxRetries - 1) {
          console.log("⏳ Retrying in 2 seconds...");
          await delay(this.config.vlcRetryDelay);
        }
      }
    }

    console.error("✗ Failed to connect to VLC web interface after all retries");
  }

  shutdown(): void {
    if (this.vlcProcess) {
      console.log("Terminating VLC process...");
      try {
        this.vlcProcess.kill("SIGTERM");
      } catch (error) {
        console.error("Error terminating VLC process:", error);
      }
      this.vlcProcess = null;
    }
  }
}
