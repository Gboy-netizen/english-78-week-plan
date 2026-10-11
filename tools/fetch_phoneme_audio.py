"""Download and record licensed Commons samples used by the offline IPA lesson."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "data/phoneme_audio_sources.json"
OUT = ROOT / "data/phoneme_audio"
CREDITS = ROOT / "data/phoneme_audio_credits.json"


def main():
    titles = json.loads(SOURCES.read_text(encoding="utf-8"))
    unique = sorted(set(titles.values()))
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "videoinfo",
        "viprop": "derivatives|url|extmetadata",
        "titles": "|".join("File:" + title for title in unique),
    })
    request = urllib.request.Request(
        "https://commons.wikimedia.org/w/api.php?" + query,
        headers={"User-Agent": "English78WeekPlan/1.0 (educational audio attribution)"},
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        pages = json.load(response)["query"]["pages"].values()
    by_title = {page["title"].removeprefix("File:"): page for page in pages}
    OUT.mkdir(parents=True, exist_ok=True)
    credits = {}
    for key, title in titles.items():
        page = by_title.get(title)
        if not page or "videoinfo" not in page:
            raise ValueError(f"Commons audio missing: {title}")
        info = page["videoinfo"][0]
        license_name = info["extmetadata"].get("LicenseShortName", {}).get("value", "")
        if not license_name:
            raise ValueError(f"Commons license missing: {title}")
        derivative = next((item for item in info["derivatives"] if item.get("transcodekey") == "mp3"), None)
        if not derivative:
            raise ValueError(f"Commons MP3 transcode missing: {title}")
        filename = f"{key}.mp3"
        target = OUT / filename
        if not target.exists():
            audio_request = urllib.request.Request(derivative["src"], headers={"User-Agent": request.headers["User-agent"]})
            for attempt in range(5):
                try:
                    with urllib.request.urlopen(audio_request, timeout=40) as response:
                        target.write_bytes(response.read())
                    break
                except urllib.error.HTTPError as error:
                    if error.code != 429 or attempt == 4:
                        raise
                    time.sleep(5 * (attempt + 1))
            time.sleep(2)
        credits[key] = {
            "file": filename,
            "title": title,
            "url": info["descriptionurl"],
            "author": info["extmetadata"].get("Artist", {}).get("value", ""),
            "license": license_name,
            "licenseUrl": info["extmetadata"].get("LicenseUrl", {}).get("value", ""),
        }
    CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {len(credits)} audio mappings; {len(unique)} Commons sources")


if __name__ == "__main__":
    main()
