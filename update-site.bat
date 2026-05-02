@echo off
REM =============================================================================
REM PHOTOS BY SYL — One-click site updater
REM
REM What it does:
REM   1. Asks if you want to run the photo optimizer first
REM   2. Shows you what's about to be uploaded (safety check)
REM   3. Aborts if any high-res originals would be uploaded
REM   4. Commits and pushes everything to GitHub
REM   5. Tells you when the live site will be updated
REM
REM Just double-click this file. The script handles errors and tells you
REM what to do if anything goes wrong.
REM =============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ========================================================================
echo  PHOTOS BY SYL  -  Update site
echo ========================================================================
echo.

REM ---- Step 1: Verify Git is installed ----------------------------------------
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in your PATH.
    echo.
    echo Install Git from https://git-scm.com/download/win
    echo Then restart your computer and try again.
    echo.
    pause
    exit /b 1
)

REM ---- Step 2: Verify we're in a Git repository -------------------------------
REM Use git itself rather than a filesystem check — more robust against
REM OneDrive sync quirks and Windows hidden-file shenanigans.
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This folder is not a Git repository.
    echo.
    echo You may be running this script from the wrong folder.
    echo Make sure you are inside the project folder ^(wildframe^).
    echo If the problem persists, contact Claude for recovery instructions.
    echo.
    pause
    exit /b 1
)

REM ---- Step 3: Optionally run the photo optimizer -----------------------------
echo Did you add, remove, or change any photos since the last update?
echo.
set /p RUN_OPT="Run photo optimizer first? (Y/N): "

if /i "!RUN_OPT!"=="Y" (
    echo.
    echo Running photo optimizer...
    echo ------------------------------------------------------------------------

    where py >nul 2>&1
    if !errorlevel!==0 (
        py -3 scripts\optimize_images.py
    ) else (
        python scripts\optimize_images.py
    )

    if errorlevel 1 (
        echo.
        echo ERROR: The photo optimizer failed. Update aborted.
        echo Fix the optimizer error first, then re-run this script.
        echo.
        pause
        exit /b 1
    )
    echo ------------------------------------------------------------------------
    echo.
)

REM ---- Step 4: Safety check -- never upload high-res originals ----------------
echo Checking what files will be uploaded...
echo.

git add . >nul 2>&1
if errorlevel 1 (
    echo ERROR: 'git add' failed.
    pause
    exit /b 1
)

git ls-files --cached | findstr /i "originals" >nul 2>&1
if !errorlevel!==0 (
    echo ========================================================================
    echo  SAFETY ABORT
    echo ========================================================================
    echo.
    echo High-resolution originals would be uploaded to GitHub.
    echo This should NEVER happen. The .gitignore file may be missing or wrong.
    echo.
    echo Files about to be uploaded that should NOT be:
    git ls-files --cached | findstr /i "originals"
    echo.
    echo Reverting the staged changes. Nothing has been pushed.
    git reset >nul 2>&1
    echo.
    pause
    exit /b 1
)

REM ---- Step 5: Anything to commit? --------------------------------------------
git diff --cached --quiet
if !errorlevel!==0 (
    echo Nothing has changed since the last update. The site is already up-to-date.
    echo.
    pause
    exit /b 0
)

REM ---- Step 6: Show what changed ----------------------------------------------
echo Changes about to be uploaded:
echo ------------------------------------------------------------------------
git diff --cached --stat
echo ------------------------------------------------------------------------
echo.

set /p CONFIRM="Push these changes to the live site? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo.
    echo Cancelled. Reverting the staged changes. Nothing has been pushed.
    git reset >nul 2>&1
    echo.
    pause
    exit /b 0
)

REM ---- Step 7: Commit and push ------------------------------------------------
echo.
echo Committing and pushing...
echo ------------------------------------------------------------------------

git commit -m "Site update" >nul
if errorlevel 1 (
    echo ERROR: Commit failed.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo ERROR: Push failed.
    echo This usually means a network problem or expired GitHub credentials.
    echo If credentials are the issue, generate a new Personal Access Token at:
    echo   https://github.com/settings/tokens
    echo.
    pause
    exit /b 1
)

REM ---- Done -------------------------------------------------------------------
echo ------------------------------------------------------------------------
echo.
echo  DONE.
echo  Your site will be live at https://photosbysyl.com in 1-2 minutes.
echo.
echo ========================================================================
echo.
pause
