# Script to forcibly kill any processes on ports 8001, 5010, and 3010
$targetPorts = @(8001, 5010, 3010)

Write-Host "Checking if ports $($targetPorts -join ', ') are in use..." -ForegroundColor Cyan

foreach ($port in $targetPorts) {
    $killed = $false

    # Use netstat + taskkill (most reliable, works without admin for own processes)
    try {
        $netstatOutput = netstat -ano 2>$null
        $matches = $netstatOutput | Select-String "\s+$port\s+.*LISTENING" 
        foreach ($match in $matches) {
            $parts = ($match.Line.Trim() -split '\s+')
            $procId = $parts[-1]
            if ($procId -match '^\d+$' -and [int]$procId -gt 0) {
                Write-Host "  [!] Port $port is in use by PID $procId. Terminating..." -ForegroundColor Yellow
                taskkill /F /PID $procId 2>$null | Out-Null
                $killed = $true
            }
        }
    } catch {
        # Ignore
    }

    # Also try Get-NetTCPConnection as backup
    if (-not $killed) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connections) {
                foreach ($conn in $connections) {
                    $procId = $conn.OwningProcess
                    if ($procId -gt 0) {
                        Write-Host "  [!] Port $port is in use by PID $procId. Terminating..." -ForegroundColor Yellow
                        taskkill /F /PID $procId 2>$null | Out-Null
                        $killed = $true
                    }
                }
            }
        } catch {
            # Ignore
        }
    }

    if (-not $killed) {
        Write-Host "  [OK] Port $port is available." -ForegroundColor Green
    }
}

# Wait a moment for OS to release ports
Start-Sleep -Milliseconds 1000
Write-Host "Port preparation complete." -ForegroundColor Green
