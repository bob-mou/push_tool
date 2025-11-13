# PowerShell script to clean build artifacts and release file locks
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow

# Kill any running Electron or Node processes
Write-Host "Stopping running processes..." -ForegroundColor Gray
taskkill /F /IM electron.exe 2>$null
taskkill /F /IM node.exe 2>$null
taskkill /F /IM app-builder.exe 2>$null

# Wait a moment for processes to release files
Start-Sleep -Seconds 2

# Remove build directories with multiple attempts
$dirs = @("dist", "build", "dist-electron", "node_modules\.cache")

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir..." -ForegroundColor Gray
        $attempts = 0
        $maxAttempts = 3
        
        while ($attempts -lt $maxAttempts) {
            try {
                Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
                Write-Host "✓ Successfully removed $dir" -ForegroundColor Green
                break
            }
            catch {
                $attempts++
                Write-Host "Attempt $attempts failed: $($_.Exception.Message)" -ForegroundColor Red
                if ($attempts -lt $maxAttempts) {
                    Write-Host "Retrying in 2 seconds..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 2
                } else {
                    Write-Host "⚠ Could not remove $dir after $maxAttempts attempts" -ForegroundColor Red
                }
            }
        }
    }
}

# Clear temporary files
Write-Host "Cleaning temporary files..." -ForegroundColor Gray
Remove-Item -Path "$env:TEMP\electron-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\app-builder-*" -Force -ErrorAction SilentlyContinue

Write-Host "✓ Cleanup completed!" -ForegroundColor Green