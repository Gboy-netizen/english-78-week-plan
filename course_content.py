"""Original W1–W20 lessons. Texts are authored practice, not exam papers.

Question rows: prompt | correct option | distractor | distractor | evidence.
The build rotates options deterministically; IDs remain stable across builds.
"""
import re

UNITS = []


def add(week, title, goal, reading, meaning, dialogue, dialogue_meaning,
        reading_questions, listening_questions, grammar, grammar_questions,
        roleplay, writing, transfer, transfer_meaning, transfer_questions):
    def questions(rows, kind):
        result = []
        for index, row in enumerate(rows.strip().splitlines()):
            prompt, answer, b, c, explanation = [part.strip() for part in row.split("|")]
            options = [answer, b, c]
            rotation = (week + index) % 3
            options = options[rotation:] + options[:rotation]
            result.append(dict(id=f"w{week:02}-{kind}-{index+1}", prompt=prompt,
                               options=options, correct=options.index(answer), explanation=explanation))
        return result
    UNITS.append(dict(week=week, id=f"w{week:02}", title=title, goal=goal,
        level="入门" if week <= 5 else "基础" if week <= 10 else "基础进阶",
        reading=dict(text=reading, translation=meaning, questions=questions(reading_questions, "read")),
        listening=dict(text=dialogue, translation=dialogue_meaning, questions=questions(listening_questions, "listen")),
        grammar=dict(note=grammar, questions=questions(grammar_questions, "grammar")),
        roleplay=roleplay, writing=writing,
        minWords=20 if week <= 2 else 40 if week <= 5 else 60 if week <= 10 else 80 if week <= 15 else 100,
        speakingSeconds=30 if week <= 2 else 45 if week <= 5 else 60 if week <= 10 else 90 if week <= 15 else 120,
        transfer=dict(text=transfer, translation=transfer_meaning, questions=questions(transfer_questions, "check"))))


add(1, "认识一位新同学", "能介绍姓名、居住地、工作和学习时间，并问回对方。",
    "My name is Nina. I live in a small town. I work in a shop. My friend Leo is a student. We study English on Tuesday and Friday. Our class is at seven in the evening. I bring a notebook. Leo brings a blue pen. After class, we say one new sentence to each other. We are beginners, but we help each other.",
    "Nina 住在小镇，在商店工作；Leo 是学生。两人周二、周五晚上七点学英语，课后互说一句新句子。",
    "A: Hi, I am Omar. Are you new here? / B: Yes. My name is Mei. / A: Nice to meet you, Mei. Do you live near the school? / B: No. I live near the park. I take the bus here. / A: I walk here. Our class starts at six. / B: Thank you. Is this seat free? / A: Yes. Please sit here. / B: Thanks. I have my book, but I need a pen.",
    "Omar 与 Mei 初次见面。Mei 住在公园附近，坐公交来；课六点开始，她需要一支笔。",
    """What does Nina do? | She works in a shop. | She teaches English. | She is a student. | I work in a shop；学生是 Leo。
When is their class? | At seven in the evening. | At seven in the morning. | At six in the evening. | Our class is at seven in the evening.
What do they do after class? | Say a new sentence. | Buy a notebook. | Go to work. | After class 后的动作是互说一个新句子。""",
    """Where does Mei live? | Near the park. | Near the school. | Near the station. | I live near the park.
How does Mei get to class? | By bus. | On foot. | By train. | I take the bus here；步行的是 Omar。
What does Mei need? | A pen. | A book. | A seat for her friend. | 她已有书，但需要 a pen。""",
    "I am / you are / he或she is。介绍职业时，单数可数职业名词前通常用 a 或 an：I am a student. She is a teacher.",
    """I ___ a beginner. | am | is | are | I 搭配 am。
Leo is ___ student. | a | an | are | student 是辅音音素开头的单数可数名词，用 a。""",
    "你是新同学。先报姓名与住处，再问对方姓名、是否住得近和上课时间。第二轮换角色，并把地点换成图书馆；至少往返4轮。",
    "Introduce yourself to a new classmate. Include your name, where you live, what you do, and when you study. End with a question.",
    "I am Eva. I am a nurse. I live near a library. My English class is on Saturday morning. My brother is a teacher. He studies with me on Sunday at home. We use one book and two notebooks.",
    "Eva 是护士，住在图书馆附近；周六早上上英语课，周日在家与哥哥一起学。",
    """What is Eva's job? | Nurse. | Teacher. | Student. | I am a nurse；teacher 指哥哥。
When is Eva's class? | Saturday morning. | Sunday morning. | Saturday evening. | class is on Saturday morning。
Where do Eva and her brother study on Sunday? | At home. | At the library. | At school. | He studies with me on Sunday at home。""")

add(2, "把一天说清楚", "能按时间顺序说出日常安排，区分本人和他人的习惯。",
    "Ken gets up at six thirty. He has bread and milk for breakfast. He leaves home at seven fifteen and walks to work. His office is near his home. At noon, he eats rice with a friend. He finishes work at five. In the evening, he cooks dinner and studies English for twenty minutes. He does not study late because he gets tired. On Sunday, he gets up later and calls his mother.",
    "Ken 六点半起床，七点十五分出门，步行上班；晚上学二十分钟英语，周日会晚起并给妈妈打电话。",
    "A: What time do you start work, Lucy? / B: At nine, but I leave home at eight. / A: Do you have breakfast at home? / B: Yes. I have eggs and tea. / A: I buy breakfast near my office. Do you study after work? / B: Yes, at seven thirty. I read for fifteen minutes. / A: I study on the bus. / B: That is a good idea. I can listen on the bus tomorrow.",
    "Lucy 八点出门、九点上班，在家吃鸡蛋喝茶；七点半阅读十五分钟，明天想在公交上听英语。",
    """Why does Ken walk to work? | His office is near home. | He has no money. | The bus is late. | office is near his home；文中没有交代钱或公交问题。
How long does he study? | Twenty minutes. | Fifteen minutes. | Thirty minutes. | studies English for twenty minutes。
What does Ken do on Sunday? | Calls his mother. | Starts work early. | Studies all night. | On Sunday...calls his mother。""",
    """When does Lucy leave home? | At eight. | At nine. | At seven thirty. | 八点出门，九点才开始工作。
What does Lucy have for breakfast? | Eggs and tea. | Bread and milk. | Rice and coffee. | I have eggs and tea.
What will Lucy try tomorrow? | Listening on the bus. | Reading at nine. | Buying breakfast. | I can listen on the bus tomorrow。""",
    "一般现在时：I work，但 he/she works。否定：I do not work / she does not work；does 后动词回到原形。",
    """Ken ___ home at seven fifteen. | leaves | leave | leaving | Ken 是第三人称单数，leave 加 s。
Lucy does not ___ late. | study | studies | studying | does not 后接动词原形。""",
    "用 What time do you...? 和 Do you...? 问搭档起床、早餐、上班及学习时间。第二轮故意加入一个时间冲突，协商共同学习的时间。",
    "Describe a weekday and one thing you do differently on Sunday. Use first, then, and in the evening. Give a reason for your study time.",
    "Rosa works at a cafe. Her work starts at ten. She leaves home at nine thirty. She drinks coffee at home but eats lunch at work. After work, she walks her dog. She studies English for ten minutes before dinner, not after dinner.",
    "Rosa 九点半出门、十点开始工作；下班遛狗，晚饭前学十分钟英语。",
    """When does Rosa start work? | At ten. | At nine thirty. | After lunch. | Her work starts at ten.
Where does she eat lunch? | At work. | At home. | In the park. | eats lunch at work。
When does she study? | Before dinner. | After dinner. | Before work. | before dinner, not after dinner。""")

add(3, "描述家和房间", "能说明物品位置，并根据对方描述找到物品。",
    "Mina shares an apartment with her sister. Their kitchen is small, but there is a big table near the window. They eat and study there. Mina keeps her English books on a shelf above the table. Her sister puts her work bag under a chair. On busy mornings, they sometimes cannot find their keys. Now they have a small box beside the door. Everyone puts their keys in the box after coming home. This simple change saves time. On weekends, they move the chairs and exercise in the living room.",
    "Mina 和姐姐共住。书在桌子上方的架子上，工作包在椅子下。她们在门边放钥匙盒，解决早上找不到钥匙的问题。",
    "A: Welcome! Please put your coat on the chair. / B: Thanks. Where can I put this cake? / A: On the kitchen table, please. / B: Is the kitchen next to the bedroom? / A: No, it is opposite the bathroom. / B: I see it. Do you have a knife? / A: Yes, in the drawer below the window. / B: Here it is. Shall I make some tea? / A: That would be great. The cups are on the top shelf.",
    "客人把蛋糕放在厨房桌子上。厨房在浴室对面，刀在窗户下方的抽屉里，杯子在顶层架子上。",
    """Where are Mina's English books? | Above the table. | Under a chair. | Beside the door. | books on a shelf above the table。
Why do they use a box? | To find keys easily. | To store food. | To move their books. | 钥匙放在固定盒子里，解决找钥匙的问题。
What happens in the living room on weekends? | They exercise. | They cook. | They work in a shop. | exercise in the living room。""",
    """Where should the cake go? | On the kitchen table. | In the drawer. | On the chair. | 衣服放椅子，蛋糕放厨房桌子。
Where is the kitchen? | Opposite the bathroom. | Next to the bedroom. | Below the window. | No 后纠正为 opposite the bathroom。
Where are the cups? | On the top shelf. | In the drawer. | Under the table. | The cups are on the top shelf。""",
    "There is + 单数；There are + 复数。位置：above 在上方，under 在下方，beside 在旁边，opposite 在对面。",
    """There ___ two cups on the shelf. | are | is | am | two cups 为复数，使用 are。
The bag is ___ the chair, on the floor. | under | above | into | on the floor 提示在椅子下方，用 under。""",
    "你藏好一本书，用三个方位提示引导搭档找到它。换角色后描述厨房；对方必须追问一次 Is it next to...? 并确认位置。",
    "Describe the place where you study. Say where three things are, what you like about the space, and one change you want to make.",
    "A notice in the study room says: Keep bags under your desk. Return books to the shelf beside the door. Leave used cups on the tray near the sink. Do not put drinks beside the computers. The small table by the window is for quiet reading.",
    "自习室规定：包放桌下，书归还门边架子，杯子放水槽旁托盘，电脑旁不能放饮料。",
    """Where should bags go? | Under the desk. | Beside computers. | On the small table. | Keep bags under your desk.
Where should books go? | On the shelf beside the door. | Near the sink. | Under the desk. | Return books to the shelf beside the door.
What is the window table for? | Quiet reading. | Used cups. | Computer games. | for quiet reading。""")

add(4, "买够一顿饭", "能询问数量和价格，按预算调整购物清单。",
    "On Saturday, Ali wants to cook lunch for three friends. He checks his kitchen before going shopping. He has rice and onions, but he needs tomatoes, eggs, and milk. At the store, a large box of eggs costs four dollars. A smaller box costs two dollars. Ali buys the smaller box because he only needs four eggs. The tomatoes are cheaper today, so he buys six. He leaves the milk until last because it must stay cold. At home, he checks the receipt and puts the food away before starting to cook.",
    "Ali 为三位朋友准备午饭，先盘点现有食材。他只需四个鸡蛋，所以买两美元的小盒；牛奶最后拿，方便保冷。",
    "A: Excuse me. How much are these apples? / B: Three dollars for a bag of six. / A: I only need two apples. Can I buy them separately? / B: Yes, they are sixty cents each. / A: Great. I will take two. Where is the milk? / B: At the back, next to the yogurt. / A: Thank you. Do I need to pay for a bag? / B: A paper bag is ten cents. / A: I have my own bag, thanks.",
    "苹果六个一袋三美元，单买每个六十美分；顾客买两个，自带袋子。牛奶在后面酸奶旁。",
    """What does Ali already have? | Rice and onions. | Tomatoes and milk. | Eggs and tomatoes. | He has rice and onions。
Why does he buy the small box? | He only needs four eggs. | Large boxes are unavailable. | Small eggs taste better. | because he only needs four eggs。
Why does he get milk last? | To keep it cold. | To check its price. | To get a free bag. | because it must stay cold。""",
    """How many apples does the customer buy? | Two. | Six. | Three. | I will take two。
How much do the apples cost in total? | One dollar twenty. | Three dollars. | Sixty cents. | 两个，每个0.60美元，总价1.20美元。
Does the customer buy a bag? | No, they brought one. | Yes, for ten cents. | Yes, for free. | I have my own bag。""",
    "How many + 可数复数；How much + 不可数名词，也可直接问价格。some milk / four eggs；不要说 four milks 来表示四份未定义的牛奶。",
    """How ___ eggs do we need? | many | much | any | eggs 是可数名词复数。
We need ___ milk for breakfast. | some | a | an | milk 在此为不可数名词，用 some。""",
    "预算5美元，买水果和饮料。卖家先推荐大包装，买家说明只要少量、询问单价并算总价。换角色时把预算降到3美元，重新决定买什么。",
    "Write a shopping plan for one meal. List what you already have, what you need, quantities, and how you will stay within your budget.",
    "Today's market offers: Carrots cost one dollar per bag. Potatoes cost two dollars per bag, or three dollars for two bags. You need one bag of carrots and two bags of potatoes. Bring your own bag. The market closes at four today, one hour earlier than usual.",
    "胡萝卜每袋1美元；土豆一袋2美元、两袋3美元。今天市场四点关门，比平时提前一小时。",
    """How much is the food you need? | Four dollars. | Five dollars. | Three dollars. | 胡萝卜1美元，加两袋土豆优惠价3美元，总价4美元。
When does the market close today? | At four. | At five. | At three. | closes at four today。
What should you bring? | Your own bag. | Two empty boxes. | A receipt. | Bring your own bag。""")

add(5, "约一个共同的时间", "能发出邀请、解释冲突并确认最终安排。",
    "Emma wants to meet her friend Jay this weekend. She suggests lunch on Saturday, but Jay works until two. They decide to meet at three instead. Emma chooses a cafe near the station because Jay comes by train. On Saturday morning, the cafe sends Emma a message: it is closed for repairs. Emma finds a different cafe across from the library. She sends Jay the new address and asks him to reply. Jay confirms the change. They keep the same time. Emma writes both the time and the place in her calendar so she does not forget.",
    "Emma 和 Jay 把见面定在周六三点。原咖啡馆维修，改到图书馆对面的店，时间不变，并发消息确认。",
    "A: Would you like to go for a walk on Sunday? / B: Yes, but I have a class in the morning. / A: How about two in the afternoon? / B: Two is fine. Where shall we meet? / A: At the north gate of the park. / B: Is that the gate near the bus stop? / A: No, it is near the lake. I will send you a map. / B: Thanks. If it rains, let's meet at the library instead. / A: Good idea.",
    "周日下午两点在公园北门见，北门靠湖而不是公交站。如果下雨，就改在图书馆见。",
    """Why can't Jay meet for lunch? | He works until two. | He has a class. | His train is canceled. | Jay works until two。
Why does Emma change the place? | The first cafe is closed. | Jay dislikes coffee. | The station is too far. | closed for repairs。
What stays the same? | The meeting time. | The cafe. | The address. | They keep the same time。""",
    """When will they meet? | Sunday at two. | Saturday at two. | Sunday morning. | Sunday；上午有课，改为下午两点。
Which gate will they use? | The one near the lake. | The one near the bus stop. | The south gate. | north gate...near the lake。
Where will they meet if it rains? | At the library. | At the bus stop. | At the cafe. | If it rains...at the library instead。""",
    "邀请用 Would you like to + 动词；提议用 How about + 名词或动词-ing。时间点用 at，某一天用 on。",
    """Would you like ___ us? | to join | joining | join | would like 后接 to do。
Let's meet ___ Sunday at two. | on | in | at | 具体星期用 on；具体时刻用 at。""",
    "邀请搭档周末见面。对方必须拒绝第一个时间并解释原因；共同确定第二个时间、可识别的地点和雨天备选方案，再完整复述确认。",
    "Write a message inviting a friend out. Give a time and a place, explain your choice, and suggest an alternative if your friend is busy.",
    "Hi Max, our bike ride is now on Monday because the weather report says Sunday will be rainy. Meet me outside the sports center at nine thirty. Bring water. We can rent bikes there, so you do not need to bring your own. Please tell me tonight if you can come. Lily",
    "Lily 因周日可能下雨，把骑行改到周一九点半，在体育中心外集合；带水，车可租，今晚回复。",
    """Why has the day changed? | Rain is expected on Sunday. | The center is closed. | Max has no bike. | because...Sunday will be rainy。
What must Max bring? | Water. | His own bike. | Lunch. | Bring water；自行车可租。
When should Max reply? | Tonight. | Monday morning. | Sunday afternoon. | Please tell me tonight。""")

add(6, "问路与确认地标", "能听懂路线中的顺序、方向和地标，并用复述确认。",
    "Daniel visits a new neighborhood for a job interview. His phone map shows a short route through a park. However, the park gate is locked. He asks a woman at a flower shop for help. She tells him to follow the main road, cross at the traffic lights, and turn right after the bank. The office is in the second building on the left. Daniel repeats the directions before leaving. The longer route takes twelve minutes. He arrives ten minutes before his interview and has time to relax. Next time, he plans to check more than one route before traveling.",
    "Daniel 去面试，公园大门锁着，必须绕行。他复述路线确认，走十二分钟，提前十分钟到。",
    "A: Excuse me. Is the museum far from here? / B: About ten minutes on foot. Go straight until you reach the bridge. / A: Do I cross the bridge? / B: Yes. Then turn left, not right. / A: Left after the bridge. Is it beside the hotel? / B: It used to be. The museum has moved. It is now opposite the post office. / A: So I cross the bridge, turn left, and look for the post office. / B: Exactly. The entrance is on Green Street.",
    "去博物馆要过桥左转，新址在邮局对面；旧址才在酒店旁。入口在 Green Street。",
    """Why can't Daniel use the short route? | The park gate is locked. | His phone is broken. | The bank is closed. | the park gate is locked。
Where is the office? | In the second building on the left. | Inside the bank. | Opposite the flower shop. | second building on the left。
What does Daniel do before leaving the woman? | Repeats the directions. | Calls his employer. | Buys flowers. | repeats the directions before leaving。""",
    """What should the visitor do after crossing the bridge? | Turn left. | Turn right. | Walk back. | Then turn left, not right。
What is opposite the museum now? | The post office. | The hotel. | The bank. | now opposite the post office；hotel 是旧址地标。
Which street has the entrance? | Green Street. | Bridge Street. | Main Street. | entrance is on Green Street。""",
    "指路常用祈使句，动词原形开头：Go straight. Turn left. 否定用 Don't + 动词。then 表示接下来的步骤。",
    """___ right after the bank. | Turn | Turns | Turning | 祈使句用动词原形。
___ cross the road here; use the lights. | Don't | Doesn't | Not | 否定祈使句是 Don't + 动词。""",
    "画一个有桥、银行和图书馆的简图，给搭档三步路线。搭档先故意复述错一个方向，你要礼貌纠正，再确认终点入口。",
    "Write directions from a station to a place you know. Include at least three steps, two landmarks, and one warning about a possible mistake.",
    "Library update: The entrance on King Road is closed this week. Please use the side entrance on Lake Street. From the bus stop, walk past the bakery and take the first right. The entrance is next to a blue sign. Wheelchair users can use the ramp at the same entrance.",
    "King Road 正门本周关闭。公交站出发经过面包店，第一个路口右转，用 Lake Street 蓝标志旁侧门，轮椅也走这里。",
    """Which entrance is open? | The side entrance on Lake Street. | The entrance on King Road. | The bakery entrance. | use the side entrance on Lake Street。
When should you turn right? | After passing the bakery. | Before the bus stop. | After the second crossing. | walk past the bakery and take the first right。
Where is the wheelchair ramp? | At the same side entrance. | On King Road. | Behind the bakery. | at the same entrance。""")

add(7, "讲一次不顺利的出行", "能用过去时讲述事件、应对办法和结果。",
    "Last Friday, Grace traveled to visit her cousin. She bought a train ticket online and arrived at the station early. While she waited, an announcement said that her train was delayed by forty minutes. Grace sent her cousin a message, then asked a staff member about another train. There was an earlier service, but it stopped at a different station. Grace decided to wait for her original train because her cousin lived near its final stop. She used the extra time to read. When she finally arrived, her cousin met her with two sandwiches. The trip was slower than expected, but their evening was still enjoyable.",
    "Grace 的火车晚点四十分钟；另一班终点不同，她决定等原车，读书打发时间，最终和表亲见面。",
    "A: Did you get to the concert on time? / B: Just in time. I missed the bus at six. / A: What happened? / B: I left my ticket at home and went back for it. / A: Did you take a taxi after that? / B: No. The next bus came at six fifteen. / A: Was the traffic bad? / B: A little, but I arrived at six fifty. The music started at seven. / A: You were lucky. / B: Yes. Next time I will check my bag before leaving.",
    "去音乐会的人忘带票，错过六点公交，坐六点十五分下一班，六点五十到，音乐会七点开始。",
    """How long was Grace's train delayed? | Forty minutes. | Fifteen minutes. | An hour. | delayed by forty minutes。
Why didn't Grace take the other service? | It stopped at a different station. | It cost too much. | It was full. | different station；原车终点更靠近表亲家。
What did Grace do while waiting? | Read. | Bought sandwiches. | Visited her cousin. | used the extra time to read。""",
    """Why did the speaker go home again? | To get the concert ticket. | To get some money. | To call a taxi. | left my ticket at home。
How did the speaker finally travel? | By bus. | By taxi. | By train. | No 后解释坐了下一班公交。
How early did the speaker arrive? | Ten minutes before the start. | Fifty minutes before the start. | Fifteen minutes after the start. | 6:50 到，7:00 开始，提前10分钟。""",
    "过去事件：go→went，buy→bought，leave→left。疑问句 Did you go...? 中 did 后用原形；否定 didn't go。",
    """Yesterday I ___ a train ticket. | bought | buy | buying | Yesterday 提示过去时，buy 的过去式为 bought。
Did you ___ the bus? | miss | missed | missing | did 已承担过去时，后面用 miss 原形。""",
    "讲一次迟到或险些迟到的经历。搭档追问时间、原因和解决办法。第二轮改成车票丢了，你需要向工作人员说明过去发生了什么。",
    "Describe a journey that did not go as planned. Explain the original plan, the problem, what you did, and the final result. End with one lesson learned.",
    "Yesterday, Theo took a bus to the airport. Roadworks made the journey twenty minutes longer than usual. He had left home an hour early, so he still had time for breakfast. At the airport, he learned that his flight would leave from Gate 12 instead of Gate 8. He checked the screen again before walking to the gate.",
    "Theo 遇修路，多花二十分钟，但因提前一小时出门仍有余裕；登机口由8改12，他再核对屏幕。",
    """What caused the slow journey? | Roadworks. | A late flight. | A broken bus. | Roadworks made the journey...longer。
Why did Theo still have time? | He had left early. | The bus went faster. | His flight was delayed. | left home an hour early；没有说航班延误。
Which gate should he use? | Gate 12. | Gate 8. | Gate 20. | Gate 12 instead of Gate 8。""")

add(8, "说明不舒服与寻求帮助", "能描述简单症状、持续时间和安排；练习语言表达，不据此诊断。",
    "Ava has a sore throat and feels tired. She wants to rest, but she is worried about missing work. She calls her manager before her shift starts and explains that she is unwell. Her manager asks her to stay home and send an update the next morning. Ava then calls a local clinic. The receptionist cannot give medical advice, but offers an appointment that afternoon. Ava writes down the time and the address. She also makes a short list of her symptoms and when they started, so she can explain them clearly during the appointment. She asks her roommate to buy some food for dinner.",
    "Ava 喉咙痛、疲倦，先向经理请假，再预约诊所；她记录症状及开始时间，方便就诊时准确说明。",
    "A: Hello, I'd like to make an appointment. / B: Is it for today? / A: If possible. My ear has hurt since yesterday. / B: We have a place at three forty with Dr. Brown. / A: Is there anything earlier? / B: I'm afraid not. Please arrive ten minutes before your appointment. / A: All right. What should I bring? / B: Your ID and a list of any medicines you take. / A: Thank you. Could you repeat the time? / B: Three forty this afternoon.",
    "来电者耳朵从昨天开始疼，预约下午3:40，需提前10分钟到，带身份证件及正在用的药物清单。",
    """When does Ava call her manager? | Before her shift. | After her appointment. | The next morning. | before her shift starts。
What does the receptionist offer? | An appointment. | A diagnosis. | A meal. | cannot give medical advice, but offers an appointment。
Why does Ava write a symptom list? | To explain clearly. | To teach her roommate. | To cancel work forever. | so she can explain them clearly。""",
    """What is the caller's problem? | Ear pain. | A sore throat. | A headache. | My ear has hurt since yesterday。
When should the caller arrive? | At three thirty. | At three forty. | At three fifty. | 预约3:40，提前10分钟，即3:30。
What should the caller bring? | ID and a medicine list. | Only a bank card. | Food and water. | Your ID and a list of any medicines。""",
    "描述状态：I feel tired / My ear hurts。建议或要求可用 should + 动词原形。since + 起点，for + 时长。这里只练语言，不提供治疗建议。",
    """You should ___ ten minutes early. | arrive | arrives | arrived | should 后接动词原形。
My ear has hurt ___ yesterday. | since | for | during | yesterday 是起点，用 since。""",
    "一人扮诊所前台，一人预约。病人说明哪里不舒服、何时开始，确认预约和到达时间，并请求重复一次。前台只处理安排，不扮演医生诊断。",
    "Write a short message to your manager saying you are unwell. Explain what work needs attention, when you will send an update, and thank them for understanding.",
    "Clinic message: Your appointment with Dr. Lee on Thursday has moved from ten to eleven fifteen. Please check in fifteen minutes early. Bring your appointment letter. If the new time is not suitable, call the clinic before Wednesday afternoon. Replying to this text will not change the appointment.",
    "周四预约从10点改到11:15，提前15分钟签到；若不合适，要周三下午前电话联系，回复短信无效。",
    """What is the new appointment time? | Eleven fifteen. | Ten. | Eleven. | moved from ten to eleven fifteen。
When should the patient check in? | At eleven. | At eleven fifteen. | At ten forty-five. | 提前15分钟：11:15−15分钟=11:00。
How can the patient request another time? | Call the clinic. | Reply to the text. | Wait until Thursday. | call the clinic；短信回复不会改预约。""")

add(9, "比较两种选择", "能比较价格、路程和实用性，并给出选择的理由。",
    "Noah needs a new place to live. He visits two apartments. The first is close to his office and costs nine hundred dollars a month. It is small, and there is no space for a desk. The second costs eight hundred dollars and has a separate study area, but the bus journey to work takes thirty minutes. Noah works from home three days a week, so a quiet place to work matters to him. He chooses the second apartment. Before agreeing, he asks whether internet service is included. It is not, so he adds that cost to his budget. The cheaper rent is useful, but it is not his only reason for choosing the apartment.",
    "Noah 比较两套公寓：第一套近但贵且小；第二套便宜、有工作区但通勤远。他常居家工作，选第二套，并另算网络费。",
    "A: Which backpack do you prefer? / B: The blue one is lighter, but the black one has more pockets. / A: The blue one is forty dollars. The black one is fifty. / B: I carry a laptop every day. Is there a laptop pocket in the blue one? / A: No, but there is one in the black bag. / B: Then I will choose the black one. / A: Would you like to try it on? / B: Yes. It looks big, but it feels comfortable. / A: You can return it within fourteen days with the receipt.",
    "蓝包轻、40美元；黑包口袋多、有电脑隔层、50美元。买家每天带电脑，选黑包；14天内凭收据可退。",
    """What is an advantage of the first apartment? | It is close to work. | It has a study. | Internet is free. | close to his office。
Why is a study area important to Noah? | He often works at home. | He owns many books. | He teaches music. | works from home three days a week。
What extra cost must he include? | Internet service. | A train ticket. | A parking space. | internet...is not included。""",
    """Which bag costs less? | The blue one. | The black one. | They cost the same. | 蓝40美元，黑50美元。
Why does the customer choose black? | It has a laptop pocket. | It is lighter. | It is cheaper. | 每天带电脑，黑包有 laptop pocket。
What is needed to return the bag? | The receipt. | The original box only. | A student card. | within fourteen days with the receipt。""",
    "比较级：cheap→cheaper，comfortable→more comfortable。比较两者用 than。理由用 because + 完整句子。",
    """This bag is lighter ___ that one. | than | then | as | 比较级后用 than。
The second apartment is ___ comfortable for working. | more | most | many | 两者比较，多音节形容词前用 more。""",
    "比较两间房或两个包，从价格、大小、用途三个方面各问一题。选一个并解释；对方提出反对理由，你再决定是否改变选择。",
    "Compare two ways of traveling to work or school. Include cost, time, and comfort. Explain which one you would choose and when the other might be better.",
    "Two swimming memberships are available. Plan A costs twenty dollars a month and includes four visits. Plan B costs thirty dollars and allows unlimited visits. Both include the same pool and changing rooms. Lessons cost extra with either plan. Sam wants to swim twice a week and does not need lessons.",
    "A卡每月20美元含4次；B卡30美元不限次数。设施相同，课程都另收费。Sam 每周想游两次。",
    """Which plan covers all of Sam's intended visits? | Plan B. | Plan A only. | Neither plan. | 每周两次，一个月超过4次；B不限次数。
What costs extra under both plans? | Lessons. | Changing rooms. | Pool access. | Lessons cost extra with either plan。
How much more is Plan B per month? | Ten dollars. | Twenty dollars. | Thirty dollars. | 30−20=10美元。""")

add(10, "阶段检查：安排一次活动", "综合运用介绍、时间、路线、比较和确认；凭新材料检查迁移能力。",
    "A neighborhood group is planning a welcome morning for new residents. The event will take place at the community hall on Saturday from ten until twelve. Volunteers should arrive at nine thirty to arrange chairs. There will be a short introduction, a map activity, and a shared lunch. Guests do not need to bring food, but they should bring their own cups. The organizers first planned to use the garden. They changed the venue because rain is expected. The hall is opposite the pharmacy and has an entrance without steps. Residents can register by phone until Thursday evening. Anyone who needs help with transport should mention it when registering.",
    "新居民欢迎活动周六10–12点，志愿者9:30到。因预报下雨改在药店对面的社区大厅，带杯子，周四晚前电话报名。",
    "A: I'd like to join the welcome event with my father. / B: Of course. May I have your name? / A: Julia Park. My father uses a wheelchair. / B: The hall has an entrance without steps on the east side. / A: Thank you. Is parking available there? / B: Two spaces are reserved near that entrance. Please arrive at nine fifty. / A: Do we need to bring lunch? / B: No, lunch is provided. Just bring your cups. / A: Great. Please register us both. / B: Done. If your plans change, call us on Friday.",
    "Julia 为自己和坐轮椅的父亲报名，走东侧无台阶入口，附近有两个预留车位，9:50到，带杯子即可。",
    """Why was the venue changed? | Rain is expected. | The garden is too small. | The hall is cheaper. | changed...because rain is expected。
Who should arrive at nine thirty? | Volunteers. | All guests. | Only drivers. | Volunteers should arrive at nine thirty。
When does registration close? | Thursday evening. | Friday evening. | Saturday morning. | register...until Thursday evening。""",
    """How many people does Julia register? | Two. | One. | Three. | herself and her father；register us both。
Which entrance should they use? | The east entrance. | The garden gate. | The west entrance. | on the east side。
What time are they asked to arrive? | Nine fifty. | Nine thirty. | Ten thirty. | Please arrive at nine fifty。""",
    "综合复习：第三人称单数、过去时、介词和礼貌提问。注意区分一般参与者与志愿者的安排；同一篇材料不同人的时间可能不同。",
    """The hall ___ opposite the pharmacy. | is | are | am | hall 为单数，搭配 is。
They ___ the venue yesterday. | changed | change | changing | yesterday 对应过去时 changed。""",
    "模拟打电话报名活动，说明两人的情况、询问交通和入口、确认时间及所带物品。随后不看稿介绍自己和参加理由，目标60秒；请对方再追问两题。",
    "Write a message inviting a neighbor to the welcome event. Include the time, location, what to bring, and how to register. Explain why the event may be useful.",
    "A new cooking club meets at the school kitchen every other Sunday. The first session is on May 9, from two until four. Doors open at one forty-five. A session costs eight dollars, including ingredients. Participants bring a container to take food home. The kitchen entrance is behind the library, not through the main school door. The first session is suitable for beginners. Registration is by email, and payment is made at the session. If fewer than six people register, the organizers will cancel the class and contact everyone on Friday. You may bring a friend, but each person must register separately. Children under twelve must come with an adult. There is no parking at the school; the number 6 bus stops outside the library.",
    "烹饪俱乐部隔周日活动，首场5月9日14–16点，13:45开门；8美元含食材，带容器，从图书馆后门入。邮件报名、现场付款，不足6人取消。",
    """How often does the club meet? | Every other Sunday. | Every Sunday. | Every Friday. | every other Sunday 表示隔周日。
When does the first class begin? | At two. | At one forty-five. | At four. | 1:45开门，2:00正式开始。
What does the fee include? | Ingredients. | A container. | A bus ticket. | eight dollars, including ingredients。
How do people register? | By email. | At the main door. | By paying online. | Registration is by email；付款在现场。
When might the class be canceled? | If fewer than six register. | If a beginner joins. | If someone takes the bus. | fewer than six people register。
Can a friend attend without registering? | No, each person must register. | Yes, if they share food. | Yes, if they are over twelve. | each person must register separately。""")

add(11, "点餐与说明需求", "能说明饮食限制、询问配料并核对订单。",
    "When Lily takes a colleague to lunch, she checks the menu outside a small restaurant. Her colleague does not eat meat, so they need more than one suitable option. The menu lists vegetable soup and a mushroom sandwich. Lily asks the server whether the soup contains meat stock. It does, even though there are no pieces of meat in it. The sandwich can be made without cheese, and her colleague chooses that. Lily orders chicken with rice. Before leaving, they check the bill and notice that two coffees have been charged, although they ordered only one. The server apologizes and corrects the bill. Asking clear questions helped them avoid two different mistakes during the meal.",
    "Lily 同事不吃肉。蔬菜汤虽无肉块却用了肉汤底；同事选蘑菇三明治。账单多算一杯咖啡，服务员更正。",
    "A: Are you ready to order? / B: Almost. Does the noodle dish contain nuts? / A: The sauce contains peanuts. Do you have an allergy? / B: Yes. Could the kitchen prepare something safely without peanuts? / A: Let me check with the chef before you choose. / B: Thank you. / A: The chef says we cannot guarantee that there will be no contact with peanuts. / B: Then I won't order food here. Could I have a sealed bottle of water? / A: Certainly. / B: Thank you for checking instead of guessing.",
    "顾客对花生过敏，询问能否安全准备。厨师无法保证无接触，顾客不在此点食物，只要密封瓶装水。",
    """Why is the vegetable soup unsuitable? | It contains meat stock. | It has cheese. | It is sold out. | contains meat stock，即使没有肉块。
What does Lily's colleague choose? | The mushroom sandwich. | Chicken with rice. | Vegetable soup. | her colleague chooses that，指 sandwich。
What is wrong with the bill? | It includes an extra coffee. | It leaves out the rice. | It charges for three meals. | two coffees...ordered only one。""",
    """What ingredient is the customer avoiding? | Peanuts. | Cheese. | Meat. | The sauce contains peanuts...Yes，有过敏。
What does the server do first? | Checks with the chef. | Promises the dish is safe. | Removes the sauce immediately. | Let me check with the chef。
What does the customer finally order? | A sealed bottle of water. | Plain noodles. | A different sauce. | I won't order food...sealed bottle of water。""",
    "询问配料：Does it contain...? 礼貌请求：Could I have...? / Could you check...? does 后动词用原形。不要凭菜名推断配料。",
    """Does this soup ___ milk? | contain | contains | containing | does 后用 contain 原形。
Could you ___ the bill, please? | check | checked | checking | could 后接动词原形。""",
    "扮演服务员和顾客。询问一道菜的配料，提出替换要求；服务员遇到不确定信息应先核实。最后核对数量和账单，礼貌指出一项错误。",
    "Write a restaurant review. Describe what you ordered, a question you asked before ordering, how the staff responded, and whether you would return. Give specific reasons.",
    "Cafe notice: Our lunch deal includes one sandwich and a small hot drink for seven dollars. Cold drinks are not included. You can choose oat milk for an extra fifty cents. The deal is available before two on weekdays and is for takeout only. Ask staff for ingredient information; recipes may change.",
    "午餐套餐7美元，一份三明治加小杯热饮，不含冷饮；燕麦奶加0.50美元，工作日14点前仅外带，配料需询问。",
    """Which drink is included? | A small hot drink. | Any cold drink. | A large iced coffee. | one...small hot drink。
What is the price with oat milk? | Seven dollars fifty. | Seven dollars. | Eight dollars. | 7美元加50美分。
Can customers eat the deal inside? | No, it is takeout only. | Yes, before two. | Yes, on weekends. | for takeout only。""")

add(12, "办理入住并解决问题", "能核对预订、询问费用，并提出明确的解决请求。",
    "Marcus arrives at a hotel after a long trip. He booked a quiet room for two nights because he needs to work the next morning. At reception, he confirms that breakfast is included and asks about the internet password. When he reaches his room, he hears loud music from the street. He closes the window, but the noise continues. Marcus calls reception and explains the problem without blaming the staff. He asks whether a room facing the courtyard is available. The receptionist offers a room on a higher floor at no extra charge. Before moving, Marcus checks that the new room has a desk. He thanks the receptionist and returns the old key.",
    "Marcus 订两晚安静房，房间临街很吵。他说明问题，请求换朝庭院的房间，获免费换房并确认有书桌。",
    "A: Welcome. Do you have a reservation? / B: Yes, under Chen. Three nights. / A: I have you down for two nights. / B: My confirmation email says three, from Monday to Thursday. / A: Let me check. You are right; I will correct that. / B: Thank you. What time is checkout? / A: Eleven. We can keep your luggage afterward for free. / B: Is late checkout possible? / A: Until one, for twenty dollars. / B: I will check out at eleven and leave my bag, then.",
    "Chen 实订周一至周四三晚，前台误记两晚后更正。11点退房免费寄存，延至13点要20美元，顾客选11点退房。",
    """Why does Marcus need a quiet room? | He needs to work. | He dislikes windows. | He is hosting a party. | needs to work the next morning。
What happens when he closes the window? | The noise continues. | The music stops. | The desk breaks. | but the noise continues。
What does he check before moving? | Whether there is a desk. | Whether breakfast costs extra. | Whether the trip is canceled. | checks that the new room has a desk。""",
    """How many nights did Chen book? | Three. | Two. | Four. | confirmation email says three；不能只听前台第一次说法。
What is free after checkout? | Luggage storage. | A room until one. | An extra breakfast. | keep your luggage afterward for free。
What does Chen choose? | Checkout at eleven. | Pay for late checkout. | Stay another night. | I will check out at eleven。""",
    "预订持续时间用 for two nights；日期范围用 from Monday to Thursday。there is/are 询问设施是否存在，have 说明房间具有什么。",
    """I booked a room ___ three nights. | for | since | at | for 后接持续时长。
Does the room ___ a desk? | have | has | having | does 后使用 have 原形。""",
    "入住时前台把日期或房型记错。拿预订确认信息礼貌纠正，再询问早餐、退房、寄存费用。换角色后处理房间噪声，提出具体替换要求。",
    "Write an email to a hotel about a problem during your stay. Give the dates, explain what happened and how it affected you, and request a reasonable solution.",
    "Guest information: Breakfast is served from six thirty to nine thirty on weekdays and until ten on weekends. Guests in standard rooms pay twelve dollars for breakfast; it is included for family rooms. Please book the airport shuttle the evening before departure. The shuttle is free, but seats are limited.",
    "早餐工作日6:30–9:30，周末到10点。标准房早餐12美元，家庭房已含。免费机场班车需前晚预约，座位有限。",
    """When does Saturday breakfast end? | At ten. | At nine thirty. | At six thirty. | weekends...until ten。
Who pays extra for breakfast? | Standard-room guests. | Family-room guests. | Every guest. | standard rooms pay twelve dollars。
What must shuttle users do? | Book the evening before. | Pay twelve dollars. | Arrive without booking. | book...the evening before departure。""")

add(13, "退换货与售后", "能区分故障、尺码和偏好问题，说明购买凭据与期望处理。",
    "Zoe buys a desk lamp from a local store. It works well on the first evening, but the switch stops working two days later. She checks the cable and tries another socket before contacting the store. Zoe takes a short video of the problem and finds her receipt. At the service desk, she explains what she has already tried. The assistant offers a replacement, but the same model is temporarily unavailable. Zoe can wait a week or receive a refund immediately. Since she needs a lamp for evening classes, she chooses the refund and buys a different model elsewhere. She keeps the receipt for the new lamp in a folder instead of throwing it away.",
    "Zoe 的台灯开关两天后失灵，排查插座并拍视频。原型号暂缺，可等一周或立即退款；她急用，选退款。",
    "A: I'd like to exchange these shoes. / B: What seems to be the problem? / A: They are too tight. I bought them yesterday and only tried them indoors. / B: Do you have the receipt? / A: Yes, here it is. / B: We have the next size in brown, but not in black. / A: I need black shoes for work. Can you order them? / B: Yes. They should arrive on Tuesday. We will call you. / A: That works. Can I keep this pair until then? / B: Please leave them here; I will give you an exchange receipt.",
    "鞋太紧，要换大一码黑鞋；店里只有棕色，黑色需订、预计周二到。旧鞋留店，拿换货凭据。",
    """What problem develops with the lamp? | The switch stops working. | The shade is too small. | The light is too bright. | the switch stops working。
Why doesn't Zoe take a replacement immediately? | The model is unavailable. | Replacements cost extra. | She has no receipt. | same model is temporarily unavailable。
Why does she choose a refund? | She needs a lamp now. | She no longer studies. | The store offers no alternative. | needs a lamp for evening classes，不想等一周。""",
    """Why is the customer exchanging the shoes? | They are too tight. | They are damaged. | They are the wrong color. | They are too tight。
Why not take the brown pair? | Black is required for work. | Brown costs more. | Brown is too small. | I need black shoes for work。
What happens to the old pair? | It stays at the store. | The customer keeps it. | It is sent to the workplace. | Please leave them here。""",
    "too + 形容词表示超出合适程度：too tight。enough 放形容词后：large enough。描述原因可用 because。",
    """These shoes are not large ___. | enough | too | very | enough 放形容词 large 后。
The lamp failed, ___ I requested a refund. | so | because | although | 前因后果，用 so 引出结果。""",
    "买家说明商品、购买时间和问题，拿出收据，要求退款或换货。卖家提供两个可行方案；买家追问等待时间和费用，再明确选择。",
    "Write to a store about a faulty product. Describe when you bought it, the fault, the checks you have tried, and the action you want the store to take.",
    "Store policy: Unused clothes may be returned within thirty days with proof of purchase. Sale items may be exchanged for another size but cannot be refunded for a change of mind. If an item is faulty, contact the service desk for help. Online orders can be returned in a store or by post; postal returns may involve a delivery charge.",
    "店规：未用衣物30天内凭购物证明可退；打折商品因改变主意不能退款，但可换码；故障另找服务台，网购可到店或邮寄退。",
    """What is needed to return unused clothes? | Proof of purchase. | A membership card. | A new order. | with proof of purchase。
What can someone do with a sale item of the wrong size? | Exchange it for another size. | Always get a cash refund. | Keep it without asking. | Sale items may be exchanged for another size。
Which return method may have a delivery charge? | By post. | In a store. | Both are always free. | postal returns may involve a delivery charge。""")

add(14, "协商工作安排", "能说清任务、负责人、期限与变更，并确认对方理解一致。",
    "A small team is preparing a presentation for a client. Initially, Owen is responsible for the charts, and Priya will write the introduction. On Monday, Owen learns that he must visit another office on Wednesday. He tells the team early instead of waiting until the deadline. Priya offers to finish the last two charts if Owen sends her the data by Tuesday noon. In return, Owen will review her introduction on Tuesday afternoon. They write the new responsibilities in a shared note. The manager also moves the practice meeting from Thursday morning to Thursday afternoon. Before the meeting ends, each person repeats their next action and deadline. This takes only two minutes and prevents confusion later.",
    "Owen 周三外出，提前告知。Priya 接手最后两张图，Owen 周二中午前发数据、下午审介绍。彩排从周四早改下午，双方复述任务和期限。",
    "A: Can you send the report by Friday morning? / B: I can finish the text, but the sales figures won't arrive until Friday afternoon. / A: Could you send a draft without those figures on Thursday? / B: Yes, by four. Then I can send the complete version on Monday. / A: Monday is too late for the meeting. Could you add the figures on Friday and send it by five? / B: Yes, if I receive them by three. / A: I will ask the sales team to confirm that. / B: Great. I'll send the draft on Thursday at four.",
    "初稿周四16点发；完整报告争取周五17点，但需销售数据15点前到，对方会向销售团队确认。",
    """What should Owen send by Tuesday noon? | The data. | The completed introduction. | A travel ticket. | sends her the data by Tuesday noon。
What will Owen do in return? | Review the introduction. | Cancel the client meeting. | Finish all the charts. | review her introduction on Tuesday afternoon。
Why does everyone repeat their next action? | To prevent confusion. | To extend the meeting. | To avoid written notes. | prevents confusion later。""",
    """When will the draft be sent? | Thursday at four. | Friday morning. | Monday. | 最后再次确认 Thursday at four。
Why is Monday unsuitable? | It is too late for the meeting. | The writer is on holiday. | Sales figures arrive Tuesday. | Monday is too late for the meeting。
What must happen for the full report to be sent by Friday at five? | Figures arrive by three. | The draft is canceled. | The meeting moves to Monday. | if I receive them by three。""",
    "by Friday 表示最迟周五；until Friday 表示持续到周五。条件句：If I receive the data, I will finish the report，if 从句用一般现在时表将来条件。",
    """Please send the draft ___ four. | by | until | during | 截止时刻用 by；不是持续发送到四点。
If the figures arrive, I ___ the report. | will finish | finished | finishing | 可能发生的将来条件，主句 will + 动词。""",
    "双方各有一个无法满足的截止时间，先说明原因，再商量分批交付。结束前每人复述负责人、内容和截止时间，写三行行动项。",
    "Write a work update. Explain what is finished, what is delayed and why, what support you need, and the new delivery time. Make responsibilities clear.",
    "Team update: The Friday training session will now start at eleven instead of nine because the trainer's flight changed. Please complete the online introduction by Thursday evening. Bring a laptop; tablets cannot run the practice software. Anyone unable to attend should tell Nora today. A recording will be available afterward, but the group exercise will not be recorded.",
    "周五培训由9点改11点；周四晚前完成在线介绍，带笔记本而非平板；不能参加今天告知 Nora，录像不含小组练习。",
    """When does training start? | At eleven on Friday. | At nine on Friday. | On Thursday evening. | now start at eleven instead of nine。
Which device is required? | A laptop. | A tablet. | A phone. | tablets cannot run the practice software。
What will the recording leave out? | The group exercise. | The trainer's talk. | The entire session. | group exercise will not be recorded。""")

add(15, "电话留言与信息核对", "能从电话中提取姓名、号码、时间和行动要求，主动澄清。",
    "When Ben starts volunteering at a community center, his first task is to answer the phone. At first, he tries to remember everything callers say. This leads to mistakes, especially when people speak quickly. His supervisor gives him a simple message form with spaces for the caller's name, contact number, reason for calling, and requested action. Ben learns to ask callers to spell unfamiliar names. He repeats numbers in small groups and confirms whether an appointment is in the morning or afternoon. One caller changes a collection time from three fifteen to three fifty. Ben repeats the final time before ending the call. Later, the correct message helps another volunteer prepare the equipment on time.",
    "Ben 用表格记录来电姓名、电话、原因和行动；遇陌生姓名请拼读，号码分组确认。取设备时间从3:15改3:50，要记录最终时间。",
    "A: Community center, how can I help? / B: This is Carla Reed. I booked a room for a reading group. / A: Could you spell your surname? / B: R-E-E-D. I need to move the booking from Tuesday to Wednesday. / A: The same time, six thirty? / B: Yes, for one hour. / A: I will ask the coordinator to call you back. What is your number? / B: 555-0186. / A: 555-0186. Is that right? / B: Yes. Please call after four; I am at work before then.",
    "Carla Reed 要把读书会预约从周二改周三，仍18:30、1小时。电话555-0186，下午四点后回电。",
    """Why did Ben make mistakes at first? | He tried to remember everything. | The form was too long. | Callers refused to give names. | tries to remember everything...leads to mistakes。
What does he ask about unfamiliar names? | How to spell them. | Why people chose them. | Whether they can be shortened. | ask callers to spell unfamiliar names。
What is the final collection time? | Three fifty. | Three fifteen. | Four fifteen. | from three fifteen to three fifty。""",
    """Which day does Carla want now? | Wednesday. | Tuesday. | Thursday. | move...from Tuesday to Wednesday。
How long is the booking? | One hour. | Thirty minutes. | Two hours. | for one hour；6:30 是开始时间。
When should the coordinator call? | After four. | Before four. | At six thirty. | Please call after four。""",
    "请求澄清：Could you spell/repeat...? 回传他人请求：She wants to change the booking。want 后用 to + 动词。日期变更注意 from 与 to。",
    """She wants ___ the booking. | to change | changing | change | want to do。
Could you ___ your number? | repeat | repeated | repeating | could 后接动词原形。""",
    "电话留言包含姓名拼写、回电号码、原时间与新时间、回电窗口。接听者记录后必须逐项复述。第二轮交换角色，故意加入 fifteen/fifty 的澄清。",
    "Write a phone message for a colleague. Include who called, why, the old and new arrangements, contact details, and what your colleague should do next. Use invented contact details.",
    "Voicemail: Hi, this is Ellis from the repair shop. Your bike is ready. We replaced the rear brake cable, not the brake pads, so the total is eighteen dollars instead of thirty. We close at six today. If you cannot come before then, you can collect it tomorrow after ten. Please bring the collection slip.",
    "维修店告知单车修好，换的是后刹车线而非刹车片，18美元非30。今天18点关门，或明天10点后取，带取车单。",
    """What was replaced? | The rear brake cable. | The brake pads. | The front wheel. | rear brake cable, not the brake pads。
What is the final price? | Eighteen dollars. | Thirty dollars. | Thirteen dollars. | eighteen...instead of thirty。
What is required for collection? | The collection slip. | A new brake pad. | A phone booking. | bring the collection slip。""")

add(16, "读懂公共服务规则", "能区分资格、费用、例外和操作步骤，避免只抓关键词。",
    "The town library has introduced a tool-lending service. Residents can borrow simple tools for home projects instead of buying equipment they rarely use. To join, a resident must have a library card and attend a short safety introduction. Tools can be kept for seven days. Unlike books, they cannot be renewed online because other members may be waiting for them. Borrowers must return tools to the service desk during staffed hours, rather than leaving them in the book-return box. Some residents initially complained about the extra rules. After a month, however, the library reported that most tools were coming back on time and in good condition. The staff plan to add more tools after reviewing which items are requested most often.",
    "图书馆借工具需借书证和安全介绍，借期7天，不能像书那样网上续借，必须在有人值班时还服务台。规则实施后，多数按时完好归还。",
    "A: I'd like to join the tool-lending service. / B: Do you already have a library card? / A: Yes. Can I borrow a drill today? / B: First, you need the safety introduction. The next one is tomorrow at five. / A: Is there a fee? / B: No. Please book a place because the group is limited to eight people. / A: All right. Can I reserve the drill now? / B: We can put your name on the waiting list, but that does not guarantee it will be available tomorrow. / A: Understood. I'll book the introduction first.",
    "借电钻前必须参加安全介绍，下一场明天17点，免费、限8人需预约。可入电钻候补名单，但不保证明天有。",
    """Why can't tools be renewed online? | Other members may be waiting. | The website is broken. | Tools must be purchased afterward. | because other members may be waiting。
Where should tools be returned? | At the staffed service desk. | In the book-return box. | Outside the library door. | service desk during staffed hours。
How will staff choose new tools? | Review which are requested most. | Buy the cheapest ones only. | Ask one borrower to decide. | reviewing which items are requested most often。""",
    """What must the customer do before borrowing? | Attend a safety introduction. | Buy a drill. | Pay an annual fee. | First...safety introduction。
Why must the introduction be booked? | Places are limited. | It is expensive. | It is held online. | limited to eight people。
Does joining the waiting list guarantee a drill tomorrow? | No. | Yes, after payment. | Yes, for card holders. | does not guarantee...available tomorrow。""",
    "规则中 must 表示必须；must not 表示禁止；do not have to 表示不必。不要把禁止和不需要混淆。",
    """You ___ leave tools in the book-return box. | must not | do not have to | might | 规定明确禁止，应为 must not。
The introduction is free, so you ___ pay. | do not have to | must not always | must | free 表示不需要付费，do not have to。""",
    "一人服务台，一人想借工具。顾客询问资格、借期、归还方式和例外；服务台解释候补不等于预约成功，双方确认下一步。",
    "Write a guide to a public service for a newcomer. Explain who can use it, how to join, two important rules, and why those rules are useful.",
    "Recycling center rules: Entry is free for local residents with proof of address. Vans require a booking, but cars do not. Paint and batteries must be handed to staff; do not place them in general bins. The center closes at five, with last entry at four thirty. Commercial waste is not accepted, even with a booking.",
    "回收中心本地居民凭地址证明免费；厢式车要预约、小汽车不用。油漆电池交工作人员，16:30最后入场、17点关闭，不收商业垃圾。",
    """Which vehicle needs a booking? | A van. | A car. | Every vehicle. | Vans require a booking, but cars do not。
What is the latest entry time? | Four thirty. | Five. | Five thirty. | last entry at four thirty，与关门时间不同。
Can commercial waste be accepted with a booking? | No. | Yes, before four thirty. | Yes, with proof of address. | not accepted, even with a booking。""")

add(17, "写清租住维修请求", "能按现象、影响、已尝试方法和可上门时间组织请求。",
    "For several weeks, a tap in Rosa's rented apartment has been dripping. At first, she placed a bowl underneath it and emptied the bowl each evening. When the leak became faster, she contacted the property manager. Her message included the location of the tap, when the problem began, and a photo of water collecting below it. She also explained that she would be home on Tuesday morning or Thursday afternoon. The manager arranged a plumber for Thursday between two and four. Rosa asked whether she needed to pay the plumber directly. The manager confirmed that the repair would be handled by the property company. After the repair, Rosa tested the tap and sent a brief message confirming that the leak had stopped.",
    "Rosa 反映漏水位置、开始时间、照片及可上门时段。维修定周四14–16点，由物业公司处理费用，修后测试并确认。",
    "A: I'm calling about the heater in apartment 4B. / B: What is happening? / A: It switches on, but the room stays cold. I've checked that the window is closed. / B: We can send someone tomorrow between nine and twelve. / A: I work mornings. Could it be after two? / B: The next afternoon slot is Friday, from two to five. / A: Friday works. Will the technician call before arriving? / B: Yes, about thirty minutes beforehand. / A: Please use my mobile number, not the apartment phone. / B: I'll add that to the booking.",
    "4B暖气开着但不暖，住户上午工作，预约周五14–17点；技师提前约30分钟拨手机，而非公寓电话。",
    """What prompted Rosa to contact the manager? | The leak became faster. | The bowl was missing. | She moved to another apartment. | When the leak became faster。
When is the plumber expected? | Thursday between two and four. | Tuesday morning. | Thursday before noon. | arranged...Thursday between two and four。
What does Rosa do after the repair? | Tests the tap and confirms the result. | Pays cash without checking. | Sends the first photo. | tested the tap and sent...confirming...stopped。""",
    """What is wrong with the heater? | It runs but does not warm the room. | It cannot switch on. | It makes too much noise. | switches on, but the room stays cold。
Which appointment is agreed? | Friday from two to five. | Tomorrow from nine to twelve. | Friday before two. | Friday works，接受下午时段。
How should the technician contact the resident? | On their mobile. | On the apartment phone. | By email only. | use my mobile number, not the apartment phone。""",
    "现在完成时用于已做检查与当前有关的结果：I have checked the window。since + 起点，for + 一段时间。说明请求时还要给具体时间。",
    """The tap has leaked ___ three weeks. | for | since | at | three weeks 为持续时长，用 for。
I have already ___ the window. | checked | check | checking | have + 过去分词 checked。""",
    "住户按问题、影响、已检查内容报修；物业给两个时段。确认可用时段、联系方法和费用由谁处理，不用含糊的 sometime。",
    "Write a repair request to a property manager. Describe the problem, how long it has existed, its effect on you, and two possible times for a visit. Ask for confirmation.",
    "Repair confirmation: A technician will visit on June 18 between one and three. The person whose name is on the booking, or another adult, must be present. Please clear the area around the washing machine. If you need to reschedule, call before noon the previous day. The technician cannot collect payments; any invoice will be emailed afterward.",
    "6月18日13–15点上门，预约人或另一成人须在场，清空洗衣机周边。改期须前一天中午前来电，技师不收款，账单事后邮件发。",
    """Who must be present? | The named person or another adult. | Only the property owner. | No one. | or another adult。
When is the rescheduling deadline? | Noon on June 17. | Noon on June 18. | Three on June 18. | previous day 即6月17日，before noon。
How is any invoice sent? | By email afterward. | Given for cash payment during the visit. | By text before booking. | emailed afterward。""")

add(18, "讲习惯，也讲取舍", "能表达观点、举具体例子，并承认一种不同情形。",
    "A company encouraged employees to take short walking breaks during the day. Some people welcomed the idea because they spent long hours at desks. Others worried that breaks would interrupt their concentration. Instead of making the activity compulsory, the company ran a four-week trial. Employees could choose when to take a ten-minute walk and record how they felt afterward. Most participants reported feeling more alert, although a few preferred stretching indoors. The trial did not measure long-term health changes, so the company avoided claiming that walking solved every problem. It kept the flexible break policy and provided an indoor space as well. The main lesson was that a useful workplace habit should allow for different needs and working conditions.",
    "公司试行自选时间的10分钟步行休息，多数反馈更清醒，也有人偏好室内拉伸；未测长期健康效果，所以不夸大结论。",
    "A: Are you still cycling to work every day? / B: Not every day. I cycle on Tuesdays and Thursdays. / A: Why only twice a week? / B: I carry heavy equipment on Mondays, and Friday meetings sometimes finish late. / A: Doesn't the weather cause problems? / B: If it rains heavily, I take the train. I don't want the habit to become a source of stress. / A: That sounds practical. / B: I also leave spare clothes at work. It took some planning, but now I usually enjoy the journey. / A: Maybe I'll try one day a week first.",
    "骑车通勤改为周二和周四，周一设备重、周五可能晚；大雨坐火车，在公司备衣服，让习惯适合实际情况。",
    """Was walking compulsory? | No, employees could choose. | Yes, every morning. | Only for new staff. | Instead of making...compulsory，自愿试行。
What did most participants report? | Feeling more alert. | Losing weight. | Finishing twice as much work. | reported feeling more alert；没有另两项数据。
Why did the company limit its claims? | Long-term health changes were not measured. | No one joined the trial. | The trial lasted a year. | did not measure long-term health changes。""",
    """Which days does the speaker usually cycle? | Tuesdays and Thursdays. | Mondays and Fridays. | Every weekday. | I cycle on Tuesdays and Thursdays。
Why not cycle on Mondays? | Heavy equipment must be carried. | There are late meetings. | The train is free. | carry heavy equipment on Mondays。
What does the speaker do in heavy rain? | Takes the train. | Always cycles anyway. | Stays home from work. | If it rains heavily, I take the train。""",
    "because 给原因；although 表让步；however 连接转折。英语中通常不同时写 Although..., but...。观点要区分实际证据和推测。",
    """___ walking helped some people, others preferred stretching. | Although | Because | Unless | 此处承认一种情况再给对照，用 Although。
I take the train ___ it rains heavily. | if | so | despite | 后面是条件从句，用 if。""",
    "讨论“是否应该每天固定运动”。先提出观点及例子，对方给出工作或天气限制；你需要承认限制并修改建议，形成双方可做的一周方案。",
    "Do fixed routines help people build good habits? Give your opinion, one specific example, and one situation where flexibility is better. End with a practical recommendation.",
    "A local survey asked thirty bus passengers about a new evening service. Twenty-two said it made travel easier. Five had not used it, and three wanted an earlier final departure. The survey was conducted at one stop on one Friday. The council will collect responses from other routes before deciding whether to expand the service.",
    "30名受访者中22人觉得新晚班方便，5人未用，3人希望末班更早。仅周五一个站点调查，市议会还要收集其他路线反馈。",
    """How many respondents said travel was easier? | Twenty-two. | Thirty. | Five. | Twenty-two said it made travel easier。
What limits the survey? | It covered one stop on one day. | It included no passengers. | It measured every route. | at one stop on one Friday。
What will the council do next? | Gather more responses. | Immediately cancel all buses. | Claim every resident agrees. | collect responses from other routes。""")

add(19, "选择一门适合自己的课", "能根据目标、先决条件、费用与时间作选择，理解未说明的信息。",
    "Tariq wants to improve his computer skills before applying for office jobs. He compares two evening courses at a college. The first covers basic typing and email; the second focuses on spreadsheets and requires basic computer knowledge. Tariq can already type and send messages, but he has never used formulas. He chooses the spreadsheet course after asking the tutor whether beginners with formulas are welcome. Classes run on Wednesdays for six weeks. The advertised fee includes teaching materials but not the final optional test. Tariq decides to pay for the lessons first and consider the test later. He also asks about missed classes because his work schedule sometimes changes. The college provides lesson notes, but it cannot offer replacement sessions.",
    "Tariq 已会打字和邮件，选表格课并确认可零公式基础入学。周三上六周，教材含在费内，选考另付；缺课给笔记、不补课。",
    "A: I'm interested in the photography course. Do I need a professional camera? / B: No. A phone camera is fine for the first four sessions. / A: What about the last two? / B: You can borrow a camera from us, but there is a refundable deposit of fifty dollars. / A: Are the lessons all indoors? / B: The third session is outside, weather permitting. / A: I work on Saturdays. Is there a weekday group? / B: Yes, on Thursday evenings from six to eight. / A: Great. Can I attend one trial session? / B: Yes, but please book it in advance.",
    "摄影课前4次可用手机，后2次可借相机需50美元可退押金。第3次视天气外出，周四18–20点班可选，试课需提前约。",
    """Why does Tariq choose the spreadsheet course? | He already has the other course's basic skills. | It has no entry requirements. | It guarantees a job. | already type and send messages，但没用过公式。
What is not included in the fee? | The optional final test. | Teaching materials. | Lessons. | not the final optional test。
What happens if he misses a class? | He can get notes, but no replacement session. | He always gets a refund. | He must restart the course. | provides lesson notes...cannot offer replacement sessions。""",
    """What can students use in the first four sessions? | A phone camera. | Only a professional camera. | Only a borrowed camera. | A phone camera is fine。
What is the fifty-dollar payment? | A refundable deposit. | A nonrefundable lesson fee. | The full course price. | refundable deposit，不能当作课程总价。
When is the weekday group? | Thursday from six to eight. | Saturday from six to eight. | Wednesday from four to six. | Thursday evenings from six to eight。""",
    "need to do 表示需要做；be interested in + 名词或动词-ing。阅读中没有出现的信息不能推断成承诺，例如上课不等于保证就业。",
    """I am interested in ___ photography. | learning | learn | to learn | 介词 in 后用动名词 learning。
You need ___ the trial in advance. | to book | booking | book | need to + 动词。""",
    "询课时问入门要求、设备、额外费用、缺课政策和试课。咨询者必须总结总成本中哪些已知、哪些还需确认，再说明自己为何适合。",
    "Write an email asking about a course. Explain your current skills and learning goal. Ask three specific questions about requirements, scheduling, and costs before deciding whether to enroll.",
    "Course listing: Practical First Aid, four Tuesday evenings, seven to nine. No prior training required. The eighty-dollar fee includes a handbook and assessment. A certificate is issued only after attendance at all sessions and a successful assessment. Places are confirmed after payment. The listing does not state whether employers must accept the certificate; ask your employer before enrolling for a work requirement.",
    "急救课4个周二19–21点，不需基础，80美元含手册及考核；全勤且通过才发证，付费确认名额，雇主是否认可需另问。",
    """What is required for the certificate? | Full attendance and passing the assessment. | Payment alone. | Previous training. | all sessions and a successful assessment。
What does the fee include? | A handbook and assessment. | Travel and meals. | Guaranteed employment. | includes a handbook and assessment。
Who should confirm workplace acceptance? | The learner's employer. | Every other student. | The listing already guarantees it. | ask your employer。""")

add(20, "阶段检查：独立处理生活事务", "在新情境里提取信息、协商变更、写清请求，并检查听读与写说差距。",
    "A family is preparing to move to another town. They make a list of tasks rather than trying to complete everything in one day. First, they compare moving companies and request written quotes. One quote is cheaper, but it excludes packing materials and charges extra for stairs. The family chooses the company that explains all costs clearly. Next, they arrange for the internet service to start two days after the move. They download important documents beforehand because they may be offline temporarily. Their new landlord asks them to report any damage within forty-eight hours of receiving the keys. On arrival, they photograph a cracked shelf and send a polite message with the picture. Careful preparation does not remove every problem, but it makes unexpected changes easier to manage.",
    "一家人搬家前比较完整报价，注意包装与楼梯附加费；网络搬后两天才开通，先下载文件；拿钥匙48小时内报告已有损坏。",
    "A: I'm calling to confirm our moving appointment on Friday. / B: Yes, our team will arrive between eight and nine. / A: The building manager says the elevator cannot be used before nine thirty. / B: Thanks for telling us. We can arrive at nine thirty instead. / A: Will that change the price? / B: No, as long as the job finishes within the agreed four hours. / A: Could you send the revised time by email? / B: Certainly. Have you packed the kitchen items? / A: Everything except the glasses. / B: Please pack those before we arrive and label the box as fragile.",
    "搬家公司原8–9点到，但电梯9:30前不可用，改9:30；约定4小时内完成不加价，要求邮件确认，杯子先装并贴易碎标志。",
    """What is excluded from the cheaper quote? | Packing materials. | All transport. | Written confirmation. | excludes packing materials，另楼梯收费。
Why do they download documents? | Internet may be unavailable temporarily. | They are closing every account. | The landlord requires printed copies. | may be offline temporarily。
When must existing damage be reported? | Within forty-eight hours of receiving keys. | Before choosing a mover. | Two weeks after arrival. | within forty-eight hours of receiving the keys。""",
    """What is the revised arrival time? | Nine thirty. | Between eight and nine. | Four in the afternoon. | arrive at nine thirty instead。
When will the price stay the same? | If the job finishes within four hours. | Regardless of how long it takes. | Only if no boxes are moved. | as long as...within the agreed four hours。
What should the family do with the glasses? | Pack them and mark the box fragile. | Leave them for the manager. | Carry them in an open tray. | pack those...label the box as fragile。""",
    "综合检查条件、时限和礼貌请求。within four hours 表示四小时内；by nine thirty 表示最迟九点半；不是所有报价都包含同一组服务。",
    """Please report damage ___ forty-eight hours. | within | during of | since | within + 时长，表示在该时长内。
Could you confirm ___ the price includes packing? | whether | what | than | whether 引导是否包含的间接问句。""",
    "先用两分钟说明搬家或其他生活事务的计划、风险和备选方案；再模拟服务电话，核对原安排、提出变更、确认价格条件，并请求书面确认。对方追加三个追问。",
    "Write an email to a service provider requesting a change. Include your booking details, explain the problem, propose an alternative, ask about any extra cost, and request written confirmation.",
    "The Lakeside Community Center is offering a weekend skills program. Residents may choose either bicycle maintenance or basic cooking. Both workshops run from ten to one on Saturday, so participants can attend only one. Bicycle maintenance costs fifteen dollars and includes use of tools, but replacement parts must be paid for separately. The cooking workshop costs twenty dollars and includes ingredients; participants must bring a container. Bookings close at noon on Wednesday. A booking is provisional until payment is received. Cancellations made by Thursday evening receive a full refund. After that, fees are returned only if the center cancels the workshop. The center originally planned to hold bicycle maintenance outdoors, but it will now use Room 3 because of building work in the courtyard. Cooking remains in the kitchen on the ground floor. People with access requirements should call before booking so staff can discuss suitable arrangements. Completing a workshop gives practical experience, but it does not provide a professional qualification.",
    "两课都周六10–13点，只能选一。修车15美元含工具、不含零件；烹饪20含食材、自带容器。周三中午截止、付费才确认；周四晚前可全退，修车因施工移至3室，无职业资质。",
    """Why can someone attend only one workshop? | They run at the same time. | Residents may enter only once a year. | Cooking requires a previous certificate. | Both...from ten to one on Saturday。
What costs extra in bicycle maintenance? | Replacement parts. | Use of tools. | Room access. | replacement parts...paid for separately。
When is a booking confirmed? | After payment is received. | As soon as the form is opened. | Only on Saturday morning. | provisional until payment is received。
When can a participant cancel for a full refund? | By Thursday evening. | Any time on Saturday. | Only before Wednesday morning. | by Thursday evening receive a full refund。
Where will bicycle maintenance take place? | In Room 3. | In the courtyard. | In the kitchen. | now use Room 3，户外为原计划。
What does completing a workshop provide? | Practical experience. | A professional qualification. | Guaranteed employment. | practical experience, but...not...professional qualification。""")


def build_legacy_course_pack():
    """Reject incomplete/duplicate content before it can reach either HTML output."""
    if [u["week"] for u in UNITS] != list(range(1, 21)):
        raise ValueError("课程包必须连续覆盖 W1–W20")
    texts, ids = set(), set()
    for unit in UNITS:
        for kind in ("reading", "listening", "transfer"):
            part = unit[kind]
            text = part["text"]
            if text in texts or len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)) < 35:
                raise ValueError(f"材料重复或过短：{unit['id']}/{kind}")
            texts.add(text)
            if not part["translation"]:
                raise ValueError("缺少中文大意")
        for kind in ("reading", "listening", "grammar", "transfer"):
            expected = 2 if kind == "grammar" else 6 if kind == "transfer" and unit["week"] in (10, 20) else 3
            if len(unit[kind]["questions"]) != expected:
                raise ValueError(f"题目数量错误：{unit['id']}/{kind}")
            for q in unit[kind]["questions"]:
                if q["id"] in ids or len(set(q["options"])) != 3 or not 0 <= q["correct"] < 3:
                    raise ValueError(f"题目无效：{q['id']}")
                if not q["prompt"] or not q["explanation"]:
                    raise ValueError(f"缺少题干或解析：{q['id']}")
                ids.add(q["id"])
    return {"version": 1, "units": UNITS, "source": "本项目原创练习；系统语音朗读，非真人录音或官方试题。"}


def build_course_pack():
    from course_v2 import build
    return build(build_legacy_course_pack()['units'])
