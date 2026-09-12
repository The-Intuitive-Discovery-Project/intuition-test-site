param(
  [string]$Repo = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$stageScript = Join-Path $here 'STAGE-AUDIO-FROM-GOOGLE-DRIVE.ps1'
$audioPath = 'sound-intuition/audio-normalized'

function Run-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  & git -C $Repo @Args
  if ($LASTEXITCODE -ne 0) { throw "git $($Args -join ' ') failed with code $LASTEXITCODE" }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is not installed or is not available in PATH.'
}
if (-not (Test-Path (Join-Path $Repo '.git'))) {
  throw "Repo path is not a Git repository: $Repo"
}
if (-not (Test-Path $stageScript)) {
  throw "Missing staging script: $stageScript"
}

Write-Host 'Sound Intuition finalizer' -ForegroundColor Cyan
Write-Host "Repository: $Repo"

$branch = (& git -C $Repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or -not $branch) { throw 'Could not determine the current Git branch.' }
if ($branch -ne 'main') { throw "Expected branch 'main' but found '$branch'. Switch to main before running this finalizer." }

$trackedChanges = @(& git -C $Repo status --porcelain --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Git working tree.' }
if ($trackedChanges.Count) {
  Write-Warning 'Tracked local changes are present. To avoid overwriting unrelated work, this finalizer will not pull automatically.'
  Write-Host 'Commit/stash those tracked changes first, then run this file again.'
  exit 3
}

Write-Host 'Updating the local clone with the latest GitHub main branch...'
Run-Git fetch origin main
Run-Git pull --ff-only origin main

Write-Host 'Verifying the already-staged normalized audio library...'
& powershell -NoProfile -ExecutionPolicy Bypass -File $stageScript -Repo $Repo
if ($LASTEXITCODE -ne 0) { throw "Sound verification failed with code $LASTEXITCODE" }

$audioFull = Join-Path $Repo $audioPath
if (-not (Test-Path $audioFull -PathType Container)) {
  throw "Verified audio folder was not found at: $audioFull"
}

Write-Host 'Staging only the Sound Intuition normalized audio folder...'
Run-Git add -- $audioPath

& git -C $Repo diff --cached --quiet -- $audioPath
$diffCode = $LASTEXITCODE
if ($diffCode -eq 0) {
  Write-Host 'No new Sound Intuition audio changes need to be committed.' -ForegroundColor Green
} elseif ($diffCode -eq 1) {
  Run-Git commit -m 'Add normalized Sound Intuition audio library' -- $audioPath
} else {
  throw "Could not inspect staged Sound Intuition changes (git diff exit $diffCode)."
}

Write-Host 'Pushing main to GitHub...'
Run-Git push origin main

Write-Host ''
Write-Host 'Sound Intuition audio is verified, committed if needed, and pushed to the test repository.' -ForegroundColor Green
Write-Host 'Next step: open the GitHub Pages Sound Intuition test page and complete the live audio/mobile checklist.'
