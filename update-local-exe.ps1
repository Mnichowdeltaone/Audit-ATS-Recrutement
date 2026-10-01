$ErrorActionPreference = "Stop"

function Step($text) {
  Write-Host ""
  Write-Host "=== $text ===" -ForegroundColor Cyan
}

$appName = "Audit ATS Recrutement.exe"
$exePath = ".\dist\win-unpacked\Audit ATS Recrutement.exe"

Step "Verification du dossier Git"

if (-not (Test-Path ".git")) {
  throw "Ce dossier n'est pas un depot Git."
}

$status = git status --porcelain

if ($status) {
  Write-Host "STOP : il y a des modifications locales non sauvegardees." -ForegroundColor Yellow
  git status --short
  Write-Host ""
  Write-Host "Fais d'abord : git add . ; git commit -m ""Sauvegarde locale"""
  exit 1
}

Step "Fermeture de l'application"

taskkill /F /IM $appName 2>$null | Out-Null
taskkill /F /IM "electron.exe" 2>$null | Out-Null

Step "Recuperation des mises a jour GitHub"

git pull --ff-only

Step "Installation des dependances"

npm.cmd install

Step "Suppression de l'ancien build"

if (Test-Path ".\dist") {
  cmd /c rmdir /s /q dist
}

Step "Reconstruction de l'executable"

npm.cmd run build-exe

Step "Lancement de l'application"

if (-not (Test-Path $exePath)) {
  throw "Executable introuvable : $exePath"
}

Start-Process $exePath

Write-Host ""
Write-Host "Mise a jour terminee avec succes." -ForegroundColor Green