@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STAGE-AUDIO-FROM-GOOGLE-DRIVE.ps1" %*
set RC=%ERRORLEVEL%
echo.
if %RC%==0 (echo Sound Intuition audio staging finished successfully.) else (echo Staging ended with code %RC%.)
pause
exit /b %RC%
