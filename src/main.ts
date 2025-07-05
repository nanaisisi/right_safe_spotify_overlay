import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.140.0/http/file_server.ts";

serve(async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
        const { response, socket } = Deno.upgradeWebSocket(req);

        socket.onopen = () => {
            console.log("WebSocket connection opened");
            // 3秒ごとにダミーデータを送信
            setInterval(() => {
                socket.send(JSON.stringify({
                    trackName: "Test Track",
                    artistName: "Test Artist"
                }));
            }, 3000);
        };

        socket.onmessage = (e) => {
            console.log("Message from client:", e.data);
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
        };

        socket.onerror = (e) => {
            console.error("WebSocket error:", e);
        };

        return response;
    }

    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
}, { port: 8081 });
