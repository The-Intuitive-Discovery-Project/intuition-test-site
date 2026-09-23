#!/usr/bin/env python3
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CANONICAL = ROOT / "targets-curated.json"
ORIGINAL = ROOT / "targets-original-32.json"
AUDIT = ROOT / "targets-audit.json"
EXPECTED = 200


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def norm(value):
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def target_key(t):
    # Exact-place duplicate control. Deliberately keys on the target name, not city,
    # because multiple distinct real sites can share a city (e.g. Rome or London).
    aliases = {
        "new york central station grand central terminal": "grand central terminal",
        "grand central terminal": "grand central terminal",
        "uluru ayers rock": "uluru",
        "uluru": "uluru",
        "niagara falls": "niagara falls",
    }
    n = norm(t.get("name", ""))
    return aliases.get(n, n)


def require(cond, message, errors):
    if not cond:
        errors.append(message)


def validate_target(t, idx, errors):
    pfx = f"target[{idx}] {t.get('name', '<unnamed>')}: "
    for field in ("id", "name", "place", "source", "sourceUrl", "originalRef", "cue"):
        require(bool(str(t.get(field, "")).strip()), pfx + f"missing {field}", errors)
    require(str(t.get("id", "")).startswith("RV-"), pfx + "id must start RV-", errors)
    require(str(t.get("sourceUrl", "")).startswith("http"), pfx + "sourceUrl must be http(s)", errors)
    fb = t.get("feedback") or {}
    for field in ("imageUrl", "filePage", "fileTitle", "credit", "license", "licenseUrl", "note"):
        require(bool(str(fb.get(field, "")).strip()), pfx + f"missing feedback.{field}", errors)
    require("commons.wikimedia.org/wiki/Special:FilePath/" in str(fb.get("imageUrl", "")), pfx + "feedback.imageUrl must use Wikimedia Commons Special:FilePath", errors)
    require(str(fb.get("filePage", "")).startswith("https://commons.wikimedia.org/wiki/File:"), pfx + "feedback.filePage must be a Wikimedia Commons file page", errors)
    lic = str(fb.get("license", "")).strip().lower()
    require(lic.startswith("cc") or lic.startswith("public domain"), pfx + f"license is not explicit CC/public-domain metadata: {fb.get('license')}", errors)
    require(str(fb.get("licenseUrl", "")).startswith("http"), pfx + "feedback.licenseUrl must be http(s)", errors)


def main():
    if ORIGINAL.exists():
        base = load_json(ORIGINAL)
        if len(base) != 32:
            raise SystemExit(f"Original snapshot must contain 32 targets; found {len(base)}")
    else:
        base = load_json(CANONICAL)
        if len(base) != 32:
            raise SystemExit(
                "Cannot create the protected original snapshot because targets-curated.json "
                f"contains {len(base)} records instead of the expected 32."
            )
        write_json(ORIGINAL, base)

    batch_files = sorted(ROOT.glob("targets-new-curated*.json"))
    if not batch_files:
        raise SystemExit("No curated expansion batch files found.")

    combined = list(base)
    batch_counts = {}
    for path in batch_files:
        rows = load_json(path)
        if not isinstance(rows, list):
            raise SystemExit(f"{path.name} must contain a JSON array")
        batch_counts[path.name] = len(rows)
        combined.extend(rows)

    errors = []
    for i, target in enumerate(combined):
        validate_target(target, i, errors)

    # Preserve first occurrence so the original 32 always win if a later pool repeats one.
    final = []
    seen_location = {}
    removed_duplicates = []
    for target in combined:
        key = target_key(target)
        if key in seen_location:
            removed_duplicates.append({
                "name": target.get("name"),
                "id": target.get("id"),
                "kept": seen_location[key].get("name"),
                "keptId": seen_location[key].get("id"),
                "reason": "same normalized physical target name",
            })
            continue
        seen_location[key] = target
        final.append(target)

    ids = [t["id"] for t in final]
    pages = [t["feedback"]["filePage"] for t in final]
    require(len(ids) == len(set(ids)), "duplicate target IDs remain after location dedupe", errors)
    require(len(pages) == len(set(pages)), "duplicate Wikimedia Commons file pages remain", errors)
    require(len(final) == EXPECTED, f"final bank must contain exactly {EXPECTED} unique targets; found {len(final)} (raw {len(combined)}, removed {len(removed_duplicates)})", errors)

    if errors:
        print("REMOTE VIEWING TARGET BANK AUDIT FAILED")
        for e in errors:
            print(" -", e)
        raise SystemExit(1)

    source_counts = Counter(t["source"] for t in final)
    license_counts = Counter(t["feedback"]["license"] for t in final)
    audit = {
        "status": "passed",
        "expectedCount": EXPECTED,
        "rawCount": len(combined),
        "finalCount": len(final),
        "originalCount": len(base),
        "batchFileCount": len(batch_files),
        "batchCounts": batch_counts,
        "removedDuplicates": removed_duplicates,
        "uniqueIds": len(set(ids)),
        "uniquePhotoFilePages": len(set(pages)),
        "sourceCounts": dict(sorted(source_counts.items())),
        "licenseCounts": dict(sorted(license_counts.items())),
    }
    write_json(CANONICAL, final)
    write_json(AUDIT, audit)
    print(f"PASS: built {len(final)} unique curated targets from {len(combined)} raw records.")
    if removed_duplicates:
        print("Removed duplicates:")
        for d in removed_duplicates:
            print(f" - {d['name']} ({d['id']}) -> kept {d['kept']} ({d['keptId']})")


if __name__ == "__main__":
    main()
