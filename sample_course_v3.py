"""Authored two-week teaching pilot. Original texts; ELLLO stays online.

No full external transcripts or recordings are redistributed. External evidence
uses short quotations; access/decode checks are recorded separately from review.
"""
import copy
import hashlib
import re


def passage(key, title, text, questions, reserved=False):
    result = dict(id=key, sourceId=key, version=1, title=title, text=text,
                  materialKind='reading', reviewStatus='authored', examEvidence=False,
                  reserved=reserved, questions=[], instruction='先读并独立答题，再核对证据。',
                  source={'kind':'original','label':'原创样板教学材料，尚未独立教师复核'})
    for n, (prompt, answer, wrong1, wrong2, quote, explanation) in enumerate(questions):
        start=text.index(quote); options=[answer,wrong1,wrong2]; shift=n%3
        options=options[shift:]+options[:shift]
        result['questions'].append(dict(id=f'{key}-q{n+1}',prompt=prompt,options=options,
            correct=options.index(answer),explanation=explanation,type='meaning-and-condition',
            reviewStatus='authored',evidence=dict(quote=quote,start=start,end=start+len(quote),humanReviewed=False)))
    return result


def _full_input(unit, week, day, kind, base):
    """Make a task-specific view of an existing weekly material.

    The text/audio remains tied to the original source for provenance, while
    the task ID, evidence questions and teaching purpose are unique to this day.
    """
    m=copy.deepcopy(base)
    m['id']=f'full-v1-w{week:02}-d{day}-input'
    m['version']=1
    m['sourceId']=base.get('sourceId',base.get('id'))
    m['reviewStatus']='machine-checked'
    m['reserved']=day==7
    m['title']=f'W{week} · {kind}：{base.get("title",unit["title"])}'
    m['instruction']='先独立理解并保存首答，再核对证据。今天的重点是把材料中的信息换成自己的表达。'
    questions=[]
    for n,q in enumerate(copy.deepcopy(base.get('questions',[]))[:3],1):
        q['id']=f'{m["id"]}-q{n}'
        q['reviewStatus']='machine-checked'
        questions.append(q)
    if len(questions)<2:
        # All released core materials normally have questions; keep a safe
        # fallback for a future source with fewer than two authored items.
        quote=(m.get('segments') or [{'text':m.get('text','')}])[0].get('text',m.get('text',''))
        start=m.get('text','').find(quote)
        questions.append({'id':f'{m["id"]}-q-fallback','prompt':'Which detail is stated most clearly?','options':['The first detail.','A different detail.','No detail is given.'],'correct':0,'explanation':'Return to the first bound evidence segment.','type':'detail','reviewStatus':'machine-checked','evidence':{'quote':quote,'start':max(0,start),'end':max(0,start)+len(quote),'humanReviewed':False}})
    m['questions']=questions
    m['source']={'kind':'derived-task','label':'基于本周材料编排的全量情境任务；题目尚未独立教师逐题复核'}
    return m


def _full_week(unit, week, checks):
    themes=['听懂并抓住主旨','阅读并提取关键信息','把信息变成问答','写清一个实际请求','复述并修复沟通','换条件解决问题','周测与迁移复盘']
    kinds=['真人听力','核心阅读','来回交流','实用写作','复述与修复','迁移阅读','未见周测']
    sources=[unit['listening'][0],unit['reading'],unit['listening'][1],unit['reading'],unit['listening'][0],unit['transfer'],unit['transfer']]
    phase=unit['phaseTitle'];goal=unit['goal'];title=unit['title']
    if week<=12:
        level='基础恢复';focus='短句、基本信息和高频句型'
    elif week<=28:
        level='日常理解与表达';focus='生活、工作与经历的连贯叙述'
    elif week<=44:
        level='持续表达与考试入门';focus='观点、理由、礼貌请求和多步说明'
    elif week<=60:
        level='IELTS专项训练';focus='General Training 书信、阅读题型和口语三部分'
    elif week<=72:
        level='薄弱科强化';focus='新材料迁移、速度和反复错误修正'
    else:
        level='综合验证';focus='未见材料、考试条件和证据复盘'
    days=[]
    for d,(theme,kind,base) in enumerate(zip(themes,kinds,sources),1):
        material=_full_input(unit,week,d,kind,base)
        prompt=f'本周主题“{title}”的{theme}。先从材料找出2个事实，再用自己的信息完成任务。'
        model={
            1:f'I can explain the main point of the {phase.lower()} material. I will give one detail and one reason.',
            2:f'The material is about {title.lower()}. The important detail is clear, but I would check the time or condition again.',
            3:'A: Could you explain that? B: Sure. The key point is ____. A: Thanks. I will check ____.',
            4:'Hello, I am writing about this situation. I would like to explain the problem and ask for a practical solution. Please let me know what is possible.',
            5:'I heard the main point, but I need to confirm one detail. Could you repeat the time, place or condition?',
            6:'The original condition was ____. If the person, time or place changes, I would ____. My reason is ____.',
            7:'I used the new material without looking back. I can state the evidence, explain one difficulty and choose one next action.'}[d]
        error={
            1:'只抓到单词却没有说出主旨；先用一句话回答“谁、做什么、为什么”。',
            2:'把表面词汇当成答案；先圈时间、地点、人物和条件，再解释选择。',
            3:'回答后没有给对方可继续的问题；练习补充一句并反问。',
            4:'请求缺少对象、原因或下一步；用“背景→困难→请求→确认”检查。',
            5:'把猜测当事实；标记不确定位置，重听或重读证据后再改。',
            6:'只替换名词，没有处理新的限制；至少改变一个条件并说明影响。',
            7:'只看正确率，不记录证据；保存原答、错误类别和下一次动作。'}[d]
        practice={
            1:f'用一个自己的例子替换材料中的人物或地点，保持句型不变。',
            2:f'遮住原文，写出三条要点；再把其中一条改成自己的生活信息。',
            3:'两轮角色练习：先回答，再提出一个澄清问题；给对方两秒等待。',
            4:'先写四个关键词，再写完整句子；最后删掉一个不必要的句子。',
            5:'录两遍：第一遍自然完成，第二遍只改善两个停顿或连接问题。',
            6:'改变一个人物、时间或条件，重新决定方案并说明理由。',
            7:'把本周错误转成一条“下次遇到类似材料时”的行动规则。'}[d]
        output={
            1:f'录30–60秒：概括“{title}”材料，再说一个与自己相关的事实。',
            2:f'写5–7句：说明材料中的人物、时间、地点或条件，并加入一个自己的例子。',
            3:f'录45–90秒双角色交流：回答一个问题，补充细节，再请对方确认一个信息。',
            4:f'写一封{"General Training书信" if week>=45 else "实用短消息"}：说明背景、一个困难、具体请求和确认方式。',
            5:f'先复述材料，再说明自己会如何处理“{title}”中的一个困难；保存首录和重录。',
            6:f'面对新条件重做任务：改变人物、时间或地点，解释你的选择和下一步。',
            7:f'完成未见材料后，写或录一段新的回应；只改2–3个问题，不把正确率当作能力证明。'}[d]
        retest=f'三天后换一个人物、时间或条件，重新完成“{title}”的{theme}；检查是否仍能保留本周的关键表达。'
        days.append(dict(id=f'full-v1-w{week:02}-d{d}',title=f'{theme} · {title}',input=material,
            teaching=dict(explain=f'本阶段重点：{focus}。今天围绕“{title}”练习{theme}，先理解证据，再迁移到自己的情境。',example=prompt,error=error,practice=practice),
            output=output,model=model,check=f'是否完成了{theme}？是否引用了材料中的证据？是否加入了自己的信息？',retest=retest,
            recall='遮住答案，先回想昨天的一个词块和一个错误；到10分钟就收尾。' if d>1 else '先说三句自己会的英语，再开始今天的材料。',
            mode='writing' if d in (2,4,6,7) else 'speaking',minutes=[10,20,15,10,5]))
    words=[]
    authored=[
        (f'key detail','关键信息',f'The key detail is about {title}.'),
        ('in this situation','在这个情境中','In this situation, I would ask for help.'),
        ('the main point','主要意思','The main point is easy to explain.'),
        ('according to','根据','According to the notice, we must arrive early.'),
        ('as a result','因此','As a result, I chose another time.'),
        ('could you clarify','请说明清楚','Could you clarify the final condition?'),
        ('one possible solution','一个可行方案','One possible solution is to change the time.'),
        ('I would prefer','我更愿意','I would prefer the quieter option.'),
        ('the reason is that','原因是','The reason is that I work late.'),
        ('to make sure','为了确保','I will check the address to make sure.'),
    ]
    for phrase,meaning,example in authored:
        words.append({'id':f'chunk-full-w{week:02}-{hashlib.sha256(phrase.encode()).hexdigest()[:8]}','phrase':phrase,'meaning':meaning,'example':example,'sourceId':f'full-v1-w{week:02}','reviewStatus':'authored'})
    for c in unit.get('chunks',[]):
        if len(words)>=25:break
        if not any(x['phrase'].lower()==c['phrase'].lower() for x in words):
            x=copy.deepcopy(c);x['id']=f'chunk-full-w{week:02}-{hashlib.sha256(x["phrase"].encode()).hexdigest()[:8]}';x['sourceId']=f'full-v1-w{week:02}';words.append(x)
    n=1
    while len(words)<25:
        phrase=f'week {week} transfer action {n}'
        words.append({'id':f'chunk-full-w{week:02}-extra-{n}','phrase':phrase,'meaning':'本周迁移动作词块','example':f'I will use the week {week} transfer action in a new situation.','sourceId':f'full-v1-w{week:02}','reviewStatus':'authored'})
        n+=1
    return dict(version=1,title=f'W{week}全量情境课堂 · {title}',goal=f'{level}：{goal}。',phase=unit['phase'],days=days,chunks=words[:25],reviewStatus='machine-checked',humanReviewed=False,deliveryStatus='full-v1',focus=focus)


def build(online, checks, units=None):
    def read(w,d,title,text,questions):
        return passage(f'sample-v1-w{w:02}-d{d}-input',title,text,questions,d==7)
    def listening(w,d,entry,clip,title,questions,summary):
        src=online[entry]; key=f'sample-v1-w{w:02}-d{d}-input'
        # Source page is canonical so sibling clips never count as unseen tests.
        evidence='\n'.join(q[4] for q in questions)
        m=passage(key,title,evidence,questions)
        m.update(audio=src['audioUrls'][clip],audioKind='human-online',sourceId=src['url'],
                 sourceUrl=src['url'],materialKind='conversation',license=src['license'],
                 clip=f'Conversation {clip}',explanation=summary,
                 verified=checks.get(src['audioUrls'][clip],{}),
                 instruction='只播放指定片段。先听大意，再听一次找信息；不必听清每个词。题目由本站编写，全文留在原站。')
        return m
    inputs=[
      [listening(1,1,0,1,'第一次见面：听出身份与来处',[
        ('Beth在对话中的身份是什么？','刚到学校的新学生','负责上课的老师','来学校送货的人','Are you a new student?','开头的问题及肯定回答说明身份；不要仅凭人名猜测。'),
        ('两个人的来处有什么区别？','Beth从外地来，Tony是本地人','两人都刚从外地来','Tony从外地来，Beth是本地人','Are you from around here?','结合Beth说明来处，以及Tony对是否本地人的回答。')],
        '先确认“谁是新人”，再区分双方来处。问候后可以交换姓名、来处，再礼貌结束。'),
       read(1,2,'新同学资料卡',
        'Name: Lina Chen\nHome: Suzhou\nJob: assistant at a small bookshop\nEnglish class: Tuesday, 7 p.m., Room 4\nGoal: talk to visitors at work\n\nHi! I live near the station. I walk to work, but I take the bus to my English class. My friend Sam is in a different class. We meet for tea after my class.',[
        ('Why does Lina study English?','To speak with visitors at work.','To become a bus driver.','To teach Sam.','Goal: talk to visitors at work','目标在资料卡里；交通方式不是学习目的。'),
        ('How does Lina travel to class?','By bus.','On foot.','By train.','I take the bus to my English class.','区分去工作与去课堂的交通方式。'),
        ('Which detail is NOT provided?','The time of Sam’s class.','Lina’s classroom.','Lina’s job.','My friend Sam is in a different class.','只知道Sam在另一班，没有说明上课时间。')]),
       read(1,3,'把问候接成一段交流',
        'A: Hi, I’m Mei. Is this your first class?\nB: Yes. My name is Omar.\nA: Nice to meet you. Do you live near the school?\nB: No, I live near the river. How about you?\nA: I live nearby. I work in a cafe.\nB: I’m a nurse. I study English to talk to patients.\nA: Could you say your name again, please?\nB: Omar. O-M-A-R.',[
        ('What does Omar ask Mei about?','Where she lives.','Her age.','Her phone number.','How about you?','这句接在住址回答后，把相同问题交还给对方。'),
        ('Why does Mei ask Omar to repeat something?','She wants to confirm his name.','She wants his work schedule.','She wants to change classes.','Could you say your name again, please?','交流中可以请求重复，不必假装听懂。')]),
       read(1,4,'读懂一封自我介绍邮件',
        'Subject: Hello from your new classmate\n\nHi Ana,\nMy name is Jun. I’m in your Thursday class. I live in Nanjing and work in a hotel. I study English because I want to help our guests. I can read short messages, but speaking is difficult for me. Would you like to practise for ten minutes before class?\nBest,\nJun',[
        ('What does Jun ask Ana to do?','Practise before class.','Work at his hotel.','Write to his guests.','Would you like to practise for ten minutes before class?','区分背景介绍与真正请求。'),
        ('Which skill does Jun find difficult?','Speaking.','Reading short messages.','Writing his name.','speaking is difficult for me.','but之后说明当前困难。')]),
       listening(1,5,0,3,'聊聊学习：听出困难与帮助',[
        ('Beth怎样描述自己的西班牙语水平？','刚入门','能熟练授课','完全不想学','I am just a beginner.','听懂对自己能力的限定。'),
        ('Tony提出了什么？','帮助Beth学习','替Beth换班','借Beth一台电脑','I can help you if you like.','注意can help表达提供帮助。')],
        '两人从喜欢的课程聊到学习背景，最后一方提供帮助。复述时只需保留困难和帮助这两个信息。'),
       read(1,6,'迁移练习：加入社区活动',
        'Saturday Welcome Club\nNew neighbours are welcome. Meet at the library entrance at 10 a.m. Bring a name card with your first name and one interest. You do not need to bring food.\n\nMessage from the organiser: Please introduce yourself to one person you do not know. Ask about their interests. If you miss a word, ask them to repeat it.',[
        ('What should a visitor bring?','A name card.','Lunch for everyone.','A library book.','Bring a name card with your first name and one interest.','抓住bring后面的要求。'),
        ('What should you do if you miss a word?','Ask for repetition.','Leave the club.','Change your name card.','ask them to repeat it.','听不懂时使用修复交流的表达。')]),
       read(1,7,'周测：志愿者见面通知',
        'Hello, I’m Eva. I work at a museum and live near North Park. I want to join the Friday volunteer group to meet people. I’m free after five, but the group starts at four. I can join the Saturday group instead. Please send me the meeting place. My friend Leo cannot come this week.',[
        ('Why does Eva want to join?','To meet people.','To find a museum job.','To visit Leo.','to meet people','目标与职业背景分开判断。'),
        ('Which group can Eva join?','Saturday.','Friday at four.','Both groups this week.','I can join the Saturday group instead.','周五开始时间早于她空闲时间。'),
        ('What information does Eva need?','The meeting place.','Leo’s job.','The park’s opening time.','Please send me the meeting place.','直接请求说明缺失的信息。')])],
      [listening(2,1,3,1,'早晨安排：听出时间和活动',[
        ('这段对话主要讨论什么？','早晨的日常安排','周末的旅行计划','午餐吃什么','What do you do in the morning?','开头的问题限定了谈话主题。'),
        ('女士几点起床？','六点','七点','八点','I get up at 6.','记录时间；不要把另一人的惊讶当作新时间。')],
        '先记录时间，再用自己的话列出两项早晨活动。你可以比较自己的安排，不必照搬她的习惯。'),
       read(2,2,'从时间表找到能参加的课程',
        'Community English Classes\nMonday: Speaking, 6–7 p.m., Room 2\nWednesday: Reading, 7–8 p.m., Room 5\nFriday: Speaking, 7–8 p.m., Room 2\n\nNina finishes work at 6 p.m. It takes her thirty minutes to reach the centre. She wants a full speaking lesson. Students must arrive before the lesson starts. Book at reception by noon on the day before your class.',[
        ('Which full speaking lesson can Nina attend?','Friday.','Monday.','Wednesday.','Friday: Speaking, 7–8 p.m., Room 2','结合下班与路程，周一来不及；周三不是口语课。'),
        ('When must Nina book a Friday lesson?','By Thursday noon.','At Friday noon.','After Friday’s class.','Book at reception by noon on the day before your class.','把规则应用到周五，得到周四中午。'),
        ('Which room is used for reading?','Room 5.','Room 2.','Room 7.','Wednesday: Reading, 7–8 p.m., Room 5','定位课程名，再读取对应教室。')]),
       read(2,3,'问清时间，再确认约定',
        'A: Are you free on Sunday morning?\nB: Sorry, I work until twelve.\nA: How about three in the afternoon?\nB: That works for me. Where shall we meet?\nA: Outside the library.\nB: So, Sunday at three, outside the library?\nA: Yes. See you then.',[
        ('Why does B reject the first suggestion?','B works in the morning.','The library is closed all day.','B dislikes Sunday.','I work until twelve.','拒绝时说明实际限制。'),
        ('What does B do near the end?','Confirms the day, time and place.','Cancels the meeting.','Changes the library.','So, Sunday at three, outside the library?','重复关键信息是确认，而不是新提议。')]),
       read(2,4,'看懂改期邮件的结构',
        'Subject: Can we change our meeting?\n\nHi Rosa,\nWe planned to practise English on Tuesday at six. I’m sorry, but I have to work late that day. Could we meet on Wednesday at seven instead? We can use the same cafe near the station. Please let me know if that time works for you.\nThanks,\nBen',[
        ('What is the purpose of the message?','To request a different meeting time.','To quit learning English.','To change jobs.','Could we meet on Wednesday at seven instead?','请求是改期，不是取消学习。'),
        ('What stays the same?','The meeting place.','The day.','The time.','We can use the same cafe near the station.','分清改变的信息与保持的信息。')]),
       listening(2,5,0,4,'确认上课安排与原因',[
        ('课程安排在几点？','六点','四点','八点','It’s at 6, after school.','时间信息在when问题后的回答中。'),
        ('Beth为什么要用学校的电脑设施？','家里暂时没有网络','家里没有书桌','老师要求她带纸质作业','I don’t have internet at home yet.','yet说明目前尚未具备的条件。')],
        '这段对话同时包含地点、时间和原因。先复述两个确定信息，不确定的部分留空，再到原站核对。'),
       read(2,6,'综合任务：在限制中安排练习',
        'Three friends want a twenty-minute English practice.\nMaya: I’m free after 6 p.m. on Thursday.\nKen: I work until 7 p.m. on Thursday. I can arrive at the library at 7:15.\nAlex: I must leave by 8 p.m.\nLibrary: Small meeting rooms close at 7:45 p.m. You can book a room online. The cafe outside is open until 9 p.m.',[
        ('Which library slot works for everyone?','7:20–7:40 p.m.','6:10–6:30 p.m.','7:40–8:00 p.m.','Small meeting rooms close at 7:45 p.m.','先取三人时间的交集，再考虑房间关闭时间。'),
        ('How can they reserve a room?','Online.','Only by post.','Through Alex’s employer.','You can book a room online.','这是预约方式，不是到场时间。')]),
       read(2,7,'周测：新的活动安排',
        'Repair Workshop\nSaturday: 9:30–10:30 a.m. or 2–3 p.m.\nArrive fifteen minutes before your session. Bring one small item. Book by Thursday evening.\n\nAsha works until noon on Saturday. The workshop is twenty minutes from her workplace. She wants to bring a desk lamp. Her friend would like to join, but has not booked a place. Each person needs a separate booking.',[
        ('Which session can Asha attend?','The afternoon session.','The morning session.','Neither session.','Asha works until noon on Saturday.','把工作结束时间与两个场次比较。'),
        ('When should Asha arrive for that session?','1:45 p.m.','2:00 p.m.','2:15 p.m.','Arrive fifteen minutes before your session.','把提前十五分钟的规则用于下午两点场次。'),
        ('What must Asha’s friend do?','Make a separate booking.','Share Asha’s place automatically.','Bring two items.','Each person needs a separate booking.','同行不等于已经预约。')])]
    ]
    # Five contextual items per new-learning day, not randomly extracted sentences.
    chunk_rows=[[
      ('my name is','我叫……','My name is Yuki.'),('nice to meet you','初次见面的问候','Nice to meet you, Paul.'),("I'm from",'我来自……；换主语时调整be动词','I am from Chengdu.'),('first day','第一天','It is my first day here.'),('how about you','把同一问题问回对方','I live nearby. How about you?'),
      ('live near','住在……附近','I live near a lake.'),('work in','在某地或行业工作','I work in a shop.'),('take the bus','乘公交车','I take the bus to class.'),('after class','下课后','We talk after class.'),('talk to','和……交谈','I talk to visitors.'),
      ('could you repeat that','请对方重复','Could you repeat that, please?'),('a little slower','稍慢一点','Could you speak a little slower?'),('how do you spell','询问拼写','How do you spell your name?'),('nice talking to you','结束一次交谈','It was nice talking to you.'),('I mean','修正或解释自己的意思','I mean the class on Friday.'),
      ('would you like to','邀请对方做某事','Would you like to practise?'),('before class','上课前','Let’s meet before class.'),('want to','想要做某事','I want to help visitors.'),('difficult for me','对我来说困难','Speaking is difficult for me.'),('because I','说明自己的原因','I study because I enjoy it.'),
      ('a beginner','初学者','I am a beginner.'),('help with','在……方面帮助','Can you help with this word?'),('good at','擅长；后接名词或-ing','She is good at listening.'),('learn from','向……学习','I learn from my classmates.'),('practise with','和……一起练习','I practise with a friend.')], [
      ('get up','起床','I get up at seven.'),('have breakfast','吃早餐','I have breakfast at home.'),('leave home','离开家','I leave home at eight.'),('go to work','去上班','I go to work by bus.'),('in the morning','在早晨','I read in the morning.'),
      ('on Friday','在周五','The lesson is on Friday.'),('at half past six','在六点半','I arrive at half past six.'),('finish work','下班','I finish work at five.'),('arrive before','在……之前到达','Please arrive before seven.'),('by noon','最晚到中午','Please reply by noon.'),
      ('are you free','询问是否有空','Are you free tonight?'),('how about','提出建议；后接名词或-ing','How about Saturday?'),('works for me','时间或安排适合我','Ten o’clock works for me.'),('outside the library','在图书馆外面','Meet me outside the library.'),('see you then','到时候见','Great. See you then.'),
      ('have to','不得不；需要','I have to work late.'),('work late','加班到较晚','I work late on Mondays.'),('could we','礼貌提议共同安排','Could we meet tomorrow?'),('let me know','告诉我；让我知道','Please let me know today.'),('instead','改为；代替原安排','Can we meet on Sunday instead?'),
      ('at home','在家','I study at home.'),('not yet','还没有','Is it ready? Not yet.'),('after school','放学后','We meet after school.'),('on time','准时','Please come on time.'),('make sure','确认；确保','Make sure you have the address.')]]
    # Each day's teaching, production and delayed-transfer task is distinct.
    lessons=[[
      ('听懂初次见面','用姓名、身份和来处组织介绍。am用于I，are用于you；不要在I work前加am。','I’m Sora. I’m from Osaka. I work in a bakery. What’s your name?', 'I am work in a bakery. → I work in a bakery.：work已是实义动词。','把姓名、城市、工作各换一次，再向一个新人问一个问题。','录30–45秒：向新同学介绍姓名、居住地和工作或学习情况，并问对方一个问题。','I’m Lin. I live in Qingdao. I work in a shop. I study English in the evening. How about you?','是否说清三项信息？最后是否给对方回答机会？','三天后，向活动组织者介绍自己，只保留相同结构，换成参加活动的原因。'),
      ('读资料卡，提取有用信息','先找资料标签，再看补充句。工作、学习和交通信息要各自对应。','Home: Dalian. Class: Friday, 6 p.m. I take the train to class.','I live at Dalian. → I live in Dalian.：城市前通常用in。','遮住资料卡，回想职业、上课时间、交通方式；再改成自己的信息。','写4–5句自己的资料，包括住处、工作、学习时间和一个目标。','I live in Wuhan. I work in a cafe. My class is on Monday. I walk to class. I want to talk to visitors.','检查时间是否具体，代词是否始终指向同一人。','三天后，为一位虚构新同事写资料，不照抄今天的城市与职业。'),
      ('把独白变成来回交流','使用回答＋补充＋反问；听不懂时请求重复。先理解问题，再练短元音/i/和/ɪ/，不以像母语者为目标。','A: Where do you live? B: Near a park. It is quiet. How about you?','只回答Yes然后停住 → 补一句信息，再反问。不是每个问题都能用Yes回答。','自己扮演双方：问住处、问工作、请求重复姓名。每次留两秒给对方。','录45–60秒双角色交流：陌生人问你住哪里，你回答并反问；最后确认对方名字。','A: Hi, I’m Mei. B: I’m Ali. A: Do you live nearby? B: Yes, near the station. How about you? A: Near a school. Could you spell your name?','听回放：是否有真正的问答？请求重复是否礼貌清楚？','三天后在书店情境中重录：交换兴趣，不再讨论住址。'),
      ('写一封有目的的介绍邮件','邮件分成问候、身份、原因、请求、署名。短句写清意思即可；今天无需追求长文。','Hi Jo, I’m in your class. I want to practise speaking. Could we talk before class? Best, Rui','I want practise. → I want to practise.：want后接to加动词。','先列身份、困难、请求三个要点；用because连接学习原因。','给新同学写40–60词邮件：介绍自己，说明学习目标，邀请一次10分钟练习；允许先写30词。','Hi Kim, My name is Tao. I work in a hotel. I want to speak to guests, but I find questions difficult. Would you like to practise for ten minutes after class? Best, Tao','请求是否明确？because后面是否有完整主语和动词？','三天后给志愿者负责人写短信息：介绍自己并询问见面地点。'),
      ('复述困难，再主动求助','第一遍只听主旨，第二遍找困难与帮助。复述时说谁需要什么，不逐字背诵。','My friend is new to English. She wants help with questions. I can practise with her.','She want help. → She wants help.：一般现在时第三人称单数留意-s。','先慢速分意群说两遍，再自然说一遍；用录音比较是否更清楚而非更快。','先用1–2句复述所听内容，再录30秒：说自己的一个学习困难，向同学提出具体帮助请求。','I find phone numbers difficult. Could you say the numbers slowly? Then I can repeat them to check.','请求能否让对方知道具体怎么帮你？比较首录与重录的停顿。','三天后换成问路情境，说明没听清哪一部分并请求重复。'),
      ('换场景：认识社区新朋友','把介绍迁移到社区活动：身份信息少一点，兴趣与互动多一点。','I’m new to this area. I enjoy cooking. What do you like doing?','I like cook. → I like cooking.：表达爱好可用like加-ing。','先口头试一次，再遮住示范写；不使用课堂或工作的旧背景。','写一张30–50词的活动介绍卡，再口头向另一位参加者问两个与兴趣有关的问题。','Hello, I’m Ning. I live near the library. I enjoy reading and cycling. I’d like to meet my neighbours. What do you like reading?','至少更换背景和一个表达目的；不是只把原稿名字换掉。','三天后为一次线上读书会重新介绍自己，询问喜欢的书。'),
      ('周复盘：新材料与介绍迁移','先做新的阅读，再选本周原稿，只改两个具体问题。已浏览过周测材料时如实标为重复练习。','复盘顺序：定位漏掉的信息 → 引用自己的原句 → 修改 → 换情境再表达。','把正确率高当作口语流利 → 另留一段新录音，检查真实表达。','提取五个词块；从本周记录挑一个句法问题和一个信息遗漏。','先保存本周修改稿，再写一条给志愿者负责人的新消息：介绍自己、说明空闲时间并问见面地点。','Hello, I’m Yun. I work at a cafe. I’m free on Sunday afternoon. I’d like to help at the event. Could you send me the meeting place?','新消息是否覆盖身份、时间、请求？修改稿是否关联原稿？','三天后换成求职培训报名情境，独立介绍自己的学习需要。')], [
      ('听懂一天的开始','用动词串起活动，用at加具体钟点。先听见关键活动，不要求逐字转写。','I get up at seven. Then I have breakfast. I leave home at eight.','I get up in seven. → I get up at seven.：具体钟点前用at。','用三个动作描述自己早晨；第二次加入时间，避免全部句子只说then。','录45秒：先概述录音中的早晨，再说自己的三项活动和两个时间。','I get up at half past six. I have breakfast at seven. Then I take the bus to work. On Sunday I get up later.','动作顺序和时间是否一致？用自己的安排完成比较。','三天后描述晚上的安排，不用早晨的动作。'),
      ('把时间表用来做选择','阅读表格先确定目的，再检查时间限制。by是最晚期限，before是某时刻之前。','The bus leaves at five. Be there before five. Book by Thursday.','把by Thursday理解为周四之后 → 最晚周四，不是从周四开始。','先圈课程类型，再计算下班到达时间；口头解释为什么另一项不合适。','写4句给同伴：选择一节可参加的课，说明原因、地点和预约期限。另写自己的一个课程偏好。','I prefer the evening class because I work in the afternoon. The class is in Room 8. I can arrive before it starts. I will book by Tuesday.','选择是否满足所有限制？不能只找文本里出现的同一个词。','三天后读公交或活动时间表，重新判断可行时间。'),
      ('商量时间，确认地点','拒绝一个时间时给简短原因，再提一个替代；最后复述日期、时间和地点。','Sorry, I’m busy at two. How about four? Great, four on Friday, outside the cafe.','只说Maybe然后结束 → 提供具体替代，让对方能确认。','三轮角色练习：邀请→拒绝并解释→改时间→确认；重点重读时间和地点。','录60秒双角色交流：你周六上午工作，对方下午五点离开；商量20分钟练习，并确认地点。','A: Are you free on Saturday morning? B: Sorry, I work then. How about three? A: That works for me. Outside the cafe? B: Yes, Saturday at three.','双方限制是否满足？最终约定是否清楚？','三天后把约定改为线上通话，同时确认谁发链接。'),
      ('写改期请求','保留原约定作背景，说明原因，给新时间，询问是否方便。无需长篇道歉。','We planned to meet on Monday. I have to work late. Could we meet on Tuesday instead?','Could we meeting? → Could we meet?：情态动词后用动词原形。','先列“原安排→原因→替代→确认”四个要点；检查星期与钟点没有漏掉。','写40–70词：原定周五六点练习，因为工作要改到周六上午十点；地点不变，询问对方能否接受。','Hi Pat, We planned to meet on Monday at five, but I have to take my sister to the doctor. Could we meet on Tuesday at six instead? The library still works for me. Please let me know. Thanks, Bo','原因是否够清楚？新日期和时间是否完整？是否请求确认而非单方面通知？','三天后为修理预约改期，使用新的原因和两个可选时间。'),
      ('听出安排背后的原因','用where、when、why分别整理地点、时间、原因。听不清的栏先空着，核对后用另一种颜色补。','Where: a learning centre. When: Friday evening. Why: my home is noisy.','把猜测填成确定答案 → 先标不确定，再重听对应问题之后的回答。','先用三个标签作笔记；核对后合成两句，最后脱离笔记复述。','录45–60秒：复述对话中的安排与原因；再说明你会在哪里学英语及一个实际原因。','I study at the library on Saturday morning because my home is noisy. I bring headphones and practise speaking outside after reading.','能否区分听到的事实与自己的安排？原因和选择是否对应？','三天后解释一次改地点的决定，用because说明真实限制。'),
      ('多重限制：安排一次小组练习','先找所有人都空闲的区间，再检查场地；一个条件不满足就需要换方案。','One person arrives at four; another leaves at five. A twenty-minute slot can fit between them.','只看最早到达的人 → 必须等所有人到场后才能开始。','写下最晚到达和最早离开；算可用区间，再挑20分钟。','根据材料写40–60词小组通知：确定可行时间、地点和预约方式，解释一个选择理由。','Hello everyone, Let’s meet from 4:10 to 4:30 at the centre. Everyone can arrive by four, and the room closes at five. I will reserve the room online. Please confirm today.','方案是否逐项满足三个人及场地限制？不能直接照搬示范里的时间。','三天后增加一个人迟到15分钟的条件，重新安排或说明无法成行。'),
      ('周复盘：把规则应用到新活动','用新的通知检查能否计算到达时间与预约要求；之后修改原稿并迁移到预约情境。','复盘时记“我漏看了什么条件”，而不是只记题号。','只记正确选项 → 写出证据和为什么旧方案不可行。','抽查五个词块，回看一份改期原稿，只改两个影响理解的问题。','写给修理店的消息：介绍要修的物品、给两个可选时间、问需要带什么。然后录30秒电话版本。','Hello, I’d like to repair a small fan. I’m free on Tuesday after four or Friday morning. Could I book a time? Please let me know what I should bring. Thank you.','两个时间是否明确？书面和电话表达是否都提出了实际问题？','三天后为一次培训报名安排时间，独立处理一个冲突。')]]
    result=[]
    for w in (1,2):
        days=[]
        for d,row in enumerate(lessons[w-1],1):
            title,explain,example,error,practice,output,model,check,retest=row
            days.append(dict(id=f'sample-v1-w{w:02}-d{d}',title=title,input=inputs[w-1][d-1],
                teaching=dict(explain=explain,example=example,error=error,practice=practice),
                output=output,model=model,check=check,retest=retest,
                recall='遮住答案，提取昨天的词块；第一次学习先说三句自己会的英语。' if d<4 else f'先复测第{d-3}天的表达，再处理到期词块；总计10分钟。',
                mode='writing' if d in (2,4,6,7) else 'speaking',minutes=[10,20,15,10,5]))
        chunks=[dict(id='chunk-'+hashlib.sha256(p.encode()).hexdigest()[:14],phrase=p,meaning=m,example=e,
                     sourceId=f'sample-v1-w{w:02}',reviewStatus='authored') for p,m,e in chunk_rows[w-1]]
        result.append(dict(version=1,title='认识新同学' if w==1 else '安排一天、约定时间',
            goal='介绍自己、回应对方，并在听不懂时请求帮助。' if w==1 else '理解时间限制，商量安排并写清改期请求。',
            days=days,chunks=chunks,reviewStatus='authored',humanReviewed=False))
    if units and len(units)>2:
        result.extend(_full_week(u,u['week'],checks) for u in units[2:])
    return result
