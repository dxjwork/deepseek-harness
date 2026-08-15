# Create a Windows desktop shortcut that launches the built DeepSeek Harness
# desktop shell (no rebuild). Run: pwsh -File apps/desktop/scripts/create-shortcut.ps1
$ErrorActionPreference = 'Stop'

$desktopDir = Split-Path -Parent $PSScriptRoot            # apps/desktop/
$electronExe = Join-Path $desktopDir 'node_modules\electron\dist\electron.exe'
$iconPath = Join-Path $desktopDir 'assets\icon.ico'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'DeepSeek Harness.lnk'

if (-not (Test-Path $electronExe)) {
  throw "electron.exe not found at $electronExe — run `pnpm install` from the repository root first"
}
if (-not (Test-Path $iconPath)) {
  throw "icon not found at $iconPath — generate it from apps/web/public/favicon.svg first"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronExe
# A bare electron.exe with no argument runs Electron's default app, so pass the
# app directory explicitly (equivalent to `electron <app-dir>`). Quoted so a
# checkout path containing spaces still resolves.
$shortcut.Arguments = '"' + $desktopDir + '"'
$shortcut.WorkingDirectory = $desktopDir
$shortcut.Description = 'DeepSeek Harness'
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Save()

Write-Host "Created shortcut: $shortcutPath"
