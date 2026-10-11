"""One-time, explicit import of the existing plan and locally cached dictionaries."""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DICTIONARIES = [
    "IELTS_XDF_7000.json", "IELTS_3_T.json", "IELTSVocabularyBible.json",
    "Oxford5000.json", "CET6_T.json", "CET4_T.json", "top2000words.json",
    "Longman_Communication_3000.json", "4000_Essential_English_Words-meaning.json",
]


def read_json(path):
    with path.open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def import_data(dict_dir):
    with (ROOT / "教案素材/02-7000分级词表.csv").open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    reference = (ROOT / "教案素材/05-不雅词识别参考.md").read_text(encoding="utf-8")
    excluded = sorted(set(re.findall(r"^\| ([a-z]+) \|", reference, re.M)) | {"shit", "pissing", "bitch"})
    words = {row["单词"] for row in rows} - set(excluded)
    entries = {}
    for filename in DICTIONARIES:
        for entry in read_json(dict_dir / filename):
            word = str(entry.get("word", "")).strip().lower()
            if word not in words or word in entries:
                continue
            meanings = [str(t.get("pos", "")).strip() + " " + str(t.get("cn", "")).strip()
                        for t in entry.get("trans", []) if t.get("cn")]
            sentences = [s for s in entry.get("sentences", []) if s.get("c")]
            example = min(sentences, key=lambda s: len(s["c"])) if sentences else {}
            if meanings:
                entries[word] = {
                    "phonetic": str(entry.get("phonetic0") or entry.get("phonetic1") or "").strip().strip("/"),
                    "meaning": "；".join(m.strip() for m in meanings[:3]),
                    "example": str(example.get("c", "")), "translation": str(example.get("cn", "")),
                    "source": filename, "quality": "exact",
                }
    vocabulary = []
    for row in rows:
        word = row["单词"]
        if word in excluded:
            continue
        vocabulary.append({"word": word, "rank": int(row["词频排名"]),
                           "stage": row["阶段"], "range": row["周区间"],
                           **entries.get(word, {"phonetic": "", "meaning": "释义待核实，不计入核心练习",
                                                "example": "", "translation": "", "source": "", "quality": "unverified"})})
    source = (ROOT / "教案素材/_embed-today.js").read_text(encoding="utf-8")
    phon_start = re.search(r"var PHON\s*=\s*", source).end()
    phonetics, _ = json.JSONDecoder().raw_decode(source[phon_start:])
    write_json("vocabulary.json", vocabulary)
    write_json("phonetics.json", phonetics)
    write_json("excluded.json", excluded)
    print(f"Imported {len(vocabulary)} words; {len(entries)} exact matches; {len(excluded)} exclusions.")


def write_json(name, value):
    directory = ROOT / "data"
    directory.mkdir(exist_ok=True)
    with (directory / name).open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dict-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        if (ROOT / "data/vocabulary.json").exists():
            raise ValueError("data/vocabulary.json already exists; import will not overwrite it")
        import_data(args.dict_dir)
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f"Legacy import failed: {error}", file=sys.stderr)
        sys.exit(1)
