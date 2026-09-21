Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  Starting PaperGen AI Offline Platform Suite             " -ForegroundColor Cyan
Write-Host "  Low-Hardware Profile: i3 / 8GB RAM / 4GB VRAM Cap       " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 0. Free ports if in use
& "$PSScriptRoot\free_ports.ps1"

# 1. Start Python AI Microservice (Port 8001)
Write-Host "[1/3] Launching Python Document AI & Vision Microservice on port 8001..." -ForegroundColor Yellow
$aiProcess = Start-Process -FilePath "$PSScriptRoot\python_env\python.exe" -ArgumentList "-m", "uvicorn", "ai_service.app.main:app", "--host", "127.0.0.1", "--port", "8001" -PassThru -NoNewWindow

# 2. Start Node.js / Prisma Backend API (Port 5010)
Write-Host "[2/3] Launching Node.js / Prisma Backend Server on port 5010..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\server" -PassThru -NoNewWindow

Write-Host "Waiting for backend services to initialize..." -ForegroundColor Yellow
for ($i = 0; $i -lt 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:5010/health" -TimeoutSec 1 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "  -> Backend is ready!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Milliseconds 800
    }
}

# 3. Start React + Vite Client (Port 3010)
Write-Host "[3/3] Launching React Vite Web Application on http://localhost:3010..." -ForegroundColor Green
$clientProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\client" -PassThru -NoNewWindow

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  PaperGen AI is now running offline!                      " -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:3010                         " -ForegroundColor Green
Write-Host "  Backend:   http://localhost:5010                         " -ForegroundColor Green
Write-Host "  AI Engine: http://localhost:8001                         " -ForegroundColor Green
Write-Host "  Login:     admin@school.local / Admin@12345              " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
