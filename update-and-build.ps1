Write-Host "1. Fermeture forcee des processus..." -ForegroundColor Yellow
Stop-Process -Name "Audit ATS Recrutement", "electron", "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "2. Nettoyage du dossier dist..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
}

Write-Host "3. Execution du build..." -ForegroundColor Yellow
npm run build-exe

if (Test-Path "dist\win-unpacked\Audit ATS Recrutement.exe") {
    Write-Host "--- SUCCES ! L'executable est pret dans dist\win-unpacked ---" -ForegroundColor Green
} else {
    Write-Host "--- ERREUR : La compilation a echoue ---" -ForegroundColor Red
}