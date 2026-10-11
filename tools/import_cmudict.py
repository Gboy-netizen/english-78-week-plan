"""Import American IPA for this project's words from a CMUdict file.

Usage: python tools/import_cmudict.py path/to/cmudict.dict
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHONES = {
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ",
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "EH": "ɛ", "ER": "ɝ",
    "EY": "eɪ", "F": "f", "G": "ɡ", "HH": "h", "IH": "ɪ", "IY": "i",
    "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ",
    "OW": "oʊ", "OY": "ɔɪ", "P": "p", "R": "r", "S": "s", "SH": "ʃ",
    "T": "t", "TH": "θ", "UH": "ʊ", "UW": "u", "V": "v", "W": "w",
    "Y": "j", "Z": "z", "ZH": "ʒ",
}
VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}
ONSET_CLUSTERS = {"bl", "br", "dr", "dw", "fl", "fr", "ɡl", "ɡr", "kl", "kr", "kw", "pl", "pr", "pj",
                  "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw", "θr", "ʃr", "spr", "str", "skr", "skw"}
MANUAL_US = {"jewellery": "ˈdʒuəlri", "ringtone": "ˈrɪŋˌtoʊn", "webcam": "ˈwɛbˌkæm"}


def to_ipa(arpabet: str) -> str:
    tokens = arpabet.split()
    phones = [re.sub(r"[012]$", "", token) for token in tokens]
    primary_indices = [index for index, token in enumerate(tokens) if token.endswith("1")]
    sounds = []
    marks = {}
    previous_vowel = -1
    for index, (token, phone) in enumerate(zip(tokens, phones)):
        if phone not in PHONES:
            raise ValueError(f"Unknown CMUdict phone: {token}")
        stress = token[-1] if token[-1:].isdigit() else ""
        if stress == "1" and len(primary_indices) > 1 and index != primary_indices[-1]:
            stress = "2"
        sound = "ə" if phone == "AH" and stress == "0" else "ɚ" if phone == "ER" and stress == "0" else PHONES[phone]
        sounds.append(sound)
        if phone in VOWELS:
            if stress in {"1", "2"}:
                onset = previous_vowel + 1
                if previous_vowel >= 0 and onset < index:
                    for candidate in range(onset, index):
                        if "".join(sounds[candidate:index]) in ONSET_CLUSTERS:
                            onset = candidate
                            break
                    else:
                        onset = index - 1
                marks[onset] = "ˈ" if stress == "1" else "ˌ"
            previous_vowel = index
    return "".join(marks.get(index, "") + sound for index, sound in enumerate(sounds))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cmudict", type=Path)
    args = parser.parse_args()
    try:
        wanted = {item["word"] for item in json.loads((ROOT / "data/vocabulary.json").read_text(encoding="utf-8"))}
        with (ROOT / "data/foundation.tsv").open(encoding="utf-8-sig", newline="") as stream:
            wanted.update(row["word"] for row in csv.DictReader(stream, delimiter="\t"))
        wanted.update(json.loads((ROOT / "data/overrides.json").read_text(encoding="utf-8")))
        pronunciations = {}
        with args.cmudict.open(encoding="utf-8") as stream:
            for line in stream:
                if line.startswith(";;;", 0) or " " not in line:
                    continue
                word, arpabet = line.strip().split(" ", 1)
                arpabet = arpabet.split(" #", 1)[0]
                word = re.sub(r"\(\d+\)$", "", word).lower()
                if word in wanted and word not in pronunciations:
                    pronunciations[word] = to_ipa(arpabet)
        pronunciations.update({word: ipa for word, ipa in MANUAL_US.items() if word in wanted})
        destination = ROOT / "data/us_pronunciations.json"
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=destination.parent,
                                         prefix=".us-pronunciations.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(pronunciations, stream, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            stream.write("\n")
        temporary.replace(destination)
        print(f"Imported {len(pronunciations)} American pronunciations for {len(wanted)} words")
        return 0
    except (OSError, ValueError, KeyError, csv.Error, json.JSONDecodeError) as error:
        print(f"CMUdict import failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
