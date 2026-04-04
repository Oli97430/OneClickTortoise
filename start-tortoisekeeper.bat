@echo off
title TortoiseKeeper Launcher

echo Killing all Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Lancement du backend...
start "Backend" cmd /k "cd /d F:\CascadeProjects\tortoisekeeper-backend && npm start"

echo Lancement du front-end...
start "Frontend" cmd /k "cd /d F:\CascadeProjects\tortoisekeeper-web && npm start"

echo Appuyer sur une touche pour fermer ce script.
pause > nul
