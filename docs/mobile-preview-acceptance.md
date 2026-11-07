# 手机紧凑布局首版 · 本地验收

日期：2026-10-12。基于 3.0.1 的本地预览，未同步发布目录、未提交或推送正式网站。

## 查看效果

- 可操作的手机对照预览：<http://localhost:4173/_shots/mobile-preview/>
- 完整网站：<http://localhost:4173/#course>
- 首屏对比图：[comparison-390.png](../_shots/mobile-preview/comparison-390.png)
- 同尺寸完整截图：[改前](../_shots/mobile-preview/before-390.png)、[改后](../_shots/mobile-preview/after-390.png)。均为 390 × 844 视口；长图保留整页。

如本地服务器停止，运行 `python tools/start_site.py --port 4173 --no-open`。localhost 预览供这台电脑使用，公开网址尚未更新。

## 已实现

- 760px 及以下统一底部五入口导航，顶部保留品牌；触摸目标至少 44px，预留安全区，并按实际导航高度计算页面和提示消息的避让距离。
- 手机阶段下拉、每页四周、完整主题和练习状态；六阶段共二十页，最后一页显示实际剩余周数。
- 当前周按实际日期和学习周期定位；诊断期间定位 W1。浏览其他学习日期不会改变“回到本周”的目标。
- 三组说明默认折叠。桌面、平板保留课程网格，跨越断点保留阶段及手机分页。
- 周详情采用独立滚动面板，标题与关闭按钮固定；关闭及 Escape 恢复原条目焦点、分页和滚动位置。
- 浏览状态独立存入 sessionStorage，禁止存储时回退内存；不写学习成绩，不进入学习包。

## 布局测量

默认字号、W1–W4、说明折叠、无学习周期；使用固定 Playwright Chromium，在本地 HTTP 下读取布局尺寸。

| 视口宽度 | 整页高度 | 第一条课程距顶部 | 默认条目数 |
| --- | ---: | ---: | ---: |
| 360px | 1141px | 327px | 4 |
| 390px | 1141px | 327px | 4 |
| 430px | 1141px | 327px | 4 |
| 768px | 2747px | 611px | 12，网格 |
| 1440px | 2146px | 577px | 12，网格 |

390px 改前整页 3332px、第一条课程 807px；改后约 1.35 屏，长度减少约 66%。满足整页不超过 1688px、第一条课程不超过 450px 的目标。放大文字与展开说明时允许页面自然增长。

## 通过的检查

- `node tools/qa_mobile_preview.js`：五种宽度、六阶段全部分页和边界、W77–W78 末页、实际 W67 定位、学习日期预览不干扰当前周、导航与刷新恢复、详情关闭和 Escape、跨断点、sessionStorage 禁用、长标题、200% 文字无横向溢出及周数标题不重叠。
- 手机检查额外模拟 34px 底部安全区和输入键盘导致的 visualViewport 缩小；验证底部内容可达、导航避让。不是实体 iPhone/Android 检查。
- `node tools/qa_v3_browser.js`：诊断、课程入口、提交前答案隐藏、提示记录、首答保存、真人 MP3 解码、模拟麦克风录音、反馈复测、ZIP 与音频恢复、篡改/配额/恢复失败保护、旧版迁移、考试中断及既有响应式回归。
- `node tools/qa_v3_engine.js`、`python tools/audit_v3.py`、`python build_plan.py --check`、`python tools/check_release_packages_v3.py` 通过。
- 测试使用隔离浏览器数据，不替换用户本机学习记录。另检查发布仓库仍无修改。

真实手机安全区、输入法键盘、麦克风录制与播放仍需设备抽检。此次未做公网发布或手机线上验收。

## 变更位置

`src/v3/app.js`、`src/v3/styles.css`、`src/v3/page.html`；新增 `tools/qa_mobile_preview.js`。构建更新根目录成品和本地离线包；`github-pages-site/` 保持发布版本。对照预览位于被 Git 忽略的 `_shots/mobile-preview/`，不进入正式发布内容。
