"""Build a UK IPA lookup from the existing lexicon and ipa-dict en_UK.txt.

Usage: python tools/import_uk_ipa.py path/to/en_UK.txt
The source file is from open-dict-data/ipa-dict (UK data derived from ipacards,
GPL-3.0); see SOURCES.md. The generated lookup is committed, not the full source.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def clean_ipa(value: str) -> str:
    parts = [part.strip().strip("/") for part in value.replace(";", ",").split(",")]
    return " · ".join(f"/{part}/" for part in parts if part)


def main(path: Path) -> None:
    raw = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if "\t" in line:
            word, ipa = line.split("\t", 1)
            raw[word.lower()] = ipa
    vocabulary = json.loads((ROOT / "data/vocabulary.json").read_text(encoding="utf-8"))
    overrides = json.loads((ROOT / "data/uk_overrides.json").read_text(encoding="utf-8"))
    selected = {}
    for entry in vocabulary:
        word = entry["word"]
        if word in overrides:
            selected[word] = {"ipa": clean_ipa(overrides[word]), "source": "curated"}
        elif entry.get("phonetic"):
            selected[word] = {"ipa": clean_ipa(entry["phonetic"]), "source": "TypeWords"}
        elif word in raw:
            selected[word] = {"ipa": clean_ipa(raw[word]), "source": "ipa-dict/en_UK"}
    foundation = (ROOT / "data/foundation.tsv").read_text(encoding="utf-8-sig").splitlines()[1:]
    for line in foundation:
        word = line.split("\t", 1)[0]
        if word in overrides:
            selected[word] = {"ipa": clean_ipa(overrides[word]), "source": "curated"}
        elif word not in selected and word in raw:
            selected[word] = {"ipa": clean_ipa(raw[word]), "source": "ipa-dict/en_UK"}
    target = ROOT / "data/uk_pronunciations.json"
    target.write_text(json.dumps(selected, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"OK: {len(selected)} UK IPA entries; {len(vocabulary) - len(selected)} dictionary words unverified")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/import_uk_ipa.py path/to/en_UK.txt")
    main(Path(sys.argv[1]))
