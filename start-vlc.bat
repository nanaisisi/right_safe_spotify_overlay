@echo off
echo Setting up VLC mode...

rem Backup current .env file
if exist .env (
    copy .env .env.backup
    echo Backed up current .env to .env.backup
)

echo.
echo Creating VLC configuration...

rem Create VLC-specific .env file
(
echo # VLC Media Player integration
echo VLC_ENABLED=true
echo VLC_HOST=localhost
echo VLC_PORT=8080
echo VLC_PASSWORD=vlc
echo.
echo # Server configuration
echo PORT=8081
echo POLLING_INTERVAL=10000
echo.
echo # Spotify settings ^(not used in VLC mode^)
echo SPOTIFY_CLIENT_ID=
echo SPOTIFY_CLIENT_SECRET=
echo REDIRECT_URI=http://127.0.0.1:8081/callback
) > .env

echo VLC configuration created!
echo.
echo Make sure VLC Web Interface is enabled:
echo 1. Open VLC
echo 2. Tools ^> Preferences ^> Interface ^> Main interfaces
echo 3. Check "Web"
echo 4. Set HTTP password to "vlc"
echo 5. Restart VLC
echo.
echo Starting server...
deno run --allow-net --allow-env --allow-read src/main.ts
