@echo off
echo Spotify Overlay Server starting...
deno run --allow-net --allow-read --allow-env src/main.ts
pause