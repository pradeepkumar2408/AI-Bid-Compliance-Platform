@echo off
echo ===============================================================================
echo Launching GeM AI Compliance Verification Platform (SIH Problem Statement 26100)
echo ===============================================================================
echo.
echo 1. Starting AI Microservice (FastAPI + OCR + SHAP on port 8000)...
start "GeM AI Microservice" cmd /c "cd /d %~dp0ai-service && if exist venv\Scripts\python.exe (venv\Scripts\python.exe run.py) else (python run.py)"

echo 2. Starting Core Backend (Spring Boot + Drools + Oracle/H2 on port 8080)...
start "GeM Core Backend" cmd /c "cd /d %~dp0backend && call run_backend.bat"

echo 3. Starting Frontend (React + Vite on port 5173)...
start "GeM Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo ===============================================================================
echo Platform starting in separate terminal windows!
echo - React Frontend:  http://localhost:5173
echo - Spring Backend:  http://localhost:8080 (API endpoints)
echo - AI Microservice: http://localhost:8000 (Swagger docs: http://localhost:8000/docs)
echo ===============================================================================
pause
