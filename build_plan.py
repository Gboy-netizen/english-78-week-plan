"""Build the single-file offline learning page from local source data.

Usage:
    python build_plan.py          # write index.html and english-18m-plan.html
    python build_plan.py --check  # validate inputs and existing outputs only
"""
from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

import curriculum
import course_content

ROOT = Path(__file__).resolve().parent


class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain_text(markup):
    parser = TextOnly()
    parser.feed(markup)
    return "".join(parser.parts).strip()
REQUIRED = [
    ROOT / "course_content.py", ROOT / "src/course.js",
    ROOT / "src/page.html", ROOT / "src/styles.css", ROOT / "src/engine.js", ROOT / "src/app.js",
    ROOT / "curriculum.py", ROOT / "data/vocabulary.json", ROOT / "data/foundation.tsv",
    ROOT / "data/phonetics.json", ROOT / "data/overrides.json", ROOT / "data/us_pronunciations.json",
    ROOT / "data/word_usage.json", ROOT / "data/easy_readings.json",
    ROOT / "data/pronunciation.json", ROOT / "data/uk_pronunciations.json",
    ROOT / "data/phoneme_audio_credits.json", ROOT / "src/pronunciation_audio.js",
]


def read_json(path: Path):
    with path.open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def read_foundation(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream, delimiter="\t"))


def build_data():
    vocabulary = read_json(ROOT / "data/vocabulary.json")
    overrides = read_json(ROOT / "data/overrides.json")
    us_pronunciations = read_json(ROOT / "data/us_pronunciations.json")
    uk_pronunciations = read_json(ROOT / "data/uk_pronunciations.json")
    uk_overrides = read_json(ROOT / "data/uk_overrides.json")
    words = {entry["word"]: dict(entry) for entry in vocabulary if entry.get("word")}
    foundation = read_foundation(ROOT / "data/foundation.tsv")
    foundation_words = []
    for item in foundation:
        word = item["word"].strip().lower()
        foundation_words.append(word)
        words[word] = {
            "word": word, "rank": words.get(word, {}).get("rank", 0), "stage": "基础恢复",
            "range": "W1–W2", "phonetic": item["phonetic"], "meaning": item["meaning"],
            "example": item["example"], "translation": item["translation"],
            "source": "data/foundation.tsv", "quality": "curated",
        }
    for word, override in overrides.items():
        words[word] = {**words.get(word, {"word": word}), **override}
    for word, entry in words.items():
        entry["phonetic"] = us_pronunciations.get(word, "")
        british = ({"ipa": uk_overrides[word], "source": "curated"}
                   if word in uk_overrides else uk_pronunciations.get(word, {}))
        entry["ukPhonetic"] = british.get("ipa", "")
        entry["ukSource"] = british.get("source", "")

    pronunciation = read_json(ROOT / "data/pronunciation.json")
    # External video resources are intentionally kept as links.  Add an explicit
    # audit marker to every item so the UI can distinguish verified external media
    # from the local single-phoneme recordings and from TTS fallbacks.
    for phoneme in pronunciation.get("phonemes", []):
        for clip in phoneme.get("media", []):
            clip.setdefault("status", "external")
            # A build is not a playback verification. Keep old claims as history.
            if clip.get("verifiedOn"):
                clip.setdefault("legacyClaimedDate", clip.pop("verifiedOn"))
            clip.setdefault("verifiedOn", None)
            clip.setdefault("fallback", clip.get("url") or clip.get("video", ""))
    credits = read_json(ROOT / "data/phoneme_audio_credits.json")
    for word, entry in pronunciation["extraWords"].items():
        if not entry["us"].startswith("/") or not entry["uk"].startswith("/"):
            raise ValueError(f"补充例词音标格式不正确：{word}")
        words[word] = {**words.get(word, {"word": word}), "word": word,
                       "phonetic": entry["us"].strip("/"), "ukPhonetic": entry["uk"],
                       "meaning": entry["meaning"], "source": "pronunciation lesson"}
    if [item["letter"] for item in pronunciation["alphabet"]] != list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
        raise ValueError("字母表必须完整覆盖 A-Z 且顺序正确")
    phonemes = pronunciation["phonemes"]
    ids = [item["id"] for item in phonemes]
    if len(ids) != len(set(ids)) or any(item["audio"] not in credits for item in phonemes):
        raise ValueError("音素 ID 重复或单音录音缺失")
    lesson_words = {word for item in phonemes for word in item["examples"]}
    lesson_words.update(word for feature in pronunciation["americanFeatures"] for word in feature["words"])
    lesson_words.update(word for pair in pronunciation["minimalPairs"] for word in (pair["left"], pair["right"]))
    if missing := sorted(word for word in lesson_words if not words.get(word, {}).get("phonetic")
                         or not words[word].get("ukPhonetic")):
        raise ValueError("发音课程例词缺少 US/UK 音标：" + ", ".join(missing))
    phoneme_audio = {}
    for key in sorted({item["audio"] for item in phonemes}):
        path = ROOT / "data/phoneme_audio" / credits[key]["file"]
        if not path.is_file() or path.stat().st_size < 1000:
            raise FileNotFoundError(f"单音录音缺失或过短：{path}")
        phoneme_audio[key] = "data:audio/mpeg;base64," + base64.b64encode(path.read_bytes()).decode("ascii")

    usage = read_json(ROOT / "data/word_usage.json")
    if set(usage) != set(foundation_words):
        raise ValueError("基础词用法讲解必须完整覆盖 100 个基础词")
    for word, notes in usage.items():
        if len(notes) != 3 or not all(isinstance(note, str) and note.strip() for note in notes):
            raise ValueError(f"词汇用法讲解不完整：{word}")
        words[word]["usage"] = notes
    readings = read_json(ROOT / "data/easy_readings.json")
    for reading in readings:
        if not reading["sentences"] or not 0 <= reading["correct"] < len(reading["options"]):
            raise ValueError(f"入门短文不完整：{reading['title']}")

    phase_files = [("P1", 1, 10), ("P2", 11, 20), ("P3", 21, 30), ("P4", 31, 40),
                   ("P5", 41, 50), ("P6", 51, 60), ("P7", 61, 70), ("P8ext", 71, 78)]
    weeks = {}
    for filename, start, end in phase_files:
        path = ROOT / "教案素材/words" / f"words-{filename}.txt"
        if not path.exists():
            raise FileNotFoundError(f"缺少分阶段词表：{path}")
        items = path.read_text(encoding="utf-8-sig").split()
        per_week = (len(items) + (end - start + 1) - 1) // (end - start + 1)
        for week in range(start, end + 1):
            weeks[str(week)] = items[(week - start) * per_week:(week - start + 1) * per_week]

    plan = curriculum.build_curriculum()
    plan.update({
        "coursePack": course_content.build_course_pack(),
        "words": words,
        "weeks": weeks,
        "foundationWords": foundation_words,
        "phonetics": read_json(ROOT / "data/phonetics.json"),
        "easyReadings": readings,
        "pronunciation": pronunciation,
        "phonemeAudio": phoneme_audio,
        "phonemeCredits": {key: {"title": item["title"], "url": item["url"],
                                 "author": plain_text(item["author"]), "license": item["license"],
                                 "licenseUrl": item["licenseUrl"]} for key, item in credits.items()},
    })
    return plan


def json_for_script(value):
    # Prevent data text from ever terminating the surrounding script element.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def build_legacy_page():
    missing = [str(path) for path in REQUIRED if not path.exists()]
    if missing:
        raise FileNotFoundError("缺少构建文件：" + ", ".join(missing))
    template = (ROOT / "src/page.html").read_text(encoding="utf-8")
    styles = (ROOT / "src/styles.css").read_text(encoding="utf-8")
    engine = (ROOT / "src/engine.js").read_text(encoding="utf-8")
    app = (ROOT / "src/app.js").read_text(encoding="utf-8")
    pronunciation_audio = (ROOT / "src/pronunciation_audio.js").read_text(encoding="utf-8")
    course = (ROOT / "src/course.js").read_text(encoding="utf-8")
    replacements = {
        "/*__COURSE__*/": course,
        "/*__LEARNING__*/": (ROOT / "src/learning.js").read_text(encoding="utf-8"),
        "/*__STYLES__*/": styles,
        "__PLAN_DATA__": json_for_script(build_data()),
        "/*__ENGINE__*/": engine,
        "/*__PRONUNCIATION_AUDIO__*/": pronunciation_audio,
        "/*__APP__*/": app,
    }
    for marker, value in replacements.items():
        if template.count(marker) != 1:
            raise ValueError(f"模板占位符不唯一或缺失：{marker}")
        template = template.replace(marker, value)
    if "__PLAN_DATA__" in template or "/*__" in template:
        raise ValueError("页面仍含未替换的占位符")
    return template


def build_v3_assets():
    import curriculum_v3
    manifest=curriculum_v3.build()
    assets={
        "assets/course-data.js":"window.ENGLISH_COURSE="+json_for_script(manifest)+";\n",
        "assets/site.css":(ROOT/'src/v3/styles.css').read_text(encoding='utf-8'),
        "assets/engine.js":(ROOT/'src/v3/engine.js').read_text(encoding='utf-8'),
        "assets/storage.js":(ROOT/'src/v3/storage.js').read_text(encoding='utf-8'),
        "assets/app.js":(ROOT/'src/v3/app.js').read_text(encoding='utf-8'),
        "assets/vendor/fflate.js":(ROOT/'node_modules/fflate/umd/index.js').read_text(encoding='utf-8'),
        "assets/vendor/fflate-LICENSE.txt":(ROOT/'node_modules/fflate/LICENSE').read_text(encoding='utf-8'),
    }
    import hashlib
    fingerprint=hashlib.sha256(''.join(assets.values()).encode()).hexdigest()[:12]
    shell=['./','index.html',*assets.keys(),'assets/human/diagnostic.mp3','assets/human/ls-001.mp3','assets/human/ls-002.mp3']
    assets['sw.js']="""const NAME='english-v3-"""+fingerprint+"""';
const SHELL="""+json.dumps(shell)+""";
self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('english-v3-')&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok&&!e.request.headers.has('range')&&new URL(e.request.url).pathname.indexOf('/downloads/')<0){const copy=r.clone();e.waitUntil(caches.open(NAME).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));});
"""
    page=(ROOT/'src/v3/page.html').read_text(encoding='utf-8')
    return page,assets,manifest


def build_page():
    return build_v3_assets()[0]


def write_atomic(path: Path, content: str):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=ROOT,
                                         prefix=f".{path.name}.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="只检查输入和当前成品，不写文件")
    args = parser.parse_args()
    try:
        page, assets, manifest = build_v3_assets()
        outputs = [ROOT / "index.html", ROOT / "english-18m-plan.html"]
        if args.check:
            stale = [str(path.name) for path in outputs if not path.exists() or path.read_text(encoding="utf-8") != page]
            stale += [name for name,content in assets.items() if not (ROOT/name).exists() or (ROOT/name).read_text(encoding='utf-8')!=content]
            for u in manifest['units']:
                for audio in u['listening']:
                    import hashlib
                    if hashlib.sha256((ROOT/audio['audio']).read_bytes()).hexdigest()!=audio['sha256']:
                        raise ValueError('真人音频校验失败: '+audio['id'])
            if stale:
                raise ValueError("成品缺失或不是当前源文件生成的：" + ", ".join(stale))
            print(f"OK: inputs valid; outputs current ({len(page.encode('utf-8')):,} bytes)")
        else:
            import shutil, zipfile, hashlib
            for name,content in assets.items():
                (ROOT/name).parent.mkdir(parents=True,exist_ok=True)
                write_atomic(ROOT/name,content)
            dest=ROOT/'assets/phonemes';dest.mkdir(parents=True,exist_ok=True)
            for audio in (ROOT/'data/phoneme_audio').glob('*.mp3'):shutil.copy2(audio,dest/audio.name)
            for output in outputs:
                write_atomic(output, page)
            (ROOT/'downloads').mkdir(exist_ok=True)
            def package(path,phase=None):
              selected=set(a['audio'] for u in manifest['units'] if phase is None or phase['start']<=u['week']<=phase['end'] for a in u['listening'])
              with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
                z.write(ROOT/'index.html','index.html')
                sw=assets['sw.js']
                if phase:
                    first=sorted(selected)[:2]
                    sw=sw.replace('assets/human/ls-001.mp3',first[0]).replace('assets/human/ls-002.mp3',first[1]).replace("const NAME='english-v3-", "const NAME='english-v3-"+phase['id']+'-')
                z.writestr('sw.js',sw)
                z.write(ROOT/'legacy/index.html','legacy/index.html')
                for p in (ROOT/'assets').rglob('*'):
                    name=p.relative_to(ROOT).as_posix()
                    if not p.is_file():continue
                    if p.parent.name=='human' and p.name.startswith('ls-') and name not in selected:continue
                    if phase and name=='assets/course-data.js':
                        z.writestr(name,assets[name]+'\nwindow.ENGLISH_COURSE.offlinePackage='+json.dumps({'start':phase['start'],'end':phase['end']})+';\n')
                    else:z.write(p,name)
                z.write(ROOT/'tools/start_site.py','tools/start_site.py')
                z.write(ROOT/'start-learning.cmd','start-learning.cmd')
                z.write(ROOT/'SOURCES.md','SOURCES.md')
                z.write(ROOT/'LICENSE','LICENSE')
                z.writestr('使用说明.txt','解压全部文件。双击 start-learning.cmd（需要Python），或在本目录运行 python -m http.server 4173 并访问 http://localhost:4173。\n本地真人音频可离线播放，在线对话和视频仍需网络。不同来源网址的浏览器记录不会自动同步，请通过完整学习包迁移。\n本包不含你的学习记录，学习记录和录音另用网站内的一键学习包导出。\n')
                if phase:z.writestr('分阶段说明.txt',f"此包包含 W{phase['start']}–W{phase['end']} 的真人录音和全部文字任务。其他阶段录音需下载对应包或完整版。阶段包可解压至同一目录。\n")
            package(ROOT/'downloads/english-course-v3.zip')
            for phase in manifest['phases']:package(ROOT/f"downloads/english-course-{phase['id']}-v3.zip",phase)
            audit=__import__('curriculum_v3').validate(manifest)
            (ROOT/'data/course_manifest_v3.json').write_text(json.dumps({'version':manifest['version'],'coverage':audit,'limitations':manifest['limitations']},ensure_ascii=False,indent=2),encoding='utf-8')
            print(f"OK: built {', '.join(path.name for path in outputs)} ({len(page.encode('utf-8')):,} bytes)")
    except (OSError, ValueError, KeyError, csv.Error) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
