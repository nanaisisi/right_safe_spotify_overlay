@echo off
REM ================================================================
REM Windows専用 - VLC Web Interface起動スクリプト  
REM Windows only - VLC Web Interface startup script
REM ================================================================
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

REM VLC HTTP interface settings
set VLC_HTTP_PORT=8080
set VLC_HTTP_HOST=localhost
set /p VLC_HTTP_PASSWORD=Enter VLC HTTP password: 

echo Starting VLC with Web Interface...
echo - Host: %VLC_HTTP_HOST%
echo - Port: %VLC_HTTP_PORT%
echo - Password: [HIDDEN]
echo.

start "" %VLC_PATH% --intf http --http-password %VLC_HTTP_PASSWORD% --http-port %VLC_HTTP_PORT% --http-host %VLC_HTTP_HOST%

echo VLC started with Web Interface enabled.
echo You can now access it at: http://localhost:8080
echo Username: (leave empty)
echo Password: vlc
echo.
echo After VLC is fully loaded, you can start the overlay application.
pause
