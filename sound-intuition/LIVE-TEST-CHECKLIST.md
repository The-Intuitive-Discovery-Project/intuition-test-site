# Sound Intuition — live test checklist

Use this only after `audio-normalized/` has been verified and pushed to the test repository.

## Basic playback
- Open `/sound-intuition/` on the GitHub Pages test site.
- Confirm the library count shows 159.
- Enter an impression and press **Lock In My Impressions**.
- Confirm audio begins from that user interaction.
- Confirm impressions cannot be edited after lock-in.
- Confirm **No startling sounds** cannot be changed during an active locked round.
- Confirm **Play Again** replays the same hidden target.
- Confirm **Reveal** stops playback and only then shows the target label(s).
- Confirm **Next Sound** completely resets the round.

## Selection behavior
- Complete at least 20 rounds.
- Confirm broad variety and no obvious immediate/recent repeats.
- Confirm 1-, 2-, and 3-sound rounds occur over a longer run.
- Confirm multi-sound rounds play simultaneously and remain comfortable in volume.
- Turn on **No startling sounds** and confirm no startle-level 2/3 target is revealed.

## Persistence
- Change volume and gentle-mode preference, then refresh.
- Confirm settings persist.
- Complete and reveal several rounds, refresh, and confirm History persists.
- Confirm completed-round count persists.
- Clear History and confirm the history/count reset without damaging settings.

## Mobile
- Test Android Chrome.
- Test one additional mobile browser if available.
- Confirm buttons remain easy to tap and no horizontal scrolling occurs.
- Confirm the history dialog opens, scrolls, and closes normally.
- Confirm leaving/hiding the page stops playback.
- Test phone speaker and headphones at a conservative starting volume.

## Privacy / reveal integrity
- Before Reveal, confirm no target names appear in visible text.
- Confirm no target name is exposed by the normal interface while listening.
- Confirm the app never assigns subjective hit/miss scores.

## Pass condition
Sound Intuition is ready to consider for the production site only after the real audio loads reliably and the above checks pass without a significant playback, selection, reveal, persistence, or mobile problem.
