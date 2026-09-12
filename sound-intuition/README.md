# Sound Intuition — test build

This folder is intentionally isolated from the existing test-site pages.

## Completed app features
- Real-audio manifest based on the normalized Sound Intuition production library (159 playable entries).
- Random 1–3 component mixes (weighted toward single sounds for learnability).
- Balanced selection using persistent per-sound usage counts.
- Immediate/recent-repeat prevention using a 12-sound recent-history window.
- Category diversity preference inside multi-sound mixes.
- Safe playback scaling on top of the already-normalized source files.
- Extra attenuation for startle level 2/3 clips and multi-sound mixes.
- User volume control with a conservative default.
- “No startling sounds” mode (filters to startle level 1).
- Impressions → lock-in → automatic playback → replay → reveal → next flow.
- Labels remain hidden until reveal.
- Local saved history, completed-round count, settings, recent-use data, and balancing data.
- Responsive/mobile-first interface.
- Stops playback when the page is hidden or left.

## Validation completed
- Latest GitHub test-repository version checked before comparing the Google Drive working copy.
- `app.js` passes JavaScript syntax validation.
- Sound Intuition remains isolated under `/sound-intuition/`; unrelated test pages were not overwritten.
- Manifest paths point to the normalized production library and include the repaired whale entry.
- Google Drive originals/backups and the normalized library remain preserved.
- The manifest verification bug that produced `System.Object[]` in `Join-Path` has been fixed in the current staging script.

## Audio location expected by the app
The normalized library belongs at:

`/sound-intuition/audio-normalized/<category>/<file>.mp3`

The app loads `sounds-01.json` through `sounds-08.json` and uses each entry’s `production_file` path.

## Current source-library status
- 159 normalized production entries are included across the eight manifest parts.
- The repaired whale source is normalized and included in the current manifest.
- Google Drive contains 160 normalized files because one legacy whale file is intentionally preserved but not referenced by the production manifests.
- 6 source downloads still fail with HTTP 403 and are intentionally absent from this production manifest: gentle-rain, morning-birds, fireworks, hail, thunderstorm, geiger-counter.
- Originals in Google Drive remain untouched.

## Current staging status
A local staging run successfully copied all 160 normalized files into the local GitHub test clone (about 31 MB, 0 robocopy failures). That run then stopped during the old manifest-verification step before the audio folder was committed or pushed.

The current `STAGE-AUDIO-FROM-GOOGLE-DRIVE.ps1` fixes that verification problem by flattening the manifest arrays, converting each `production_file` to a single string, using literal-path verification, and skipping unnecessary recopy when files are already present.

`FINISH-SOUND-INTUITION.bat` / `.ps1` are provided for the final local step. They update the clone safely, verify the already-staged files, stage only `sound-intuition/audio-normalized`, commit it if needed, and push `main`. They stop if unrelated tracked local changes are present.

## Remaining live-test blocker
The normalized binary audio folder is staged in Hunter’s local clone but is not yet in the GitHub repository. GitHub Pages therefore cannot complete real listening/mobile tests until that already-staged folder is verified and pushed.

From the already-staged local clone, double-click:

`sound-intuition\FINISH-SOUND-INTUITION.bat`

The finalizer should verify the 159 manifest-referenced files, report the one intentionally unreferenced legacy whale file as informational, commit the audio folder if necessary, and push it to the test repository without touching unrelated pages.

## Testing checklist after audio push
1. Open `/sound-intuition/` on the GitHub Pages test site.
2. Enter impressions and lock them in; sound should autoplay from the click gesture.
3. Test Play Again and Reveal.
4. Run at least 20 rounds and confirm no immediate sound repeats.
5. Toggle No startling sounds and confirm startle levels 2/3 never appear.
6. Test 1-, 2-, and 3-sound rounds with headphones and phone speaker.
7. Confirm changing volume affects active playback without clipping.
8. Refresh and confirm history/settings persist.
9. Check Android Chrome and another mobile browser.

Do not move this into the main `intuition.tinythor.cc` production repo until audio staging and listening tests pass.
