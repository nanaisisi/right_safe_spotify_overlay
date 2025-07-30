@echo off
echo VLC Manual Setup Helper for Spotify Overlay
echo ===========================================
echo.
echo This script helps you configure VLC for use with the Spotify Overlay.
echo.
echo Steps to set up VLC manually:
echo 1. Start VLC normally (double-click VLC icon)
echo 2. Go to: Tools > Preferences
echo 3. Click "Show settings: All" (bottom left)
echo 4. Navigate to: Interface > Main interfaces
echo 5. Check the "Web" checkbox
echo 6. Navigate to: Interface > Main interfaces > Lua > Lua HTTP
echo 7. Set password to: [YOUR_SECURE_PASSWORD]
echo 8. Restart VLC
echo.
echo After setup, VLC HTTP interface will be accessible at:
echo http://127.0.0.1:8080/
echo.
echo Then start the Spotify Overlay application:
echo deno run --allow-net --allow-env --allow-read src/main.ts
echo.
pause
