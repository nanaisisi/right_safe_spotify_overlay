@echo off
echo Starting Spotify Overlay with TOML Configuration...
echo.
echo Configuration priority:
echo 1. config.toml (recommended)
echo 2. config_example.toml (fallback)
echo 3. Default values
echo.

REM Check if config.toml exists
if exist "config.toml" (
    echo ✓ Found config.toml
) else (
    if exist "config_example.toml" (
        copy "config_example.toml" "config.toml"
        echo ✓ Created config.toml from example
        echo Please edit config.toml to set your Spotify credentials
        pause
    ) else (
        echo Warning: No config.toml found
    )
)

REM Start the application
deno run --allow-net --allow-env --allow-read --allow-run src/main.ts

pause
