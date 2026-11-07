# 英语提升计划 · 项目交接文档

> 交接日期：2026-11-07（Asia/Shanghai）  
> 项目目录：`F:\Codex-WorkSpace\英语提升计划`  
> 当前主分支：`codex/route-b-upgrade`  
> 当前提交：`49182ac feat: add adaptive coaching and study-time modes`  
> 文档用途：让新的维护者在不依赖聊天记录的情况下，理解产品目标、当前实现、数据边界、构建与发布流程、验证结果和剩余风险。

## 1. 接手结论

这是一个无后端、以本地浏览器数据为主的静态英语学习网站。当前主线是 v3：先完成三天诊断，再按 78 周、每周 7 天推进；默认每天 60 分钟，也可在能力证据页切换到 90 或 120 分钟。课程目标设置为 IELTS General 总分 6.5、四项建议至少 6.0。

本地源码和成品目前可以构建、运行和做主要交互验收。**但它仍不是经过独立教师审定、真实设备全面验收或完整学习成效验证的标准化课程。** 页面中的训练分数、自动审计和 IELTS 准备度记录都不能单独证明学习者已经达到 6.5。

截至 2026-11-07，建议新维护者先做三件事：

1. 先读完第 11 节“已知问题”：`npm test` 现已通过，但主仓库本地 Git 历史仍缺少一个父提交对象。
2. 学习功能从 `start-learning.cmd` 或 `python tools/start_site.py` 进入；代码修改从 `src/v3/`、`curriculum_v3.py` 和 `data/` 进入。
3. 当前 v3.1.2 已上传到 GitHub `main` 并完成 Pages 构建；真实设备、外部教师审查和正常网络下载验收仍需继续。

## 2. 产品目标与设计原则

### 2.1 使用对象和目标

- 主目标：IELTS General，训练目标总分 6.5，四项建议至少 6.0。
- 节奏：78 周，每周 7 天；默认每天 60 分钟，六天训练、一天复盘。
- 学习闭环：理解 → 提取 → 表达 → 反馈 → 复测。
- 内容从基础恢复、日常理解逐步推进到考试专项、薄弱科强化和综合验证。
- 目标分数是计划参数，可在 `src/v3/engine.js` 和页面中调整；它不是官方考试承诺。

### 2.2 必须保留的产品决策

- 免费优先，使用外部 ChatGPT、豆包等工具通过“复制提示词、粘回结构化结果”完成反馈。
- 项目没有 AI API、账号系统、云同步后端或自动机器评分服务。
- 学习数据主要保存在当前浏览器的 IndexedDB；飞书用于人工打卡和摘要副本，不是网站数据库。
- 原始首答、原稿、录音和反馈必须可追溯；修改稿不能覆盖首答。
- 未见材料、完整四科、人工评分来源和延迟复测是考试准备度证据的条件。
- 本地真人音频是文学朗读或短句语料，不能冒充分级对话、CEFR 认证材料或 IELTS 试卷。
- 外部链接只保存入口或播放器链接，不重新分发受版权保护的整段对话、视频和试卷。

## 3. 当前版本、发布状态和代码状态

| 项目 | 当前状态 |
|---|---|
| 功能名称版本 | `CHANGELOG.md` 最新记录为 **3.1.2**，新增 60/90/120 分钟学习模式 |
| 生成数据版本 | `curriculum_v3.py`、`data/course_manifest_v3.json` 和 Release 标签统一为 **3.1.2** |
| 本地源码分支 | `codex/route-b-upgrade` |
| 本地功能提交 | `8e1b82f`，2026-11-07；包含审查修复、3.1.2 一致性调整和交接文档。本文件后续修订提交以 `git log -1` 为准 |
| 工作树 | 上传前已验证并提交；除本交接文档后续补记外为干净状态 |
| GitHub `main` | `9b3ce488f96b205c64b9d95fc5832beca3721dec`，远端树 `7f7d2023b78b8665fcf84077add5453e5bf24efc` |
| GitHub Pages | 构建状态 `built`，构建提交 `9b3ce48` |
| Release | `v3.1.2` 已发布；完整课程包资产 75,486,813 字节 |
| 公共仓库 | <https://github.com/Gboy-netizen/english-78-week-plan> |
| 公共网址 | <https://gboy-netizen.github.io/english-78-week-plan/> |
| 是否已同步最新本地版本 | **是**。GitHub `main` 树与本地 3.1.2 发布树一致，Pages 已构建该提交 |
| 主仓库 Git 完整性 | **异常**。`git fsck --full --no-reflogs` 报缺少提交对象 `742f658e8579ce519f6910d821693682316c8c05` |

说明：本地 `github-pages-site/` 独立检出仍可能停留在历史版本，不能作为远端状态的依据。当前线上事实以 GitHub `main` 提交、Pages 构建记录和发布后的公共网址为准。

## 4. 用户如何进入和使用

### 4.1 本地学习

推荐方式：

```powershell
cd F:\Codex-WorkSpace\英语提升计划
.\start-learning.cmd
```

或：

```powershell
python tools\start_site.py
```

然后打开 <http://localhost:4173/>。服务器只监听本机回环地址，没有账号和后端。

也可直接双击 `index.html`。文字和本地真人音频通常可用，但录音、IndexedDB 或浏览器安全策略在 `file://` 下可能受限，因此学习和验收优先通过 localhost。

### 4.2 学习流程

1. 完成三天诊断：听说；阅读、词块与句法；写作与情境口语。
2. 建立学习周期。周期从诊断完成后的下一天启动，选择页面保存的起点和弱项。
3. 进入“今日课堂”。默认 60 分钟的课堂预算是：提取 10、输入 20、输出 15、反馈 10、保存 5。
4. 先独立作答、写下原稿或录音，再查看解析、提示或 AI 反馈。
5. 反馈要保存原句/时间点证据、错误标签和 2–3 个可执行动作；默认安排三天后迁移复测。
6. 每周用新材料检查和两个补强课时调整进度；不通过无限增加当天时间来追进度。
7. 在“资料与备份”定期导出完整 ZIP；纯文字 JSON 不包含录音，不能替代完整学习包。

90/120 分钟加强模式沿用五段顺序，只延长主动提取、输入、输出和反馈环节。来源、首答、录音关联、复测和 IELTS 证据规则不变。

### 4.3 页面入口

- 今天学习：根据当前周期安排当天课堂。
- 课程地图：78 周与六个阶段，可以浏览任意周、七天任务和材料；浏览本身不记完成。
- 复盘：历史练习、反馈、趋势、复测和高频问题。
- 能力证据：目标、学习时长、阶段检查、模考批次、分科技巧计时与准备度。
- 资料与备份：课程安装包、发音资源、学习包导入导出、完整恢复与回滚。
- 旧版与历史记录：`legacy/index.html`，用于旧数据兼容和回退。

## 5. 课程内容规模

| 维度 | 当前实际数据 |
|---|---:|
| 周单元 | 78 |
| 每日任务 | 546 |
| 默认每日预算 | 60 分钟 |
| 本地核心真人录音 | 156 |
| 核心与迁移阅读合计 | 156 份不同文本 |
| 本地真人音频文件目录计数 | 158 个文件，即 156 段课程录音、1 段诊断录音和 1 个署名/许可文件 |
| 独立音素 MP3 | 46 |
| 教师逐项审核周数 | **0** |
| 安装包 | 1 个完整包 + 6 个阶段包 |

六个阶段的边界定义在 `curriculum_v3.py` 和 `src/v3/engine.js`：

| 阶段 | 周次 | 目标 |
|---|---|---|
| 基础恢复 | W1–W12 | 听懂短句、介绍自己、写清日常信息 |
| 日常理解与表达 | W13–W28 | 理解短对话和文章，连贯讲述生活经历 |
| 持续表达与考试入门 | W29–W44 | 解释观点和理由，进入 General 任务 |
| IELTS 专项训练 | W45–W60 | 听读题型、书信、议论文和口语三部分 |
| 薄弱科强化 | W61–W72 | 在新材料中提高速度、准确性和独立表达 |
| 综合验证 | W73–W78 | 使用未见材料和真实评分检查差距 |

课程地图覆盖全部 546 天。前两周人工细化程度最高，W3–W78 依据阶段、周主题、阅读、迁移文本、听力、词块和写说目标编排。后段包含预约、租房、报销、公共服务、工作沟通等生活与工作案例。外部自然对话主要是 ELLLO 入口；本地长篇录音以文学朗读为主，不可替代真实自然对话和完整雅思试卷。

## 6. 系统架构

### 6.1 技术形态

- 页面：静态 HTML。
- 样式：原生 CSS。
- 业务逻辑：原生 JavaScript，通过 IIFE 暴露 `window.EnglishApp`、`window.EnglishV3`、`window.EnglishStorage` 和 `window.ENGLISH_COURSE`。
- 数据：Python 构建脚本把课程定义为 `assets/course-data.js`；其他 JSON、TSV、MP3 作为本地资源。
- 压缩/学习包：`fflate`。
- 离线：Service Worker 缓存应用壳与常用媒体；安装包提供完整离线资源。
- 自动化：Python 课程审计、Node 断言测试、Playwright Chromium 浏览器测试。
- 部署：静态 GitHub Pages，无运行时服务器。

### 6.2 新版源码职责

| 文件 | 职责 |
|---|---|
| `src/v3/page.html` | v3 HTML 入口模板 |
| `src/v3/styles.css` | v3 样式、响应式布局和手机导航 |
| `src/v3/app.js` | 页面渲染、表单、导航、诊断、课堂、证据、资料库和导入导出交互 |
| `src/v3/engine.js` | 日期、周期、任务路由、首答、反馈、复测、周总结、分数与准备度规则 |
| `src/v3/storage.js` | IndexedDB、旧数据迁移、录音、ZIP 校验、恢复、合并和回滚 |
| `curriculum_v3.py` | 构建 78 周、546 天课程清单和校验规则 |
| `build_plan.py` | v3 资产生成、原子写入、离线包生成和成品一致性检查 |
| `assets/course-data.js` | 由 Python 构建生成的课程数据，不是手工编辑源 |
| `assets/app.js`、`engine.js`、`storage.js` | 由 `src/v3/` 复制生成，不是手工编辑源 |
| `index.html`、`english-18m-plan.html` | 生成后的页面入口，不要直接编辑 |
| `sw.js` | 由构建生成的 Service Worker 和应用壳指纹 |
| `tools/start_site.py` | 本地静态服务器 |

`src/page.html`、`src/app.js`、`src/engine.js`、`src/course.js`、`src/learning.js` 等是旧版/生成历史链的一部分。维护当前 v3 时，应修改 `src/v3/`，不要误改旧模板。

### 6.3 数据与恢复边界

v3 使用 IndexedDB 保存状态，录音与文字记录分开处理。主要名称：

- v3 数据库：`little-english-v3`
- 旧录音数据库：`little-english-audio`
- 旧文字键：`little-english-progress-v1`
- v3 运行中的考试计时临时标记：`little-english-v3-running`

重点规则：

- 文件网址、localhost 和公共网址是不同浏览器来源，各自拥有独立存储。换入口不会自动同步。
- 新版会尝试迁移同一来源下的旧记录，旧键和旧录音不会自动删除。
- 完整学习包是 ZIP，包含 `progress.json`、`audio/`、`audio-manifest.json`、`writing-feedback.json`、`README.txt` 和文件校验清单。
- 纯文字 JSON 不含录音。
- 导入前应先导出当前完整备份。默认合并模式保留冲突；替换模式保留可回滚的上一完整版本。
- 缺文件、哈希不符、无效版本、断开的练习/录音关联应阻止恢复。
- 飞书摘要不是原始学习数据备份，不能替代完整 ZIP。

## 7. 目录地图

| 路径 | 用途 | 是否作为当前源码编辑 |
|---|---|---|
| `README.md` | 当前使用、维护和验证说明 | 是 |
| `handover.md` | 本交接文档 | 是 |
| `CHANGELOG.md` | 版本变更记录 | 是 |
| `SOURCES.md` | 数据、词典、音频和外部来源许可 | 是 |
| `src/v3/` | v3 源码真源 | **是** |
| `curriculum_v3.py` | 课程生成与结构校验 | **是** |
| `data/` | 课程、词汇、发音、外链和资源核验数据 | **是** |
| `assets/human/` | 156 段本地课程录音和诊断录音 | 内容资产 |
| `assets/phonemes/` | 46 个独立音素音频 | 生成/内容资产 |
| `assets/` | 构建后的页面 JavaScript、CSS、课程数据和供应方代码 | 生成物，源在 `src/v3/` |
| `downloads/` | 完整与六阶段离线安装包 | 生成物 |
| `tools/` | 构建辅助、审计、QA、发布和资源处理脚本 | 是 |
| `docs/` | v3 验收、全量课堂和手机布局记录 | 是 |
| `legacy/index.html` | 旧版兼容页面 | 谨慎维护 |
| `github-pages-site/` | 独立 Git 检出 | 历史发布目标，非开发真源 |
| `教案素材/` | 早期教材、词表、音标与博主资料 | 历史/内容素材 |
| `_backup/` | 修改前回滚包和历史源码快照 | 不发布 |
| `_cache/` | 第三方原始媒体、LibriSpeech 等构建缓存 | 不发布 |
| `_shots/` | 浏览器截图、媒体审计和外部链接检查记录 | 不发布 |
| `node_modules/` | npm 依赖 | 不发布 |
| `outputs/` | Anki 试点的 TSV 和说明 | 独立试验产物 |
| 根目录 `*.zip` | 2026-09 的历史换电脑交接包 | 历史资料，不是当前最新版 |

## 8. 构建、验收和发布

### 8.1 前置环境

已验证的运行环境：

- Python 3.12.4
- Node.js v24.22.1
- npm 12.2.1
- Playwright 1.63.0
- ffmpeg 9.0.1

最低环境可按 `README`/CI 使用 Python 3.10+、Node.js 18+；CI 明确固定为 Python 3.12、Node.js 22 和 Playwright Chromium。

首次安装：

```powershell
npm ci
npx playwright install chromium
```

`build_plan.py` 会读取 `node_modules/fflate/umd/index.js`，所以不能在没有执行 `npm ci` 的干净目录直接构建。

### 8.2 修改后的标准流程

```powershell
# 1. 先备份用户学习数据和当前代码状态
# 2. 只修改源码真源
npm ci
python build_plan.py
python build_plan.py --check
python tools\audit_v3.py
npm test
python tools\audit_v3.py --decode
python tools\check_release_packages_v3.py
python tools\check_online_media_v3.py
```

修改用户可见行为时，至少抽查 localhost 下的桌面和 390/768px 页面；涉及录音时还要在真实设备录一条、回放，并做完整学习包导出恢复。

### 8.3 构建会生成什么

`python build_plan.py` 会：

- 从 `src/v3/page.html` 生成根目录 `index.html` 和 `english-18m-plan.html`。
- 从 `src/v3/*.js`、`styles.css` 和 `curriculum_v3.py` 生成 `assets/` 与 `sw.js`。
- 复制 46 个音素 MP3 到 `assets/phonemes/`。
- 在本地生成 `downloads/english-course-v3.zip`；该文件被 Git 忽略，并作为 GitHub Release 资产发布。
- 生成六个阶段包：`foundation`、`everyday`、`independent`、`ielts`、`strengthen`、`verify`。
- 更新 `data/course_manifest_v3.json` 的覆盖摘要。

完整课程包约 72 MiB，通过 <https://github.com/Gboy-netizen/english-78-week-plan/releases/latest/download/english-course-v3.zip> 下载；六个阶段包随静态网站发布。阶段包包含全部文字任务，只附带对应阶段的课程录音。个人学习记录不进入课程安装包。

### 8.4 同步到本地发布目录

```powershell
python tools\sync_release_v3.py
python tools\check_release_packages_v3.py
```

`sync_release_v3.py` 会把根目录可发布文件复制到 `github-pages-site/` 并校验 SHA-256，但明确**不提交、不推送、不部署**。执行后必须先检查：

```powershell
git -C github-pages-site status --short --branch
git -C github-pages-site diff --stat
git -C github-pages-site diff
```

当前 `release-v3.json` 是生成同步报告的文件，但被 `.gitignore` 排除；它现在的状态仍记录 v3.0.1、`published: false`，不能作为最新发布证据。

### 8.5 公共发布

当前项目已经上传到公共 GitHub 仓库的 `main`，并通过 legacy Pages 从根目录发布。由于执行环境无法连接 `github.com:443` 的 Git Smart HTTP 和 SSH 无现有密钥，本次使用 GitHub Git Data API：先上传缺失 Blob，再创建与本地 `HEAD^{tree}` 完全一致的树，最后以非强推方式更新 `main`。

如果普通 `git push` 无法连接，历史备用工具为：

```powershell
cd F:\Codex-WorkSpace\英语提升计划\github-pages-site
python ..\tools\publish_via_github_api.py
```

该脚本要求 `gh auth login` 和已有本地提交。当前机器没有 `gh` 命令，因此本次没有使用该脚本；本次手动 API 流程已经完成树哈希校验和非强推上传。将来修复网络或安装 `gh` 后，应优先使用标准 Git 推送，并保留现有历史。

发布后必须单独验证：

- 公共 HTTPS 地址确实返回新版本。
- Service Worker 没有继续提供旧缓存。
- 手机与桌面均可进入。
- 完整/阶段安装包链接可下载且哈希一致。
- 官方练习、ELLLO、发音视频和飞书跳转可用。
- GitHub Actions 实际运行记录为绿色。

## 9. 2026-11-07 实际验证结果

本次交接前重新运行了以下命令：

| 命令 | 结果 | 说明 |
|---|---|---|
| `python build_plan.py --check` | **通过** | 输入有效；生成页面与当前源码一致；内容约 3,251 字节的 HTML 外壳，数据在外部资产中 |
| `python tools/audit_v3.py` | **通过** | 78 周、546 天、156 段本地真人音频、156 份阅读、教师审核 0 |
| `python tools/audit_v3.py --decode` | **通过** | 157 个课程/诊断 MP3 和 46 个音素 MP3 均通过 ffmpeg 解码 |
| `npm run test:browser` | **通过** | 三天诊断、答案门控、语法提示留痕、音频播放、模拟录音、首答、反馈复测、完整包往返、篡改拒绝、配额回滚、恢复回滚、发音、刷新中断、媒体失败和三种宽度通过 |
| `python tools/check_release_packages_v3.py` | **通过** | 完整包和六个阶段包的录音覆盖、文件内容与当前站点一致 |
| `npm test` | **通过** | 引擎、课程审计和浏览器回归全部通过；周期测试已改用显式夹具日期，不再依赖测试执行日期 |
| GitHub Git Data API 上传 | **通过** | 远端树与本地树均为 `7f7d2023b78b8665fcf84077add5453e5bf24efc`；`main` 非强推更新到 `9b3ce48` |
| GitHub Pages 构建 | **通过** | Pages 构建状态 `built`，对应提交 `9b3ce48`；带缓存破坏参数的公共首页返回新版 3,251 字节入口 |
| GitHub Release 资产 | **上传通过** | `v3.1.2` 已发布，资产状态 `uploaded`，字节数与本地完整包一致；受执行环境网络限制，未完成从 Release 的整包回下载 |
| `git fsck --full --no-reflogs` | **失败** | 主仓库缺少对象 `742f658e8579ce519f6910d821693682316c8c05`，父提交链不完整 |

浏览器截图和媒体验证结果保存在 `_shots/`；这些目录被 Git 忽略，适合本机排查，不作为公共网站内容发布。

## 10. 已验证与尚未验证的内容

### 10.1 已经有自动化证据

- 546 天路由和每日预算。
- 90/120 分钟扩展后五段预算合计正确。
- 三次约 180 分钟长模考的替换逻辑。
- 首答不可覆盖、提示留痕、重复材料识别和来源历史。
- 结构化反馈证据、动作数量、音频与时间点关联、三天复测。
- 周总结和高频错误导航。
- IELTS 总分取整、官方换算网址限制和准备度排除规则。
- localStorage/IndexedDB 迁移、完整 ZIP 校验、冲突保留、事务恢复与回滚。
- 录音失败和媒体失败降级。
- 390、768、1440 宽度主要流程无横向溢出。
- 课程题目目标词泄露扫描和语法参考答案提交后显示。
- 本地 157 个课程/诊断 MP3 与 46 个音素 MP3 可解码。

### 10.2 仍需人工或外部验证

1. **教师审查与难度校准**：`humanReviewedUnits` 为 0。建议至少按阶段抽检 10%，后期 IELTS 题型和写说任务优先逐项复核。
2. **音频人工试听与口音核验**：文件可解码不等于自然、清晰或适合当前水平。仍要逐人/逐段核对口音、语境和难度。
3. **真实设备**：浏览器测试使用模拟麦克风。真实 Windows/macOS、iPhone、Android 的麦克风权限、录音播放、安全区、输入法和恢复流程仍需抽检。
4. **外部媒体**：2026-10-10 的 11 项 HTTP 抽检中 9 项可访问；IELTS General 样题页超时、Rachel 页面返回 403。HTTP 可访问也不等于播放器正常播放。
5. **公共部署**：GitHub `main` 和 Pages 已更新，但本次通过 API 上传，没有普通 Git push 和远端 Actions 运行记录；仍需在正常网络和真实手机上抽查公共页面、下载与跳转。
6. **学习成效**：没有学习者研究或真实考试成绩数据。产品的考试准备度只是一套证据门槛，不能推算官方 band。
7. **完整考试材料**：不打包版权不明的 Cambridge 或 IELTS 试卷；用户需合法取得未见材料，并由可识别的人工作来源评分。

## 11. 已知问题和风险

### P0：主仓库 Git 对象缺失

`git fsck` 报告父提交 `742f658e8579ce519f6910d821693682316c8c05` 缺失。虽然当前提交和文件可读，后续历史审计、变基、合并和恢复有风险。

建议顺序：

1. 先复制整个工作目录或另建完整 ZIP 快照。
2. 运行 `git status`、`git remote -v`，确认当前无未提交修改。
3. 备份 `git bundle create ..\english-plan-before-repair.bundle --all`；如果失败，至少保留文件级快照。
4. 尝试从 `origin` 获取对象并重新运行 `git fsck`。
5. 若仓库历史无法修复，新建干净克隆，把当前工作树作为一次可审查的新提交迁入。
6. 不要在未备份时执行 `git gc --prune=now`、强推或删除 `.git`。

历史发布目录 `github-pages-site/` 能读取同一父提交，但没有确认两处对象库共享同一修复方案。不要直接把嵌套仓库的 `.git` 复制覆盖主仓库。

### P1：历史验收记录仍有旧版本描述

当前源码、生成清单、安装包和 Release 已统一为 3.1.2。`docs/v3-acceptance.md` 与手机验收记录保留 3.0.1 的历史语境；后续应在这些文档中追加 3.1.x 增量说明，而不是改写过去的验收事实。

### P1：完整课程包的 Release 域名依赖

完整课程包已作为 `v3.1.2` Release 资产发布，页面链接为 `releases/latest/download/english-course-v3.zip`。本执行环境访问 `github.com` 普通下载地址时出现超时，但 Git Data、Release 管理和 Pages 均可用。若某些网络无法打开 Release，可下载六个阶段包并解压到同一目录；它们覆盖全部文字和对应阶段的全部真人录音。

### P1：课程质量仍需人工审查

当前内容是机器编写和结构校验产物。自动测试能验证 ID、证据边界、路由和交互，不能证明语言正确、难度递进合理、题项不歧义或教学顺序最优。这应成为后续内容工作的主线，而不是继续单纯增加题量。

### P2：外部资源不稳定

ELLLO、IELTS、UBC、Rachel 等资源受网络、地区、平台政策和页面改版影响。页面已区分来源、在线流和本地备用材料，但维护时仍需重新核验；不要在未实际播放时更新为“人工通过”。

### P2：仓库体积与发布边界

根目录包含音频、安装包、缓存和历史交接 ZIP；发布目录是独立 Git 检出。发布时只复制白名单文件，避免把 `_cache/`、`_backup/`、`_shots/`、`node_modules/`、个人学习包、credential 或浏览器数据带进公共仓库。

### P2：测试时间依赖之外的环境差异

当前 Windows 本机 Node 版本高于 CI 固定版本。Windows 与 Linux 的换行差异已由离线包比较脚本处理，但版本发布仍以 CI 环境为准。不要把本机 `npm run test:browser` 通过等同于远端 CI 通过。

## 12. 建议的后续优先级

1. 保持 `npm test` 全绿，并修复主仓库本地 Git 历史缺失对象。
2. 在干净克隆中重新验证当前远端 `main`，并建立可恢复的 `git bundle`。
3. 逐步把历史验收记录中的 3.0.1 描述补上 3.1.2 增量记录。
4. 在真实桌面和手机上完成录音、回放、完整导出、恢复和回滚抽检。
5. 按阶段进行教师审查，先审基础输入/W1–W12、IELTS 题型/W45–W60 和三次长模考。
6. 在正常网络和真实手机上验证 GitHub Pages、六个阶段包和 Release 完整包。
7. 若 Release 域名在目标网络不可用，改造下载页提供阶段包组合说明或可访问的镜像。

在内容质量、真实发布或学习效果仍未完成前，产品文案继续使用“训练”“候选证据”“准备度检查”等表述，避免暗示已经获得官方分数或教学质量认证。

## 13. 修改工作流与防护规则

### 修改课程或数据

1. 确认问题属于现行 v3，不使用旧 v2 数据解释当前行为。
2. 修改 `curriculum_v3.py`、`data/` 或 `src/v3/` 的源文件。
3. 运行构建，禁止手工修改 `assets/course-data.js` 和根目录生成页面。
4. 从内容 ID、材料证据、题目正确项、音频路径和版本历史检查影响。
5. 更新 `CHANGELOG.md`、验收记录或来源说明。

### 修改学习记录或考试逻辑

1. 先阅读 `src/v3/engine.js` 和 `src/v3/storage.js`。
2. 检查旧数据兼容、首答不可变、录音关联和回滚路径。
3. 增加有行为价值的回归断言；不要只镜像实现细节。
4. 运行引擎、浏览器和完整包校验。
5. 若修改存储 Schema，必须提供显式迁移和失败回滚，不得静默覆盖旧数据。

### 修改发布

1. 在根目录构建并通过校验。
2. 确认根目录与安装包一致。
3. 再运行 `sync_release_v3.py`。
4. 在发布目录审阅 Git diff，确认没有缓存、回滚包或个人文件。
5. 提交与发布是分开的步骤；公共发布前需要明确授权。

### 不能做的事

- 不要直接编辑生成后的 `index.html`、`assets/app.js`、`assets/engine.js`、`assets/storage.js` 或 `assets/course-data.js`。
- 不要删除旧数据键或旧录音库来“修复迁移”。
- 不要将模拟录音测试写成真实麦克风已验证。
- 不要将自动结构审计写成独立教师审定。
- 不要将学习分数、页面准备度或 AI 反馈直接写成已获得 IELTS 6.5。
- 不要在没有完整用户备份时做恢复、替换或部署。
- 不要把 `github-pages-site/` 的“本地同步”说成已经公共上线。
- 不要把旧根目录交接 ZIP 当作当前最新源码。

## 14. 故障排查

### 页面看起来仍是旧版本

```powershell
python build_plan.py
python build_plan.py --check
```

然后强制刷新浏览器；Service Worker 会随应用壳指纹更新旧缓存。若仍陈旧，检查当前访问的是根目录、localhost 还是公共站点，它们可能运行不同版本的源码。

### 浏览器提示不能录音或保存

优先改用 localhost 或 HTTPS。直接打开 `file://` 时，浏览器可能限制麦克风和持久存储。不同来源网址之间不会共享记录。

### 新入口看不到旧进度

1. 回到旧入口地址。
2. 导出旧 JSON 或含录音完整学习包。
3. 在新入口导入并检查警告、冲突和录音数量。
4. 不要清空浏览器数据后再尝试迁移。

### 音频缺失或学习包无法恢复

- 运行 `python tools\audit_v3.py --decode` 检查源文件。
- 运行 `python tools\check_release_packages_v3.py` 检查安装包覆盖。
- 检查学习包是否包含 `audio/` 和 `audio-manifest.json` 全部录音。
- 只有完整 ZIP 可作为含录音恢复来源；纯 JSON 不够。

### `npm test` 失败但浏览器测试通过

`npm test` 是串联命令，引擎失败会阻止课程和浏览器步骤继续执行。先查看第一个失败断言，再分别运行 `npm run test:engine`、`npm run test:course` 和 `npm run test:browser` 定位。

### Git 历史读取或变基失败

先运行 `git fsck --full --no-reflogs`。出现缺失对象时停止历史改写，保存文件级快照，再从远端重新获取或建立干净克隆。当前仓库已经存在此问题。

### 外链打不开

外部网站与本地内容分离。保留原记录，检查网络和原站当前状态；不要把一次失败自动删除入口，也不要因为 HTTP 200 就标记成人工试听通过。

## 15. 参考资料优先级

发生冲突时，按以下顺序判断：

1. 当前源码：`src/v3/`、`curriculum_v3.py`、`data/`。
2. 当前说明：`README.md`、`CHANGELOG.md`、`docs/v3-acceptance.md`。
3. 本交接文档。
4. 旧版交接文档与 `_backup/`。
5. 根目录 2026-09 历史 ZIP。

旧资料的典型过期点：

- `英语提升计划-项目交接文档.md` 顶部仍保留 v2/前 20 周升级背景。
- `english-plan-execution.md` 早期目标曾写 5.5–6.0；当前目标为 General 6.5。
- `英语提升计划-换电脑交接说明.md` 的“当前功能”和发布步骤以 2026-09 旧版为主。
- `课程升级说明-2026-10-06.md` 描述 v2 的 312 份文本结构，不能直接对应 v3 清单。
- `docs/v3-acceptance.md` 记录 3.0.1；3.1.x 功能以 `CHANGELOG.md` 和当前源码为准。

## 16. 交接完成标准

新维护者认为可以安全接手，至少应能完成：

- [ ] 从干净依赖环境启动本地网站。
- [ ] 完成三天诊断并建立周期，完成一天课堂、反馈和复测。
- [ ] 导出完整学习包，在隔离浏览器中恢复文字和录音。
- [ ] 修改一处 v3 源文件，重新构建并确认生成物更新。
- [ ] 通过构建检查、课程审计、浏览器回归和安装包校验。
- [ ] 修复或明确记录日期测试失败。
- [ ] 备份并修复主仓库 Git 对象缺失。
- [ ] 在真实设备完成一次麦克风录放和恢复抽检。
- [x] 已上传 GitHub `main` 并完成 Pages 构建；仍需在目标网络和真实设备做最终用户验收。

只要上述项目还有未完成项，就应把当前状态表述为“可本地维护的功能版本”，而不是“已全面验证并正式发布的教学产品”。







