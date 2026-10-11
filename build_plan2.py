# -*- coding: utf-8 -*-
"""Patch 2 on enhanced english-18m-plan.html:
- add favicon (inline SVG data URI, theme blue + 英)
- mobile check-table horizontal scroll
- button font-family inherit (clear slopFonts arial)
- role chip + prompt note on separate lines (mobile overlap/wrap)
"""
SRC = r"D:\Doubao-Workspace\英语提升计划5.5-6.0\english-18m-plan.html"

with open(SRC, encoding="utf-8") as f:
    html = f.read()

edits = []

# 1. favicon after <title>
fav = ('<title>英语 1.5 年进阶打卡计划 · 从 1000 词到雅思 5.5–6.0</title>\n'
       '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'14\' fill=\'%230EA5E9\'/%3E%3Ctext x=\'32\' y=\'46\' font-size=\'38\' text-anchor=\'middle\' fill=\'white\'%3E%E8%8B%B1%3C/text%3E%3C/svg%3E">')
edits.append(('<title>英语 1.5 年进阶打卡计划 · 从 1000 词到雅思 5.5–6.0</title>', fav))

# 2. mobile check-table scroll (insert after @media open)
edits.append(('  @media(max-width:760px){',
              '  @media(max-width:760px){\n'
              '    .check-table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;}\n'))

# 3. button font inherit
edits.append(('.today-tool button{padding:8px 18px;border:none;border-radius:8px;'
              'background:linear-gradient(135deg,var(--blue),var(--blue-deep));'
              'color:#fff;font-weight:700;font-size:14px;cursor:pointer;}',
              '.today-tool button{padding:8px 18px;border:none;border-radius:8px;'
              'background:linear-gradient(135deg,var(--blue),var(--blue-deep));'
              'color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;}'))

# 4. role chip + note on separate lines
old_role = ('\'<div style="margin-top:8px;"><span class="role">调用 AI 角色：\' + entry.r + '
            '\'</span><span style="font-size:12px;color:var(--ink-soft);margin-left:8px;">'
            'prompt 见执行文档《AI 替换方案》/协议第 3 节</span></div>\'')
new_role = ('\'<div style="margin-top:8px;"><span class="role">调用 AI 角色：\' + entry.r + '
            '\'</span></div><div style="font-size:12px;color:var(--ink-soft);margin-top:6px;line-height:1.5;">'
            'prompt 见执行文档《AI 替换方案》/协议第 3 节</div>\'')
edits.append((old_role, new_role))

for old, new in edits:
    cnt = html.count(old)
    if cnt != 1:
        raise SystemExit("ANCHOR NOT UNIQUE (%d): %r" % (cnt, old[:80]))
    html = html.replace(old, new)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("OK: %d edits applied, size %d" % (len(edits), len(html.encode("utf-8"))))
