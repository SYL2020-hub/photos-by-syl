@echo off
REM =============================================================================
REM WILDFRAME — One-click image optimizer (Windows)
REM Double-click this file after adding photos to images/originals/<album>/
REM =============================================================================

cd /d "%~dp0"
echo.
echo Running image optimizer...
echo.

REM Try Python launcher first (works on most Windows installs), fall back to python
where py >nul 2>&1
if %errorlevel%==0 (
    py -3 scripts\optimize_images.py
) else (
    python scripts\optimize_images.py
)

echo.
pause
