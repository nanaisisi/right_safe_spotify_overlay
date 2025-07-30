@echo off
echo Starting VLC with Web Interface enabled...

rem VLCのパスを検索
set VLC_PATH=""
if exist "C:\Program Files\VideoLAN\VLC\vlc.exe" (
    set VLC_PATH="C:\Program Files\VideoLAN\VLC\vlc.exe"
) else if exist "C:\Program Files (x86)\VideoLAN\VLC\vlc.exe" (
    set VLC_PATH="C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"
) else (
    echo VLC not found in standard locations.
    echo Please install VLC or update the path in this script.
    pause
    exit /b
)

echo Starting VLC with Web Interface...
echo - Host: localhost
echo - Port: 8080  
echo - Password: vlc
echo.

start "" %VLC_PATH% --intf http --http-password vlc --http-port 8080

echo VLC started with Web Interface enabled.
echo You can now access it at: http://localhost:8080
echo Username: (leave empty)
echo Password: vlc
echo.
echo After VLC is fully loaded, you can start the overlay application.
pause
