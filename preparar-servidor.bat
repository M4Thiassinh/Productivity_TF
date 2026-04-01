@echo off
echo ========================================
echo Preparando archivos para servidor...
echo ========================================

set ORIGEN=C:\Users\matyr\OneDrive\Escritorio\Chamba\Productivity_TF
set DESTINO=C:\Users\matyr\OneDrive\Escritorio\Chamba\Productivity_TF_SERVER

if exist "%DESTINO%" rd /s /q "%DESTINO%"
mkdir "%DESTINO%"

echo Copiando archivos necesarios...

xcopy "%ORIGEN%\public" "%DESTINO%\public\" /E /I /Y
copy "%ORIGEN%\server.js" "%DESTINO%\"
copy "%ORIGEN%\package.json" "%DESTINO%\"
copy "%ORIGEN%\package-lock.json" "%DESTINO%\"
copy "%ORIGEN%\ecosystem.config.js" "%DESTINO%\"
copy "%ORIGEN%\database.sql" "%DESTINO%\"
copy "%ORIGEN%\.env.example" "%DESTINO%\"
copy "%ORIGEN%\README.md" "%DESTINO%\"

echo.
echo ========================================
echo ✓ Archivos listos en:
echo %DESTINO%
echo ========================================
echo.
echo Ahora:
echo 1. Comprime la carpeta Productivity_TF_SERVER
echo 2. Copia el ZIP al Windows Server
echo 3. Descomprime en el servidor
echo ========================================
pause
