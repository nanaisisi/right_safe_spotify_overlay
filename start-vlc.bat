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
echo VLC_HOST=127.0.0.1
echo VLC_PORT=8080
echo VLC_PASSWORD=doragon
echo.
echo # Server configuration
echo PORT=8081
echo POLLING_INTERVAL=5000
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
echo 3. Set "Settings show" to "All"
echo 4. Check "WEB"
echo 5. Go to Interface ^> Main interfaces ^> Lua ^> Lua HTTP
echo 6. Set password to "vlc"
echo 7. Restart VLC
echo.
echo Alternative: Start VLC with command line:
echo vlc --intf http --http-password vlc --http-port 8080
echo.
echo Starting server...
deno run --allow-net --allow-env --allow-read src/main.ts
