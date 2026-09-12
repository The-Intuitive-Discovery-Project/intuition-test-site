@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FINISH-SOUND-INTUITION.ps1" %*
set RC=%ERRORLEVEL%
echo.
if %RC%==0 (
  echo Sound Intuition finalization finished successfully.
) else (
  echo Sound Intuition finalization stopped with code %RC%.
)
pause
exit /b %RC%
