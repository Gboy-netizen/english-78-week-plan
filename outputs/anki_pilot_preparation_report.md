# Anki 英语学习试点准备报告

核查日期：2026-10-16（Asia/Shanghai）  
核查范围：当前可访问工作区 `F:\Codex-WorkSpace\英语提升计划`、本机 Windows 元数据、官方 Anki/Anki-Connect 在线资料。所有本机 Anki 检查均为只读。

## 结论先行

- 已找到现有英语提升计划：`F:\Codex-WorkSpace\英语提升计划`。它是 78 周、约 18 个月、每天约 45–60 分钟的课程系统；最新文档口径为 IELTS General 6.5，并明确说练习和复习统计不能证明雅思成绩。
- 用户给出的审计报告路径 `E:\Codex\Codex-wu-xiang-mu\2026-10-16\referenced-chatgpt-conversation-this-is-an\outputs\Anki_OpenSource_Audit_and_SecondDevelopment_Plan_2026-10-16.md` 在本机不可访问；`E:\Codex` 盘/路径不存在。没有用猜测内容替代审计报告。
- 当前工作区及可见父级范围内没有 `AGENTS.md`。已读取根目录 README、交接文档、执行文档、来源文档和课程审查文档。
- 本机没有检测到 Anki 安装、运行进程、版本信息、用户配置目录或插件目录；没有读取卡片内容。
- 已生成 16 条小规模试点模板，覆盖词汇/搭配、短音频理解、口语复述、写作纠错；文件只放在 `outputs`，没有导入 Anki。

## 已核实的现有英语计划

已读取的主要文件：

- `F:\Codex-WorkSpace\英语提升计划\README.md`
- `F:\Codex-WorkSpace\英语提升计划\英语提升计划-项目交接文档.md`
- `F:\Codex-WorkSpace\英语提升计划\英语提升计划-换电脑交接说明.md`
- `F:\Codex-WorkSpace\英语提升计划\英语提升计划-换电脑交接贴.md`
- `F:\Codex-WorkSpace\英语提升计划\english-plan-execution.md`
- `F:\Codex-WorkSpace\英语提升计划\课程升级说明-2026-10-06.md`
- `F:\Codex-WorkSpace\英语提升计划\SOURCES.md`
- `F:\Codex-WorkSpace\英语提升计划\教案素材\00-使用索引.md`
- `F:\Codex-WorkSpace\英语提升计划\教案素材\02-词表使用说明.md`
- `F:\Codex-WorkSpace\英语提升计划\教案素材\04-视频与博主清单.md`
- `F:\Codex-WorkSpace\英语提升计划\教案素材\06-单词注释说明.md`
- `F:\Codex-WorkSpace\英语提升计划\docs\v3-acceptance.md`
- `F:\Codex-WorkSpace\英语提升计划\docs\sample-course-preview.md`
- `F:\Codex-WorkSpace\英语提升计划\data\foundation.tsv`
- `F:\Codex-WorkSpace\英语提升计划\data\diagnostic_audio.json`
- `F:\Codex-WorkSpace\英语提升计划\data\human_library.json`
- `F:\Codex-WorkSpace\英语提升计划\LICENSE`

计划与试点的衔接判断：

- 课程主线是六天训练、一天复盘，日常课堂包含听、读、说、写；前两周有基础词和短句，后续有工作、服务、预约、租房等迁移情境。Anki 只作为课后回看和主动提取工具，建议不超过每周 8 张新卡、每次 10–15 分钟，以免挤占原课程的听说读写输出。
- 外贸沟通对应交付时间、报价、确认和请求书面信息；亲子学习对应日程解释、步骤复述和简短纠错。试点每次把四种卡各放一张，便于观察迁移而不是只看“记住多少”。
- `README.md`、交接文档和课程升级说明已经把目标更新为 IELTS General 6.5；`english-plan-execution.md` 的历史章节仍出现 5.5–6.0，属于文档版本不一致，不能把旧数字当作新目标。
- 课程文档明确：自编题未经独立教师逐题审定；网页分数、AI 反馈、自评和 Anki 统计均不是 IELTS band 证据。正式判断仍需合适难度的未见材料、限时四科和可识别的人工反馈。

## Windows 与 Anki 只读盘点

| 项目 | 结果 | 证据/范围 |
|---|---|---|
| Windows | Windows 11 家庭版 中文版，版本 10.0.26300，Build 26300，64 位 | `Win32_OperatingSystem` 元数据 |
| 处理器架构 | x64；环境 `AMD64`；Intel64 Family 6 Model 140 | `Win32_ComputerSystem`、环境变量 |
| Anki 进程 | 未发现 | 只读 `Get-Process` |
| Anki 命令/可执行文件 | 未发现 | `Get-Command`、常见 Program Files/LocalAppData 路径 |
| Anki 卸载注册表项 | 未发现 | HKLM 32/64 位和 HKCU 卸载键 |
| 配置目录 | 不存在：`C:\Users\HW\AppData\Roaming\Anki2`、`C:\Users\HW\AppData\Local\Anki2`、旧目录 `C:\Users\HW\Documents\Anki` | 只读 `Test-Path`；未读取文件内容 |
| 插件目录 | 不存在：`C:\Users\HW\AppData\Roaming\Anki2\addons21` | 只读 `Test-Path` |

因此当前没有“已安装版本”可报告；也没有卡片、牌组、媒体、`prefs.db` 或插件配置被读取。

## 当前稳定版、Windows 要求、插件与许可

### Anki 稳定版

2026-10-16 通过 Anki 官方 GitHub Releases API 的 `releases/latest` 核对到：

- 稳定版：**Anki 26.09.3**
- 发布：2026-09-23；`prerelease=false`
- Windows x64 安装包：`anki-26.09.3-win-x64.msi`
- Windows ARM64 安装包：`anki-26.09.3-win-arm64.msi`

链接：<https://github.com/ankitects/anki/releases/tag/26.09.3>、<https://apps.ankiweb.net/>。

官方 Windows 文档写明：x64（Intel/AMD）需要 64 位 Windows 10 1703 或更高版本，或 Windows 11；ARM64 需要 Windows 11。当前电脑的 Windows 11 x64 满足 x64 安装条件。官方也提示最新版本可能使旧插件失效。

### 插件兼容信息

- 官方手册说明插件会修改 Anki 任意代码区域，升级后可能出现兼容问题；必要时只能暂留旧版本并向插件作者报告。
- 当前 Anki-Connect 仓库已迁移到 SourceHut：<https://git.sr.ht/~foosoft/anki-connect>。其 README 记录：需要 Anki Desktop 26.08 或更高版本，兼容性测试覆盖 26.08 和 26.09.3；AnkiWeb 插件代码为 `2055492159`；接口要求 Anki 保持运行。
- 本机没有 Anki 或插件，所以没有做实际加载、接口、版本矩阵或网络监听测试。不会安装或运行 Anki-Connect。

### 许可资料

- Anki 源码许可证：GNU AGPL v3 或更高版本；部分贡献为 BSD-3，随附组件另有 CC BY 4.0、MIT、Apache 2、LGPL 等，详见官方 `LICENSE`：<https://github.com/ankitects/anki/blob/main/LICENSE>。
- Anki 文档目录标注 CC BY-SA 4.0；这不等于牌组材料自动获得同一许可。
- Anki-Connect 旧 GitHub 仓库的 `LICENSE` 明确为 GPL-3.0：<https://github.com/FooSoft/anki-connect/blob/master/LICENSE>。当前迁移后的 SourceHut 页面未在本次抓取中单独显示许可证文件；若将插件代码再分发，应先从当前仓库确认许可证。
- 现有计划的 `SOURCES.md` 记录：LibriSpeech 音频为 CC BY 4.0；TypeWords 词典数据为 GPL-3.0；CMUdict 词音数据可自由使用但需注明来源；课程情境和本次新增示例为项目原创。试点模板只使用项目原创句子，并引用已在本地登记的 CC BY 4.0 音频位置，没有复制 IELTS 真题、教材、词典正文、网页全文或外部音频。

## 试点材料

已生成：

- [anki_pilot_deck_template.tsv](F:\Codex-WorkSpace\英语提升计划\outputs\anki_pilot_deck_template.tsv)
- [anki_pilot_readme.md](F:\Codex-WorkSpace\英语提升计划\outputs\anki_pilot_readme.md)
- 本报告：[anki_pilot_preparation_report.md](F:\Codex-WorkSpace\英语提升计划\outputs\anki_pilot_preparation_report.md)

模板包含 16 条卡：

- 4 条词汇/搭配：repeat that、written quote、confirm the delivery time、keep the same time。
- 4 条听力理解：3 条使用 `diagnostic.mp3` 的 CC BY 4.0 分段，1 条使用 `ls-004.mp3` 的 CC BY 4.0 短句；每条写出时间段、来源和“非雅思材料”限制。
- 4 条口语复述：2 条外贸情境、2 条亲子情境；背面是要点和复测方式，不要求背范文。
- 4 条写作纠错：外贸和亲子各两条，均为原创句子，背面给出改正和简短规则。

字段为：`CardID`、`阶段/日期`、`技能`、`正面提示`、`背面答案`、`例句或说明`、`音频位置`、`来源与许可`、`标签`。模板使用 UTF-8、Tab 分隔、HTML 允许和第 9 列标签提示；音频路径只是位置记录，没有导入或复制音频。

## 待确认事项

1. 最终考试是 **IELTS Academic 还是 General Training**？现有计划按 General 6.5 编写，用户本次目标写作 6–6.5，需确认是否保持。
2. 每周可投入多少时间？请分别给出原课程时间与 Anki 额外时间；若仍是每天 45–60 分钟，建议 Anki 先保持每周 8 张新卡、每次 10–15 分钟。
3. 是否接受 **AnkiWeb 云同步**？默认可保持离线；若未来开启，需先决定是否接受私人草稿、录音和亲子材料上传到第三方服务，并准备导出/回退策略。
4. 是否接受 **第三方 AI 反馈**？现有计划使用复制粘贴式 AI 反馈，但本试点不会自动上传内容；需确认是否允许把外贸邮件、录音转写或亲子练习文本粘贴给指定服务。
5. 是否接受项目内 CC BY 4.0 文学朗读作为听力热身？它不是自然对话或 IELTS 模拟；如果不接受，听力卡可先保留字段模板和原创文本，不挂音频。
6. 是否需要保存成人口语录音？亲子卡默认不上传儿童录音；如要保存，需另定本地保留和删除规则。

## 本次没有执行的操作

没有安装或升级 Anki，没有打开 Anki，没有读取 Anki 卡片、牌组、媒体或配置内容，没有安装/运行 Add-on 或 Anki-Connect，没有启用同步，没有导入 TSV，没有修改 Anki 源码、配置或用户数据，没有发布或上传任何内容。原因是本指令只授权只读盘点和准备可审阅材料；这些操作也会改变程序或用户数据，需要你另行明确批准。

若你随后明确回复“批准导入试点牌组”，仍应在导入前把具体版本、牌组、音频复制范围、备份位置和回退步骤再次列成可审阅清单，再按批准范围执行。

## 官方核查链接

- 稳定版与安装包：<https://github.com/ankitects/anki/releases/tag/26.09.3>
- Windows 安装要求：<https://docs.ankiweb.net/manual/platform/windows/installing.md>
- 插件说明：<https://docs.ankiweb.net/manual/addons.md>
- 文本导入格式：<https://docs.ankiweb.net/manual/importing/text-files.md>
- 用户数据路径：<https://docs.ankiweb.net/manual/files.md>
- 同步说明：<https://docs.ankiweb.net/manual/syncing.md>
- Anki 许可证：<https://github.com/ankitects/anki/blob/main/LICENSE>
- Anki-Connect 当前仓库与兼容说明：<https://git.sr.ht/~foosoft/anki-connect>
- Anki-Connect 旧仓库许可证：<https://github.com/FooSoft/anki-connect/blob/master/LICENSE>