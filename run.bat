@echo off
title AI Finance Assistant Launcher
echo ===================================================
echo   AI-POWERED PERSONAL FINANCE ASSISTANT LAUNCHER
echo ===================================================
echo.

echo [1/2] Starting Backend API Server (Port 8000)...
start cmd /k "title Backend API Server && .venv\Scripts\activate && python -m uvicorn backend.app.main:app --port 8000 --reload"

echo [2/2] Starting Frontend Dev Server (Port 5173)...
start cmd /k "title Frontend Dev Server && cd frontend && npm run dev"

echo.
echo ===================================================
echo  Both servers have been launched in separate windows!
echo  - Frontend: http://localhost:5173
echo  - Backend Docs: http://localhost:8000/docs
echo.
echo  To close, simply close the spawned terminal windows.
echo ===================================================
pause
