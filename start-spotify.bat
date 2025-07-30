@echo off
echo Setting up Spotify mode...

rem Backup current .env file
if exist .env (
    copy .env .env.backup
    echo Backed up current .env to .env.backup
)

echo.
echo Creating Spotify configuration...

rem Create Spotify-specific .env file
(
echo # Spotify API credentials
echo # Get these from https://developer.spotify.com/dashboard
echo SPOTIFY_CLIENT_ID=d3578aec4a8a446d9470e2afbf990b2c
echo SPOTIFY_CLIENT_SECRET=925a9d3af2e041aa85c153ebfc067547
echo.
echo # Server configuration
echo PORT=8081
echo REDIRECT_URI=http://127.0.0.1:8081/callback
echo POLLING_INTERVAL=10000
echo.
echo # VLC settings ^(disabled for Spotify mode^)
echo VLC_ENABLED=false
echo VLC_HOST=localhost
echo VLC_PORT=8080
echo VLC_PASSWORD=vlc
) > .env

echo Spotify configuration created!
echo.
echo Make sure to:
echo 1. Create a Spotify app at https://developer.spotify.com/dashboard
echo 2. Update SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
echo 3. Set redirect URI to http://127.0.0.1:8081/callback
echo.
echo Starting server...
deno run --allow-net --allow-env --allow-read src/main.ts
