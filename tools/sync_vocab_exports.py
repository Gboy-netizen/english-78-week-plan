"""Regenerate the human-facing word-list exports from the local data snapshot."""
from __future__ import annotations

import csv
import json
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS_DIR = ROOT / "教案素材/words"
STAGE_FILES = ["words-base.txt", "words-P1.txt", "words-P2.txt", "words-P3.txt",
               "words-P4.txt", "words-P5.txt", "words-P6.txt", "words-P7.txt", "words-P8ext.txt"]


def atomic_text(path: Path, value: str):
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=path.parent,
                                     prefix=f".{path.name}.", suffix=".tmp", delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(value)
    temporary.replace(path)


def main():
    excluded = set(json.loads((ROOT / "data/excluded.json").read_text(encoding="utf-8")))
    vocabulary = json.loads((ROOT / "data/vocabulary.json").read_text(encoding="utf-8"))
    overrides = json.loads((ROOT / "data/overrides.json").read_text(encoding="utf-8"))
    us_pronunciations = json.loads((ROOT / "data/us_pronunciations.json").read_text(encoding="utf-8"))
    foundation = {
        row["word"]: row for row in csv.DictReader((ROOT / "data/foundation.tsv").read_text(encoding="utf-8-sig").splitlines(), delimiter="\t")
    }
    entries = {entry["word"]: {**entry, **overrides.get(entry["word"], {})} for entry in vocabulary}
    entries.update({word: {"word": word, "phonetic": row["phonetic"], "meaning": row["meaning"],
                           "example": row["example"], "translation": row["translation"], "quality": "curated"}
                    for word, row in foundation.items()})

    filtered_files = {}
    for filename in STAGE_FILES:
        path = WORDS_DIR / filename
        words = [word for word in path.read_text(encoding="utf-8-sig").split() if word not in excluded]
        atomic_text(path, "\n".join(words) + "\n")
        filtered_files[filename] = words

    csv_path = ROOT / "教案素材/02-7000分级词表.csv"
    headers = ["词频排名", "单词", "阶段", "周区间", "说明", "音标", "中文释义", "例句"]
    rows = []
    for entry in sorted(vocabulary, key=lambda item: item["rank"]):
        word = entry["word"]
        if word in excluded:
            continue
        item = entries.get(word, entry)
        example = " ".join(item.get("example", "").split())
        translation = " ".join(item.get("translation", "").split())
        if example and translation:
            example = f"{example}　{translation}"
        rows.append({"词频排名": entry["rank"], "单词": word, "阶段": entry.get("stage", ""),
                     "周区间": entry.get("range", ""),
                     "说明": "释义待核实，不进入核心练习" if item.get("quality") == "unverified" else "",
                     "音标": us_pronunciations.get(word, ""), "中文释义": " ".join(item.get("meaning", "").split()), "例句": example})
    with tempfile.NamedTemporaryFile("w", encoding="utf-8-sig", newline="", dir=csv_path.parent,
                                     prefix=".vocab.", suffix=".tmp", delete=False) as stream:
        csv_temp = Path(stream.name)
        writer = csv.DictWriter(stream, fieldnames=headers)
        writer.writeheader(); writer.writerows(rows)
    csv_temp.replace(csv_path)

    annotated_path = ROOT / "教案素材/words-7000带注释.csv"
    annotated_path.write_bytes(csv_path.read_bytes())
    zip_path = ROOT / "教案素材/words-分阶段词表.zip"
    with tempfile.NamedTemporaryFile(suffix=".zip", dir=zip_path.parent, delete=False) as stream:
        zip_temp = Path(stream.name)
    try:
        with zipfile.ZipFile(zip_temp, "w", zipfile.ZIP_DEFLATED) as archive:
            for filename, words in filtered_files.items():
                archive.writestr(filename, "\n".join(words) + "\n")
            archive.write(annotated_path, "words-7000带注释.csv")
        zip_temp.replace(zip_path)
    finally:
        if zip_temp.exists(): zip_temp.unlink()
    print(f"Exported {len(rows)} CSV rows and {sum(len(words) for words in filtered_files.values())} plain words; excluded {len(excluded)} words.")


if __name__ == "__main__":
    main()
