@echo off
echo Starting VLC with Auto-start Mode for Spotify Overlay...
echo.
echo Configuration:
echo - VLC Auto-start: Enabled
echo - Media Source: VLC Media Player
echo.

REM Copy .env.example to .env if .env doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo Created .env file from .env.example
    ) else (
        echo Warning: No .env or .env.example file found
    )
)

REM Start the application with VLC auto-start enabled
deno run --allow-net --allow-env --allow-read --allow-run src/main.ts

pause
