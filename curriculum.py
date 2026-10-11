"""Authored learning content; shared by the offline page and the published site."""

PLAN_START = "2026-09-16"
FEISHU_URL = "https://lcnuc385mul3.feishu.cn/base/NO5xbN5lcaMRmEs8oqmcBnaMnOc"

PHASES = [
    ("P1", "重新开口", 1, 10, "恢复常用词和发音，把自我介绍从一句扩展到三分钟。", ["音标与短句", "一句句介绍自己", "混淆音跟读", "开口对话", "脱稿说一小段", "本轮复习", "回顾与轻松输入"]),
    ("P2", "日常交流", 11, 20, "在点餐、购物、问路等场景中，能主动提问并回应。", ["核心句跟读", "角色扮演", "听句子抓信息", "换角色再对话", "不用稿子重演", "场景总复习", "回顾与预习"]),
    ("P3", "听懂并接着说", 21, 30, "精听短篇，抓住人物、时间和原因，再用自己的话复述。", ["短篇精听", "写自己的经历", "难句跟读", "串联复述", "回答五个追问", "听说总复习", "轻松输入"]),
    ("P4", "读懂句子", 31, 40, "用基础语法读懂短文，练习从句、非谓语和条件句。", ["语法与例句", "短文朗读", "摘句与仿写", "复述文章", "说自己的生活句", "语法阅读复习", "轻松阅读"]),
    ("P5", "表达完整想法", 41, 50, "把日常经历写成约100词短文，并能连贯地说出来。", ["精听与跟读", "写一段日记", "影子跟读", "口述日记", "观点与理由", "改写和重听", "回顾与轻松输入"]),
    ("P6", "认识雅思题型", 51, 60, "熟悉 General 阅读、书信写作和听说题型，建立错题分析习惯。", ["听力分项练习", "阅读信息定位", "词汇与同义表达", "阅读复盘", "General Task 1 书信", "本轮错题复习", "自由对话"]),
    ("P7", "分项强化", 61, 70, "练习限时作答：书信至少150词，议论文至少250词，口语按三部分练习。", ["听力精练", "阅读限时练习", "长句与同义替换", "Task 2 议论文", "口语三部分模拟", "分项模拟与复盘", "回顾与调整"]),
    ("P8", "查漏补缺", 71, 78, "用官方样题检查薄弱项，安排专项复习及单独的完整模考。", ["听力弱项", "阅读弱项", "长句复盘", "Task 2 限时终练", "口语三部分终练", "分项检查与复盘", "总结与下一步"]),
]

# Lines are deliberately short enough to shadow before attempting free speech.
FOUNDATION = [
    ("第一次介绍自己", "Hi, my name is Alex. / I am learning English. / Nice to meet you.", "你好，我叫 Alex。／我正在学英语。／很高兴认识你。", "把 Alex 换成你的名字，读三遍，再遮住文本说一遍。"),
    ("问候与礼貌回应", "Good morning. / How are you? / I am fine, thanks. And you? / Have a good day.", "早上好。／你好吗？／我很好，谢谢。你呢？／祝你今天愉快。", "分别扮演两个人，练习问候和回应，不用追求速度。"),
    ("说说你住在哪里", "I am from China. / I live in a city. / My home is near a park. / It is quiet here.", "我来自中国。／我住在一座城市。／我家在公园附近。／这里很安静。", "按真实情况替换国家、城市和附近地点，不必透露详细住址。"),
    ("工作或学习", "I work in an office. / I study English after work. / I want to speak clearly. / I practise a little every day.", "我在办公室工作。／我下班后学英语。／我想说得清楚。／我每天练习一点。", "如果是学生，可把第一句换成 I am a student。说出你的真实情况。"),
    ("介绍一个熟悉的人", "This is my friend, Sam. / Sam is a teacher. / We like music. / We often talk after work.", "这是我的朋友 Sam。／Sam 是老师。／我们喜欢音乐。／我们经常下班后聊天。", "选一位家人或朋友，换名字和职业。人物信息可以虚构用于练习。"),
    ("兴趣爱好", "In my free time, I like reading. / I also like cooking. / I walk in the park after dinner. / It helps me relax.", "空闲时我喜欢读书。／我也喜欢做饭。／我晚饭后在公园散步。／这让我放松。", "选两项真实爱好，练习 I like + 动词-ing，例如 walking。"),
    ("一天中的时间", "I get up early. / I work during the day. / I study for twenty minutes in the evening. / Tomorrow I will try again.", "我早起。／我白天工作。／我晚上学习二十分钟。／明天我会再试试。", "用自己的时间替换 twenty minutes；重点读清楚 today 和 tomorrow。"),
    ("点一杯饮料", "Hello. I would like a coffee, please. / Small or large? / Small, please. / Would you like milk? / Yes, please. Thank you.", "你好，我想要一杯咖啡。／小杯还是大杯？／小杯，谢谢。／要加牛奶吗？／好的，谢谢。", "练两轮：先买咖啡，再把 coffee 换成 tea。"),
    ("在商店求助", "Excuse me. Could you help me? / Of course. / How much is this? / It is five pounds. / Can I pay by card? / Yes, you can.", "打扰了，能帮我吗？／当然。／这个多少钱？／五英镑。／我可以刷卡吗？／可以。", "替换商品和价格，练习先求助、再问价、最后付款。"),
    ("表达目标与请求重复", "I am learning English because I want to travel. / I can say a little now. / Please speak slowly. / Could you repeat that? / I will keep trying.", "我学英语是因为我想旅行。／我现在能说一点了。／请说慢一点。／你能重复一下吗？／我会继续尝试。", "把 travel 换成你的学习原因。不会时先用请求重复的句子保持交流。"),
]

SCENARIOS = [
    ("咖啡店", "A: What would you like? / B: A small coffee, please. / A: For here or to go? / B: To go, please. / A: Anything else? / B: No, thank you. / A: That is three pounds. / B: Can I pay by card?", "点单、选择堂食或外带、付款。关键词：to go 外带；anything else 还需要别的吗。"),
    ("超市", "A: Excuse me. Where can I find rice? / B: It is in aisle four. / A: Thank you. Is this bag on sale? / B: Yes, it is two pounds today. / A: I will take one. / B: Do you need a bag? / A: No, I brought my own.", "询问商品位置与价格。aisle 过道；on sale 打折；my own 我自己的。"),
    ("问路", "A: Excuse me. How do I get to the library? / B: Go straight and turn left at the lights. / A: Is it far? / B: No, about ten minutes on foot. / A: Is it next to the bank? / B: Yes, just opposite the park. / A: Thanks for your help.", "确认方向、步行时间和地标。opposite 在……对面；on foot 步行。"),
    ("公交车", "A: Does this bus go to the station? / B: Yes, it does. / A: How much is a single ticket? / B: Two pounds. / A: Can I pay here? / B: Yes. Please keep your ticket. / A: Could you tell me when to get off? / B: Of course.", "确认目的地、购票和下车点。single ticket 单程票；get off 下车。"),
    ("酒店", "A: Hello, I have a reservation. / B: What name is it under? / A: Alex Chen. / B: Two nights, is that right? / A: Yes. Is breakfast included? / B: Yes, from seven to ten. / A: What time is check-out? / B: Eleven in the morning.", "确认预订、早餐和退房时间。included 包含在内；check-out 退房。"),
    ("预约", "A: I would like to make an appointment. / B: Is Friday morning convenient? / A: I am afraid I work then. / B: How about Friday afternoon? / A: Three o'clock would be fine. / B: Could I have your name? / A: Alex. Thank you.", "提出预约并协商时间。convenient 方便的；How about ...？……怎么样？"),
    ("同事聊天", "A: How was your weekend? / B: It was relaxing. I went for a walk. / A: Where did you go? / B: To the park near my home. / A: Did you go alone? / B: No, with a friend. / A: That sounds nice.", "用过去时说周末经历，并追问地点和同行的人。alone 独自。"),
    ("餐厅", "A: Are you ready to order? / B: Yes. What do you recommend? / A: The vegetable soup is popular. / B: I will have that, please. / A: Anything to drink? / B: Just water, thank you. / A: Certainly. / B: Could we have the bill later?", "询问推荐、点餐和结账。recommend 推荐；bill 账单。"),
    ("换货", "A: I bought this shirt yesterday. / B: Is there a problem with it? / A: It is too small. Can I exchange it? / B: Do you have the receipt? / A: Yes, here it is. / B: What size would you like? / A: A medium, please.", "说明问题并提出具体请求。exchange 换货；receipt 收据；medium 中号。"),
    ("邀请朋友", "A: Are you free on Saturday? / B: Yes, in the afternoon. / A: Would you like to have lunch together? / B: I would love to. Where shall we meet? / A: At the cafe near the station. / B: Great. What time? / A: One o'clock. / B: See you then.", "发出邀请、确定时间和地点。I would love to 我很愿意；shall we ...？我们……好吗？"),
]

# Original short texts, not IELTS past papers. Each has answers grounded in its text.
PASSAGES = [
    ("一次改变", "Last month, Maya decided to walk to work twice a week. The journey takes thirty minutes, ten minutes longer than the bus. At first, she worried about being late, so she left home earlier. She now enjoys noticing the trees and small shops along the way. On rainy days, she still takes the bus. She does not think a good habit needs to be perfect. It simply needs to fit her life. Her next goal is to invite a colleague to walk with her on Fridays.", "Maya 每周步行上班两次；路程30分钟，比公交多10分钟。雨天仍坐公交。习惯要适合生活。", [("How long does the walk take?", "Thirty minutes."), ("What does Maya do on rainy days?", "She takes the bus."), ("Why did she leave home earlier?", "She worried about being late.")]),
    ("社区图书馆", "A small library in Westford used to close at five o'clock every day. Local workers said that they could never visit after work. The library asked residents to complete a survey. As a result, it now stays open until eight on Tuesdays and Thursdays. The change did not require more staff because it opens later on those mornings. Since the new timetable began, evening visits have increased. The library also offers a free conversation group on Thursday evenings. New members should register at the front desk.", "图书馆根据居民调查调整开放时间：周二、周四开到20点，同时推迟当天早上的开门时间。", [("Which days have longer evening hours?", "Tuesdays and Thursdays."), ("Why were more staff not needed?", "The library opens later on those mornings."), ("Where should new group members register?", "At the front desk.")]),
    ("第一次独自旅行", "Ben took his first trip alone last summer. He planned to visit three cities in one week, but soon realised that he was spending most of his time on trains. After two days, he changed his plan and stayed in a small coastal town. Each morning, he visited the market and practised ordering breakfast in the local language. He made mistakes, but people were usually patient. By the end of the trip, he felt more confident. He learned that leaving space in a travel plan can lead to unexpected experiences.", "Ben 原本想一周去三座城市，后来选择留在海边小镇，练习当地语言并建立信心。", [("When did Ben travel alone?", "Last summer."), ("Why did he change his plan?", "He was spending most of his time on trains."), ("What did he practise at breakfast?", "Ordering in the local language.")]),
    ("共享花园", "The residents of an apartment building turned an unused corner into a garden. They began with herbs because these were inexpensive and easy to grow. Every family chose one evening a week to water the plants. In the first month, some plants died because they received too much water. The group made a simple chart to record each watering. Later, children painted signs with the names of the plants. The garden now provides fresh herbs and a reason for neighbours to talk. Its greatest benefit may be the friendships it has created.", "邻居们建立共享花园，用记录表解决重复浇水的问题。花园也帮助大家建立友谊。", [("Why did they start with herbs?", "They were inexpensive and easy to grow."), ("Why did some plants die?", "They received too much water."), ("Who painted the signs?", "The children.")]),
    ("学习新技能", "When Sara started learning to cook, she often chose recipes that were too difficult. Dinner took hours, and she felt disappointed with the results. A friend suggested repeating one simple dish until she felt comfortable making it. Sara chose vegetable soup. Each week, she changed one ingredient and wrote a short note about the taste. After a month, she could make the soup without looking at the recipe. She then moved on to a second dish. Learning a little at a time helped her enjoy the process and waste less food.", "Sara 从复杂菜谱改为反复练一道简单的汤，逐步尝试新食材，建立信心。", [("What was Sara's first simple dish?", "Vegetable soup."), ("What did she change each week?", "One ingredient."), ("When could she cook without the recipe?", "After a month.")]),
    ("灵活办公", "A design company tested flexible working hours for three months. Employees could begin between seven and ten in the morning, but everyone had to be available from ten until three. Parents found it easier to take children to school. Some employees preferred an early start so they could avoid busy trains. However, arranging meetings with overseas clients was sometimes difficult. At the end of the trial, the company kept the system and introduced one shared calendar. Managers said that clear communication mattered more than the time people arrived.", "公司试行弹性上班，规定共同在线时间。共享日历帮助协调会议，清楚沟通很重要。", [("How long was the trial?", "Three months."), ("When did everyone have to be available?", "From ten until three."), ("What tool did the company introduce?", "One shared calendar.")]),
    ("维修而非替换", "Leo's favourite lamp stopped working. He was ready to buy a new one when he saw a notice for a community repair event. Volunteers checked small household items and explained common problems. A retired electrician helped Leo replace a damaged cable. The repair cost less than a new lamp, and Leo learned how the lamp worked. The volunteers stressed that dangerous electrical repairs should always be left to trained people. Leo later brought a torn bag to another event, where he learned a simple sewing technique.", "Leo 参加社区维修活动，在专业志愿者帮助下修好台灯，后来又学习缝补。", [("What was wrong with the lamp?", "It had a damaged cable."), ("Who helped Leo?", "A retired electrician."), ("What did Leo bring to a later event?", "A torn bag.")]),
    ("选择交通方式", "A town council wanted to reduce traffic near the main school. Instead of immediately closing the road, it tested a walking bus: children met at three collection points and walked together with adult volunteers. Families who lived further away could drive to a collection point. After six weeks, fewer cars stopped outside the school gate. Some parents still needed to drive because of their work schedules. The council therefore kept a short drop-off period. The trial showed that offering several practical choices could work better than a single strict rule.", "市政试行家长志愿者带领的步行上学小组，也保留短时接送窗口，照顾不同家庭需求。", [("Who walked with the children?", "Adult volunteers."), ("How long did the trial last?", "Six weeks."), ("Why did some parents still need to drive?", "Because of their work schedules.")]),
    ("数字习惯", "Nina used to check messages while eating breakfast. She often reached work feeling rushed, even when she had woken up early. She decided to leave her phone in another room for the first twenty minutes of the day. At first, she worried about missing urgent news. After a week, she noticed that most messages could wait. She now uses that quiet time to eat slowly and plan one important task. She still uses her phone throughout the day, but the small boundary makes her mornings feel calmer.", "Nina 将起床后前20分钟设为不用手机的时间，专心吃早餐、安排任务，早晨更从容。", [("Where does Nina leave her phone?", "In another room."), ("How long is her phone-free period?", "Twenty minutes."), ("What does she plan during breakfast?", "One important task.")]),
    ("主动交流", "At an international volunteer event, Omar found it difficult to join conversations. He could understand individual words but needed time to form replies. Instead of trying to speak perfectly, he prepared three questions about people's work and interests. When he did not understand an answer, he asked the speaker to repeat it more slowly. By the afternoon, he had talked to five people. He still made grammar mistakes, but he realised that showing interest kept the conversation going. The experience encouraged him to practise short conversations more regularly.", "Omar 准备了三个关于工作与兴趣的问题，不懂时请求重复，用好奇心维持交流。", [("What did Omar prepare?", "Three questions about work and interests."), ("What did he do when he did not understand?", "He asked the speaker to repeat more slowly."), ("How many people had he spoken to by the afternoon?", "Five people.")]),
]

LETTERS = [
    "You recently stayed at a hotel and left a bag in your room. Write to the manager. Describe the bag, explain when and where you left it, and ask how it can be returned.",
    "A friend is moving to your town. Write to your friend. Describe the area, suggest somewhere to live, and offer help with the move.",
    "You want to attend a course but cannot find some information. Write to the course organiser. Explain which course interests you, ask about the timetable, and ask about the fees.",
    "Your neighbour has helped you while you were away. Write to thank your neighbour. Explain what their help meant to you, describe your trip briefly, and invite them for a meal.",
    "You bought a household item that does not work. Write to the shop manager. Describe the item, explain the problem, and say what you would like the shop to do.",
    "You cannot attend a meeting at work. Write to your manager. Explain why, apologise, and suggest another time or a way to contribute.",
    "Your local library is asking for suggestions. Write to the librarian. Explain how you use the library, suggest one improvement, and describe who would benefit.",
    "You are planning a group trip. Write to a travel company. Describe your group, explain your preferred activities, and ask for a price estimate.",
    "You have moved to a new home. Write to a friend. Describe your new home, explain why you moved, and invite your friend to visit.",
    "You would like to volunteer at a community event. Write to the organiser. Explain your interest, describe useful skills, and say when you are available.",
]

ESSAYS = [
    "Some people prefer living in a large city, while others prefer a small town. Discuss both views and give your own opinion.",
    "People should spend more time learning practical skills than studying academic subjects. To what extent do you agree or disagree?",
    "Working from home has become more common. What are the advantages and disadvantages of this change?",
    "Some people think children should learn to cook at school. To what extent do you agree or disagree?",
    "Public transport should be free for everyone. To what extent do you agree or disagree?",
    "Many people buy new products instead of repairing old ones. Why does this happen? What problems can it cause?",
    "Some people prefer to travel alone; others prefer travelling in a group. Discuss both views and give your opinion.",
    "Technology makes communication easier, but some people feel more isolated. Discuss both views and give your opinion.",
    "Employers should allow staff to choose flexible working hours. To what extent do you agree or disagree?",
    "People are finding it difficult to maintain healthy daily habits. What are the causes, and what solutions can you suggest?",
]

GRAMMAR = [
    ("一般现在时与过去时", "I walk to work every day. / I walked to work yesterday.", "He ___ to work yesterday. (walk / walked)", "walked：yesterday 表示过去。"),
    ("主谓一致", "She works in a library. / They work in a library.", "My friend ___ English every day. (study / studies)", "studies：一般现在时，第三人称单数。"),
    ("定语从句", "The town that I visited was quiet. / I met a guide who spoke English.", "The person ___ helped me was kind. (who / where)", "who：先行词 person 指人，关系词在从句中作主语。"),
    ("because 与 although", "I stayed home because it rained. / Although it rained, I went out.", "___ it was late, we continued. (Although / Because)", "Although：尽管很晚，我们还是继续；与预期相反。"),
    ("动名词", "I enjoy cooking. / Learning a little every day helps.", "She enjoys ___. (read / reading)", "reading：enjoy 后接动词-ing形式。"),
    ("不定式", "I want to learn. / I use a calendar to plan my week.", "I decided ___ early. (leave / to leave)", "to leave：decide 后接 to do。"),
    ("现在完成时", "I have finished my homework. / She has lived here for two years.", "She ___ lived here since 2024. (has / have)", "has：主语 she 用 has；since 引出起始时间。"),
    ("第一条件句", "If it rains, I will take the bus.", "If I have time, I ___ help you. (will / would)", "will：表达可能发生的将来条件和结果。"),
    ("第二条件句", "If I had more time, I would read more.", "If I were you, I ___ start with a short text. (will / would)", "would：表示假设情况，If I were you 是常用表达。"),
    ("比较与连接", "Walking is slower than cycling. / However, it is relaxing.", "This route is shorter ___ the other one. (than / then)", "than：用于比较；then 表示然后。"),
]


def build_curriculum():
    phases = [{"id": p, "title": title, "start": start, "end": end, "goal": goal, "tasks": tasks}
              for p, title, start, end, goal, tasks in PHASES]
    foundation = [{"title": title, "text": text, "translation": translation, "instruction": instruction}
                  for title, text, translation, instruction in FOUNDATION]
    scenarios = [{"title": title, "text": text, "translation": translation}
                 for title, text, translation in SCENARIOS]
    passages = [{"title": title, "text": text, "translation": translation,
                 "questions": [{"question": q, "answer": a} for q, a in questions]}
                for title, text, translation, questions in PASSAGES]
    grammar = [{"title": title, "text": text, "question": question, "answer": answer}
               for title, text, question, answer in GRAMMAR]
    target = {
        "exam": "IELTS General Training",
        "overall": 6.5,
        "safeMinimumEach": 6.0,
        "note": "内部准备门槛：四项均至少6.0且总分至少6.5；这不是官方报名或成绩规则。",
        "gates": [
            {"id": "baseline", "label": "起点诊断（不判定达标）", "overall": 0, "minEach": 0},
            {"id": "w10", "label": "W10 课程检查（不换算分数）", "overall": 0, "minEach": 0},
            {"id": "w20", "label": "W20 基础检查（不换算分数）", "overall": 0, "minEach": 0},
            {"id": "w30", "label": "W30 迁移检查（不换算分数）", "overall": 0, "minEach": 0},
            {"id": "w40", "label": "W40 技能检查", "overall": 5.5, "minEach": 5.0},
            {"id": "w50", "label": "W50 写说检查", "overall": 5.5, "minEach": 5.0},
            {"id": "w60", "label": "W60 题型检查", "overall": 6.0, "minEach": 5.5},
            {"id": "w70", "label": "W70 分科检查", "overall": 6.0, "minEach": 5.5},
            {"id": "w72", "label": "W72 模考检查", "overall": 6.5, "minEach": 6.0},
            {"id": "final", "label": "最终模考", "overall": 6.5, "minEach": 6.0},
        ],
    }
    return {"start": PLAN_START, "feishu": FEISHU_URL, "phases": phases,
            "target": target,
            "foundationLessons": foundation, "scenarios": scenarios, "passages": passages,
            "grammar": grammar, "letters": LETTERS, "essays": ESSAYS}
