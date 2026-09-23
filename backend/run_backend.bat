@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =======================================================
echo Starting GeM Core Backend (Spring Boot + Drools)
echo Port: 8080 | Java: 21
echo =======================================================

if exist "%~dp0.tools\jdk-21\bin\java.exe" (
    set "JAVA_HOME=%~dp0.tools\jdk-21"
    set "PATH=%~dp0.tools\jdk-21\bin;%PATH%"
)

REM Use maven wrapper or powershell to run
powershell -ExecutionPolicy Bypass -File .\run_backend.ps1
pause
