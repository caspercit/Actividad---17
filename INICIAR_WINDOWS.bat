@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ==============================================
echo   LibroVista - Actividad 17 - React Native
 echo ==============================================
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Instala Node.js 22.13 o superior antes de continuar.
  pause
  exit /b 1
)
echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 goto failed
echo [2/3] Verificando compatibilidad con Expo...
call npx expo install --fix
if errorlevel 1 goto failed
echo [3/3] Iniciando Expo (escanea QR con Expo Go)...
call npx expo start
exit /b %errorlevel%
:failed
echo No se pudo completar la preparacion. Revisa el mensaje anterior.
pause
exit /b 1
