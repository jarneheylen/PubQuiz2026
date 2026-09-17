@echo off
REM Dubbelklik dit bestand om de quizavond te starten.
REM Eerste keer duurt iets langer: de app wordt dan gebouwd.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is niet gevonden.
  echo   Installeer de LTS-versie via https://nodejs.org/ en probeer opnieuw.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo   Pakketten installeren ^(eenmalig^)...
  echo.
  call npm install || goto :error
)

echo.
echo   De quizserver start. Laat dit venster open tijdens de quiz.
echo.
call npm run quiz || goto :error
goto :eof

:error
echo.
echo   Er ging iets mis. Lees de melding hierboven.
echo.
pause
exit /b 1
