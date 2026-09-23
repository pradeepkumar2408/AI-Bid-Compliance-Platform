@echo off
cd /d "%~dp0ai-service"
echo ========================================================
echo Starting GeM AI/ML Microservice (FastAPI + OCR + SHAP)
echo URL: http://localhost:8000 (Swagger: /docs)
echo ========================================================
if exist "%~dp0ai-service\venv\Scripts\python.exe" (
    "%~dp0ai-service\venv\Scripts\python.exe" run.py
) else (
    python run.py
)
pause
