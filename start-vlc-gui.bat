@echo off
echo Starting VLC GUI with HTTP Interface for Spotify Overlay...
echo.

REM VLC executable path
set VLC_PATH="C:\Program Files\VideoLAN\VLC\vlc.exe"

REM Check if VLC exists
if not exist %VLC_PATH% (
    echo Error: VLC not found at %VLC_PATH%
    echo Please install VLC or update the path in this batch file
    pause
    exit /b 1
)

echo Starting VLC with:
echo - GUI Interface: Enabled
echo - HTTP Interface: Enabled on port 8080
echo - Password: doragon
echo.

REM Start VLC with GUI and HTTP interface
%VLC_PATH% --extraintf http --http-password doragon --http-port 8080 --http-host localhost

echo VLC has been closed.
pause
