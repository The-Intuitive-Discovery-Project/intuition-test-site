# Remote Viewing 101 - Storage Plan

## Private test build

The current test build uses a local target list in the page and browser localStorage for session count/history. It is only for testing the teaching flow and UI. The target mapping is therefore not secure against someone inspecting source code.

The handwritten worksheet, sketches, impressions, AOL notes, and raw summaries are never uploaded by the test build.

## Production target storage

Use Cloudflare R2 for:
- target photographs
- printable worksheet PDF
- any future class-download assets

Use D1 for:
- blind target ID
- R2 object key for the hidden target
- target category/difficulty
- active/inactive flag
- optional used/repeat-control metadata
- optional minimal anonymous session metadata

Use a Cloudflare Worker as the only public target API. The browser should never receive the R2 object key or image URL before reveal.

Suggested flow:
1. POST /api/rv/session/start -> creates or selects a target server-side and returns only a session token plus settling start time.
2. After the five-minute minimum, GET /api/rv/session/:token/id -> returns only the blind target ID.
3. User works on the printed worksheet offline.
4. POST /api/rv/session/:token/finish -> marks the session revealable.
5. GET /api/rv/session/:token/reveal -> Worker streams or signs access to the R2 target image.
6. Optional POST /api/rv/session/:token/rating -> stores strong / partial / miss only.

## Privacy rule

Do not require storage of handwritten impressions, drawings, AOL notes, or worksheet scans. Those remain offline unless a user explicitly chooses otherwise in a future feature.

## Practice philosophy

After the third completed session in a local day, show one gentle break suggestion. Do not lock the user out. The user remains free to continue practicing.
