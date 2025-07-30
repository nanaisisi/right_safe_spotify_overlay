@echo off
REM ================================================================
REM Windows専用 - VLC GUI起動スクリプト
REM Windows only - VLC GUI startup script
REM ================================================================
echo Starting VLC GUI with HTTP Interface for Spotify Overlay...
echo.

REM VLC executable path
set VLC_PATH="C:\Program Files\VideoLAN\VLC\vlc.exe"

REM VLC HTTP interface settings - modify as needed
set VLC_HTTP_PORT=8080
set VLC_HTTP_HOST=localhost
set /p VLC_HTTP_PASSWORD=Enter VLC HTTP password: 

REM Check if VLC exists
if not exist %VLC_PATH% (
    echo Error: VLC not found at %VLC_PATH%
    echo Please install VLC or update the path in this batch file
    pause
    exit /b 1
)

echo Starting VLC with:
echo - GUI Interface: Enabled
echo - HTTP Interface: Enabled on port %VLC_HTTP_PORT%
echo - Host: %VLC_HTTP_HOST%
echo - Password: [HIDDEN]
echo.

REM Start VLC with GUI and HTTP interface
%VLC_PATH% --extraintf http --http-password %VLC_HTTP_PASSWORD% --http-port %VLC_HTTP_PORT% --http-host %VLC_HTTP_HOST%

echo VLC has been closed.
pause
