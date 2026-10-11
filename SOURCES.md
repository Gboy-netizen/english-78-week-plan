# v3 新增来源与核验规则

- 本地真人音频：LibriSpeech dev-clean，来源 https://www.openslr.org/12 ，原始语料明确采用 CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ 。保留Vassil Panayotov署名、原始LibriVox朗读者、章节、utterance ID、拼接/转码说明；逐文件记录见 `data/human_library.json` 和 `assets/human/CREDITS.txt`。文学录音用于语言练习，不是自然对话、真人配音的原创脚本或IELTS试卷。
- 基础诊断：从同一许可语料抽取三位不同朗读者的简单短句，单独记录于 `data/diagnostic_audio.json`；拼接不表示他们在真实对话。
- ELLLO： https://elllo.org/ ，仅提供分级原页面和公开流播放网址。未确立本项目可重发布其全文及音频的权利，因此不打包这些材料；链接访问、文件解码、人工试听分别记录。
- ZIP工具：fflate 0.8.3，MIT，完整许可随 `assets/vendor/fflate-LICENSE.txt` 分发。
- 学习依据：Dunlosky等学习技术综述 https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html 与 Nation四要素框架 https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2007-Four-strands.pdf 。具体分钟安排和阈值为本项目设计参数，不保证提分。
- 核验日期仅来自实际操作；构建不产生人工核验日期。旧构建自动日期只保留为历史声明，新版视频均待核验。
- 新增生活与工作迁移案例为原创教学情境；机构、人物、规则均为虚构，不是实际服务建议。自编题尚未独立人工审定，候选证据不等于标准化校准。

---

## 历史版本来源记录（含旧版系统语音说明）

# 来源与许可

- 2026-10-06 的 `course_content.py`：20篇阅读、20段对话、20篇迁移测验材料、226道客观题与中文解析，以及配套语法、写作和角色任务，均为本项目原创练习，随项目许可再分发。材料中的人名、费用、机构与规则均为教学情境，不是实际服务承诺。听力通过现有系统语音服务朗读，不是采购或采集的真人录音。第10、20周检查不是官方或标准化测评，成绩不可换算雅思分数。

- 课程文字、前两周基础例句、场景对话和短文：本项目自编，用于练习，不是雅思真题。
- 2026-09-19 新增100个基础词用法说明及5篇入门短文（含逐句译文、理解题和解析），均为本项目编写。用法区分参考 [Cambridge: work](https://dictionary.cambridge.org/us/dictionary/english/work)、[learn, teach or study](https://dictionary.cambridge.org/us/grammar/british-grammar/word-choice-learn-teach-or-study)，未批量复制词典正文。
- 发音课程新增 26 个字母名、47 个独立 IPA 学习项、7 个美式语流主题和 11 组最小对立词。课程说明及少量补充例词音标保存在 `data/pronunciation.json`。美式主线采用 General American 宽式音位记法（/i u ɑ ɔ oʊ ɝ ɚ/，R 学习卡写 /ɹ/）；英式对照采用传统非卷舌 RP 记法（如 /ɒ əʊ ɜː/）。[ɾ] 和 [ɫ] 是音位的实际变体，不作为额外音位。英国当代口音并非都保持传统 RP 的 /ɪə ɛə ʊə/。
- 原有 48 张美式发音卡仍可在课程中展开，包含组合音，不等于 48 个独立音位。参考入口为 [TypeWords 音标](https://typewords.cc/phonetics)；未复制其页面、视频或录音。
- 分阶段词表：基于 `first20hours/google-10000-english` 的词频参考，保留在 `教案素材/` 中。
- 词条释义与例句：使用本地保存的 TypeWords 词典数据，优先采用直接词条；`notes` 等人工校正记录在 `data/overrides.json`。
- 美式音标：从 [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict) 的美式 ARPABET 词条转换为 IPA，保存于 `data/us_pronunciations.json`；词典未收录时不展示旧英式音标。CMUdict 由卡内基梅隆大学创建，可自由使用和再分发，原项目请求使用者注明来源。转换和三个组合词的补充规则见 `tools/import_cmudict.py`。
- 英式词条音标：`data/uk_pronunciations.json` 包含 6591 条，构建时优先应用 `data/uk_overrides.json` 的人工校正，其余取自原 TypeWords 词典标注或 [open-dict-data/ipa-dict 的 en_UK 数据](https://github.com/open-dict-data/ipa-dict)。来源保存在生成页面每条记录的 `ukSource` 字段。TypeWords 与 ipa-dict 来源遵守各自的 GPL-3.0 条款。这是词条查询用的混合词典，并非逐条人工审定的单一 RP 词典；1352 个未核实词条留空。自动来源可能包含词义混淆、地区差异或过细的语音记法，重要词请再对照权威词典。
- 字母和单词录音：优先调用设备中对应的 `en-US` 或 `en-GB` Web Speech 语音；设备没有对应语音或调用失败时，分别尝试有道词典 `dictvoice?type=2`（US）和 `type=1`（UK）。这两条在线回退依赖第三方服务与网络，无法离线保证。页面不把 IPA 字符串交给普通 TTS 朗读。
- 单音录音：46 个 MP3 为 [Wikimedia Commons](https://commons.wikimedia.org/) 文件的 MP3 转码，嵌入离线网页；47 张学习卡中 /ɝ/ 与 /ɚ/ 共用一个 R 色彩元音示范。逐文件原页、署名、许可和许可链接保存在 `data/phoneme_audio_credits.json`，页面底部「单音录音署名与许可」也可查阅。原件分别采用 CC BY-SA 3.0、CC BY-SA 4.0、CC0 或公共领域许可；MP3 是 Commons 提供的转码，原件格式与作者见各文件页。这些录音示范独立发音动作，不保证覆盖 General American 各地区的全部音值变化。
- 音标详情的视频：页面只嵌入公开教学页的 YouTube 播放器，不下载或重新分发视频。UBC eNunciate 的 [Sounds of the World's Languages](https://enunciate.arts.ubc.ca/linguistics/world-sounds/) 提供逐音录音、舌位超声/口腔动画及公开视频；其动画与媒体页按 [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) 使用，动画另标 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。美式真人口型视频来自 [Rachel's English](https://rachelsenglish.com/)，每条卡片保留原教学页链接；英式补充卡也明确标出美式示范仅作口型参考。视频需联网，原平台的可用性、广告和地区限制由平台决定。
- 雅思资料入口：链接到 British Council 与 IELTS 官方页面，页面内容和考试规则以官方最新信息为准。

TypeWords 是 [zyronon/TypeWords](https://github.com/zyronon/TypeWords)，采用 GPL-3.0。项目借鉴其听写、闪卡和错词复习思路，并继续使用已注明来源的本地词典数据；复习间隔是本项目实现的简化规则，不是 TypeWords 官网描述的 FSRS。间隔练习与主动回忆的教学依据可参考 [Nature Reviews Psychology 综述](https://www.nature.com/articles/s44159-022-00089-1)。内嵌词典数据的再分发请同时遵守原项目许可证。


## 78周课程 v2 原创内容与官方引用

2026-10-06扩展：156篇核心阅读、78段听力脚本、78份迁移文本及语法/写作/口语任务均为本项目原创教学情境，包含按阶段编写的长文补充。机构、价格和服务条款均是虚构练习，不是现实机构承诺。课程文字随本项目许可发布。未复制流利说课程、付费教材或专有算法。

参考流利说公开介绍中的定级、综合训练和反馈流程：https://www.liulishuo.com/dongni.html 。不采用其商业等级到雅思分数的对照作为本项目评分公式。

官方样题链接与题目类型从 https://ielts.org/take-a-test/preparation-resources/sample-test-questions/general-training-test 于2026-10-06核验；8个听力直达链接见 `data/official_practice.json`。仅链接，不下载或再分发真人音频和试题。完整播放器可用性受网络及第三方平台影响。该页部分机考体验采用Academic阅读写作，页面提示G类用户选择对应样题。

总分算法参考 https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail 。目标6.5和建议单项6.0是学习设置，不代表官方保证或所有机构的统一门槛。内置TTS、用户录音、AI反馈与正式测评来源分别标注。
