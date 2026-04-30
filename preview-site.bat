@echo off
REM =============================================================================
REM WILDFRAME — Start local preview server
REM Double-click this file, then open http://localhost:8000 in your browser
REM Press Ctrl+C in the window to stop the server when you're done
REM =============================================================================

cd /d "%~dp0"
echo.
echo Starting local preview server...
echo.
echo Open this address in your browser:   http://localhost:8000
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

where py >nul 2>&1
if %errorlevel%==0 (
    py -3 -m http.server 8000
) else (
    python -m http.server 8000
)

pause
