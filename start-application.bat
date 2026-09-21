@echo off
TITLE PaperGen AI - Application Launcher
COLOR 0B

echo ==============================================================================
echo                      PaperGen AI - Offline Application
echo      Document Intelligence, Question Bank, Canvas Designer ^& OMR Suite
echo ==============================================================================
echo.

SET ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

REM ── Step 0: Force-kill ALL stale Python/Node processes on required ports ──────
echo [Step 0/3] Stopping any old service instances on ports 8001, 5010, 3010...

REM Kill by port using netstat (most reliable cross-session method)
for %%P in (8001 5010 3010) do (
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr /R ":%%P .*LISTENING"') do (
        if not "%%A"=="0" (
            echo   [!] Killing PID %%A on port %%P...
            taskkill /F /PID %%A >nul 2>&1
        )
    )
)

REM Also kill any orphaned uvicorn/python processes running our AI service
taskkill /F /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq AI Engine*" >nul 2>&1

REM Wait for ports to fully release
timeout /t 2 /nobreak >nul
echo   [OK] All ports cleared.
echo.

REM ── Step 1: AI Microservice (FastAPI / Python) on port 8001 ─────────────────
echo [1/3] Starting Python AI Engine on Port 8001...
start "AI Engine (Port 8001)" cmd /k "title AI Engine (Port 8001) && cd /d "%ROOT_DIR%" && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && python_env\python.exe -m uvicorn ai_service.app.main:app --host 127.0.0.1 --port 8001"

REM ── Step 2: Node.js / Prisma Backend on port 5010 ───────────────────────────
echo [2/3] Starting Node.js Backend Server on Port 5010...
start "Backend Server (Port 5010)" cmd /k "title Backend Server (Port 5010) && cd /d "%ROOT_DIR%server" && npm run dev"

REM ── Wait for BOTH backend services (8001 + 5010) ────────────────────────────
echo.
echo Waiting for backend services to come online (max 90s each)...
echo.

REM Give Python a head-start loading imports before we begin polling
timeout /t 6 /nobreak >nul

REM Wait for AI Engine on port 8001
echo   Waiting for AI Engine (port 8001)...
powershell -ExecutionPolicy Bypass -Command ^
  "$max=90; $ok=$false; for($i=0;$i -lt $max;$i++){ try{ $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8001/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if($r.StatusCode -eq 200){ Write-Host '  [OK] AI Engine is ready!' -ForegroundColor Green; $ok=$true; break } }catch{ Start-Sleep -Seconds 1 } }; if(-not $ok){ Write-Host '  [WARN] AI Engine did not respond in 90s - starting frontend anyway.' -ForegroundColor Yellow }"

REM Wait for Backend Server on port 5010
echo   Waiting for Backend Server (port 5010)...
powershell -ExecutionPolicy Bypass -Command ^
  "$max=90; $ok=$false; for($i=0;$i -lt $max;$i++){ try{ $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5010/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if($r.StatusCode -eq 200){ Write-Host '  [OK] Backend Server is ready!' -ForegroundColor Green; $ok=$true; break } }catch{ Start-Sleep -Seconds 1 } }; if(-not $ok){ Write-Host '  [WARN] Backend did not respond in 90s - starting frontend anyway.' -ForegroundColor Yellow }"

echo.

REM ── Step 3: React + Vite Frontend on port 3010 ──────────────────────────────
echo [3/3] Starting React + Vite Frontend Client on Port 3010...
start "Frontend Client (Port 3010)" cmd /k "title Frontend Client (Port 3010) && cd /d "%ROOT_DIR%client" && npm run dev -- --port 3010 --strictPort"

REM Wait for Vite frontend to be ready
echo   Waiting for Frontend (port 3010)...
powershell -ExecutionPolicy Bypass -Command ^
  "$max=60; $ok=$false; for($i=0;$i -lt $max;$i++){ try{ $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3010' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; if($r.StatusCode -lt 500){ Write-Host '  [OK] Frontend is ready!' -ForegroundColor Green; $ok=$true; break } }catch{ Start-Sleep -Seconds 1 } }; if(-not $ok){ Write-Host '  [WARN] Frontend did not respond in 60s.' -ForegroundColor Yellow }"

echo.
echo ==============================================================================
echo   All services launched!
echo.
echo   Service            URL                     Status
echo   Backend API        http://localhost:5010    Ready
echo   AI Vision Engine   http://localhost:8001    Ready
echo   Frontend Web UI    http://localhost:3010    Ready
echo.
echo   Default Administrator Credentials:
echo     Email:    admin@school.local
echo     Password: Admin@12345
echo ==============================================================================
echo.
echo Opening application in your default browser...
start http://localhost:3010
echo.
echo All 3 service windows are running independently.
echo Close this window or press any key to exit this launcher.
echo (The services will keep running in their own windows.)
pause >nul
