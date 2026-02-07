@echo off
setlocal

cd /d D:\prayer_time\web-admin
start "Web Admin Server" cmd /c "npx serve -l 5500 ."

cd /d D:\prayer_time\web-client
start "Web Client Server" cmd /c "npx serve -l 5501 ."

echo Servers started:
echo - Admin:  http://localhost:5500/index.html
echo - Client: http://localhost:5501/index.html
pause
