param(
  [string]$Source = "",
  [string]$Repo = ""
)
$ErrorActionPreference = 'Stop'

function Find-SoundSource {
  param([string]$Explicit)
  if ($Explicit -and (Test-Path $Explicit)) { return (Resolve-Path $Explicit).Path }
  $roots = @(
    "$env:USERPROFILE\My Drive",
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\GoogleDrive",
    "G:\My Drive",
    "G:\Shared drives"
  ) | Where-Object { Test-Path $_ }
  foreach ($root in $roots) {
    $hit = Get-ChildItem -Path $root -Directory -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq 'audio-normalized' -and $_.Parent.Name -eq 'Sound Intuition - Working Library' } |
      Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  throw 'Could not find Sound Intuition - Working Library\audio-normalized. Supply -Source with its full path.'
}

if (-not $Repo) { $Repo = Split-Path -Parent $PSScriptRoot }
$sourcePath = Find-SoundSource $Source
$dest = Join-Path $PSScriptRoot 'audio-normalized'
Write-Host "Source: $sourcePath"
Write-Host "Destination: $dest"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
robocopy $sourcePath $dest /E /COPY:DAT /DCOPY:T /R:2 /W:2 /NFL /NDL
$rc = $LASTEXITCODE
if ($rc -ge 8) { throw "Robocopy failed with code $rc" }
$manifestFiles = Get-ChildItem -Path $PSScriptRoot -Filter 'sounds-??.json' | Sort-Object Name
if (-not $manifestFiles) { throw 'Sound manifest parts are missing from the Sound Intuition folder.' }
$expected = @()
foreach ($manifestFile in $manifestFiles) { $expected += @(Get-Content $manifestFile.FullName -Raw | ConvertFrom-Json) }
$missing = @()
foreach ($s in $expected) {
  $relative = $s.production_file -replace '^audio-normalized/', ''
  if (-not (Test-Path (Join-Path $PSScriptRoot $s.production_file))) { $missing += $relative }
}
if ($missing.Count) {
  Write-Warning "$($missing.Count) manifest audio files are still missing."
  $missing | ForEach-Object { Write-Host "  MISSING: $_" }
  exit 2
}
Write-Host "Audio staging complete: $($expected.Count) manifest files present." -ForegroundColor Green
Write-Host 'Next: git add sound-intuition/audio-normalized && git commit/push to the intuition-test-site repository.'
