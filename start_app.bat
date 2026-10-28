@echo off
title KVK Thaniya Mandi - Multi-Device Live Sync Server
cd /d "%~dp0"
echo ========================================================
echo     KVK THANIYA MANDI - MULTI-DEVICE BILLING APP
echo ========================================================
echo.
echo Starting Production Server on Port 5000...
start "KVK Backend" cmd.exe /k "node server.js"

echo.
echo Starting HTTPS Cloud Internet Tunnel...
start "KVK Internet Tunnel" cmd.exe /k "ngrok http 5000"

echo.
echo ========================================================
echo Local Shop Wi-Fi URL:  http://192.168.1.23:5000
echo Mobile Data HTTPS URL: https://renderer-ending-rickety.ngrok-free.dev
echo ========================================================
pause
