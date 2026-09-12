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

function Get-ManifestEntries {
  param([System.IO.FileInfo[]]$ManifestFiles)
  $items = [System.Collections.Generic.List[object]]::new()
  foreach ($manifestFile in $ManifestFiles) {
    $parsed = Get-Content $manifestFile.FullName -Raw | ConvertFrom-Json
    if ($null -eq $parsed) { continue }
    foreach ($entry in $parsed) {
      if ($null -ne $entry) { [void]$items.Add($entry) }
    }
  }
  return $items.ToArray()
}

function Test-ManifestAudio {
  param(
    [object[]]$Entries,
    [string]$SoundDir
  )
  $missing = [System.Collections.Generic.List[string]]::new()
  foreach ($s in $Entries) {
    $productionFile = [string]$s.production_file
    if ([string]::IsNullOrWhiteSpace($productionFile)) { continue }
    $target = Join-Path -Path $SoundDir -ChildPath $productionFile
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
      [void]$missing.Add($productionFile)
    }
  }
  return $missing.ToArray()
}

if (-not $Repo) { $Repo = Split-Path -Parent $PSScriptRoot }
$sourcePath = Find-SoundSource $Source
$dest = Join-Path $PSScriptRoot 'audio-normalized'
$manifestFiles = Get-ChildItem -Path $PSScriptRoot -Filter 'sounds-??.json' -File | Sort-Object Name
if (-not $manifestFiles) { throw 'Sound manifest parts are missing from the Sound Intuition folder.' }

$expected = @(Get-ManifestEntries -ManifestFiles $manifestFiles)
if (-not $expected.Count) { throw 'The Sound Intuition manifests contain no entries.' }

Write-Host "Source: $sourcePath"
Write-Host "Destination: $dest"
Write-Host "Manifest entries: $($expected.Count)"

$missingBefore = @(Test-ManifestAudio -Entries $expected -SoundDir $PSScriptRoot)
if ($missingBefore.Count -eq 0) {
  Write-Host 'All manifest-referenced audio is already staged. Skipping audio copy.' -ForegroundColor Green
} else {
  Write-Host "$($missingBefore.Count) referenced files are not staged yet. Copying only missing/changed files with robocopy..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  robocopy $sourcePath $dest /E /COPY:DAT /DCOPY:T /R:2 /W:2 /NFL /NDL
  $rc = $LASTEXITCODE
  if ($rc -ge 8) { throw "Robocopy failed with code $rc" }
}

$missing = @(Test-ManifestAudio -Entries $expected -SoundDir $PSScriptRoot)
if ($missing.Count) {
  Write-Warning "$($missing.Count) manifest audio files are still missing."
  $missing | ForEach-Object { Write-Host "  MISSING: $_" }
  exit 2
}

$expectedSet = @{}
foreach ($s in $expected) {
  $productionFile = [string]$s.production_file
  if (-not [string]::IsNullOrWhiteSpace($productionFile)) {
    $expectedSet[$productionFile.Replace('\\','/')] = $true
  }
}

$extra = @()
if (Test-Path $dest) {
  $extra = @(Get-ChildItem -Path $dest -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($PSScriptRoot.Length).TrimStart('\\','/').Replace('\\','/')
    if (-not $expectedSet.ContainsKey($relative)) { $relative }
  })
}

Write-Host "Audio verification complete: $($expected.Count) manifest-referenced files are present." -ForegroundColor Green
if ($extra.Count) {
  Write-Host "$($extra.Count) staged audio file(s) are not referenced by the production manifests. This is informational, not an error:" -ForegroundColor Yellow
  $extra | ForEach-Object { Write-Host "  UNREFERENCED: $_" }
} else {
  Write-Host 'No unreferenced staged audio files were found.'
}
Write-Host 'Next: git add sound-intuition/audio-normalized sound-intuition/STAGE-AUDIO-FROM-GOOGLE-DRIVE.ps1 && git commit/push to the intuition-test-site repository.'
