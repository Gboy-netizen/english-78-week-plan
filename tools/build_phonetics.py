"""Build the standalone American pronunciation practice cards."""
from __future__ import annotations

import html
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "教案素材/01-48音标学习包.html"


def render() -> str:
    items = json.loads((ROOT / "data/phonetics.json").read_text(encoding="utf-8"))
    cards = []
    for item in items:
        symbol = html.escape(item["s"])
        word = item["ws"].split()[0]
        cards.append(
            f'<article class="card"><span class="symbol">/{symbol}/</span><span class="group">{html.escape(item["g"])}</span>'
            f'<p>{html.escape(item["tip"])}</p><p class="words">{html.escape(item["ws"])}</p>'
            f'<p class="small">{html.escape(item["sp"])}</p><p class="small note">{html.escape(item["mis"])}</p>'
            f'<button type="button" data-word="{html.escape(word, quote=True)}">🔊 听 {html.escape(word)} 的美式发音</button></article>'
        )
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>美式发音学习卡 · 每天一点英语</title>
<style>
:root{font-family:system-ui,"Microsoft YaHei",sans-serif;color:#14243a;background:#f5f8fc}*{box-sizing:border-box}
body{margin:0}.wrap{max-width:1080px;margin:auto;padding:24px 18px 64px}header{background:#174ea6;color:#fff;padding:24px 18px}
header .wrap{padding:0 18px}h1{margin:0 0 8px;font-size:clamp(24px,4vw,34px)}header p{margin:0;line-height:1.7}
a{color:#174ea6}header a{color:#fff}.lead{line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.card{background:#fff;border:1px solid #dce5f1;border-radius:14px;padding:16px;box-shadow:0 2px 7px #17375e12}
.symbol{font-family:Georgia,serif;font-size:28px;font-weight:700;color:#174ea6}.group{margin-left:10px;color:#65758b;font-size:13px}
.card p{margin:9px 0;line-height:1.55}.words{font-weight:600;color:#244971}.small{font-size:13px;color:#5b6b7f}.note{color:#8b5a10}
button{border:0;border-radius:9px;background:#174ea6;color:white;padding:10px 12px;font:inherit;cursor:pointer}button:hover{background:#103c80}
#status{min-height:1.5em;color:#9a4b0b}footer{margin-top:28px;font-size:14px;color:#5b6b7f}
</style></head><body><header><div class="wrap"><h1>美式发音学习卡</h1><p>每天一点英语 · 例词点击即可听美式发音</p></div></header>
<main class="wrap"><p class="lead">这 48 张卡包含常用音标和 tr、dr、ts、dz 等组合音，并不代表美式英语有 48 个独立音位。先听例词，再跟读 3 遍。个别元音随美国地区口音不同会略有变化。<a href="../index.html">返回今日学习</a></p>
<p id="status" role="status" aria-live="polite"></p><section class="grid" aria-label="美式发音学习卡">
""" + "\n".join(cards) + """
</section><footer>优先使用设备的美式英语语音；设备不可用时尝试在线美式发音。系统语音需在设备中安装英语（美国）语音。</footer></main>
<script>
const status = document.getElementById('status');
function online(word) {
  const audio = new Audio('https://dict.youdao.com/dictvoice?type=2&audio=' + encodeURIComponent(word));
  audio.onerror = () => { status.textContent = '发音暂时不可用，请检查英语语音或网络。'; };
  const started = audio.play();
  if (started && started.catch) started.catch(audio.onerror);
}
function pronounce(word) {
  status.textContent = '';
  if (!('speechSynthesis' in window)) { online(word); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  const voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase() === 'en-us');
  if (voice) utterance.voice = voice;
  let started = false;
  const timer = setTimeout(() => { if (!started) { speechSynthesis.cancel(); online(word); } }, 5000);
  utterance.onstart = () => { started = true; clearTimeout(timer); };
  utterance.onend = () => clearTimeout(timer);
  utterance.onerror = () => { clearTimeout(timer); online(word); };
  speechSynthesis.speak(utterance);
}
document.querySelectorAll('[data-word]').forEach(button => button.addEventListener('click', () => pronounce(button.dataset.word)));
</script></body></html>
"""


def main() -> int:
    try:
        page = render()
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=OUTPUT.parent,
                                         prefix=".phonetics.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(page)
        temporary.replace(OUTPUT)
        print(f"Built {OUTPUT.name} ({len(page.encode('utf-8')):,} bytes)")
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Phonetics build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
