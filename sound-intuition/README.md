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

## Audio location expected by the app
Copy the normalized library into:

`/sound-intuition/audio-normalized/<category>/<file>.mp3`

The app loads `sounds-01.json` through `sounds-08.json` and uses each entry’s `production_file` path.

## Current source-library status
- 159 normalized production entries are included across the eight manifest parts.
- The repaired whale source is normalized and included in the current manifest.
- 6 source downloads still fail with HTTP 403 and are intentionally absent from this production manifest: gentle-rain, morning-birds, fireworks, hail, thunderstorm, geiger-counter.
- Originals in Google Drive remain untouched.

## Only remaining live-test blocker
The normalized binary audio folder is still in Google Drive and is not yet present in this GitHub repository. Until it is staged, GitHub Pages can load the interface and manifests but cannot play the real sound files.

From a local clone with Google Drive Desktop available, run:

`sound-intuition\STAGE-AUDIO-FROM-GOOGLE-DRIVE.bat`

The helper copies rather than moves the normalized files, verifies every manifest path, and preserves the Drive originals.

## Testing checklist after audio staging
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
