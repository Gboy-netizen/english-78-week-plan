# 来源与许可

- 课程文字、前两周基础例句、场景对话和短文：本项目自编，用于练习，不是雅思真题。
- 分阶段词表：基于 `first20hours/google-10000-english` 的词频参考，保留在 `教案素材/` 中。
- 词条释义与例句：使用本地保存的 TypeWords 词典数据，优先采用直接词条；`notes` 等人工校正记录在 `data/overrides.json`。
- 美式音标：从 [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict) 的美式 ARPABET 词条转换为 IPA，保存于 `data/us_pronunciations.json`；词典未收录时不展示旧英式音标。CMUdict 由卡内基梅隆大学创建，可自由使用和再分发，原项目请求使用者注明来源。转换和三个组合词的补充规则见 `tools/import_cmudict.py`。
- 发音：优先调用设备的英语（美国）语音；设备语音不可用时，尝试有道词典的在线美式发音。在线服务受网络和服务状态影响。
- 雅思资料入口：链接到 British Council 与 IELTS 官方页面，页面内容和考试规则以官方最新信息为准。

TypeWords 是 [zyronon/TypeWords](https://github.com/zyronon/TypeWords)，采用 GPL-3.0。项目只借鉴其集中练词和错词复习思路；内嵌词典数据的再分发请同时遵守原项目许可证。
