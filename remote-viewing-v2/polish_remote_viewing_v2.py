#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "index.html"
text = path.read_text(encoding="utf-8")

replacements = {
    "The full 50-target inventory is preserved separately. Targets stay out of the active draw until one primary feedback image and its license/source information have been curated.":
        "The complete 200-target bank is curated and active. Every target has one fixed primary Wikimedia Commons feedback image plus recorded photo credit, license, original target reference, and remote-viewing source.",
    '<strong id="pendingCardCount">50</strong><span class="fine">preserved and waiting for photo curation</span>':
        '<strong id="pendingCardCount">0</strong><span class="fine">remaining uncurated targets</span>',
    "TOTAL_INVENTORY=50;let TARGETS=[];":
        "TOTAL_INVENTORY=200;let TARGETS=[];",
    "if(!Array.isArray(TARGETS)||!TARGETS.length)throw new Error('Empty target bank');":
        "if(!Array.isArray(TARGETS)||TARGETS.length!==TOTAL_INVENTORY)throw new Error('Target bank count mismatch: '+(Array.isArray(TARGETS)?TARGETS.length:'invalid'));",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"Expected index.html text not found: {old[:100]}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8", newline="\n")
print("PASS: Remote Viewing V2 page polished for the audited 200-target bank.")
