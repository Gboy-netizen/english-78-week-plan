"""Authored grammar sequence. Examples and answer keys are editorial content."""
import copy

# title | explanation | three correct sentences paired with common errors
ROWS = '''
主语与 be 动词|主语决定 be：I am；you/we/they are；he/she/it is。职业前常用 a/an。不要在一个简单句里省略谓语。|I am a shop assistant.~I is a shop assistant.|The classrooms are quiet.~The classrooms is quiet.|My neighbor is friendly.~My neighbor are friendly.
一般现在时|习惯和经常发生的事用一般现在时。第三人称单数通常加-s；其他主语用原形。|She walks to work.~She walk to work.|We study after dinner.~We studies after dinner.|The bus leaves at seven.~The bus leave at seven.
否定与助动词|实义动词的否定用 don't/doesn't；助动词后恢复原形。be 的否定直接加 not。|He does not drive.~He does not drives.|They are not ready.~They do not ready.|I do not need a ticket.~I not need a ticket.
一般疑问句|be 提到主语前；实义动词用 do/does 提问，后面用原形。避免中文语序直接套入。|Do you work nearby?~You do work nearby?|Is the office open?~Does the office open?|Does she take the train?~Does she takes the train?
特殊疑问句|疑问词后通常接助动词和主语。who 作主语时不用另加 do。how often 问频率。|Where does he live?~Where he does live?|Who works here?~Who does works here?|How often do you cook?~How often you cook?
冠词与可数名词|首次提到单数可数名词通常用 a/an，选择看发音；特指用 the。不可数名词不能机械加 a。|I need an umbrella.~I need a umbrella.|She bought a useful book.~She bought an useful book.|The book on my desk is yours.~Book on my desk is yours.
数量与不可数名词|many 修饰可数复数，much 修饰不可数名词。information/advice 通常不可数，用 a piece of 表示一条。|We need some information.~We need an information.|There are fewer chairs now.~There are less chairs now.|How much water is left?~How many water is left?
代词与所有格|主语用主格，动词或介词后用宾格。形容词性物主代词后接名词，名词性物主代词独立使用。|Please call her tomorrow.~Please call she tomorrow.|This notebook is mine.~This notebook is my.|Our teacher knows us.~Our teacher knows we.
There be 与位置|there is/are 表示存在，后面的名词决定单复数。地点放句末；have 表示拥有。|There are two exits.~There is two exits.|There is a pharmacy nearby.~There has a pharmacy nearby.|The hotel has a lift.~The hotel there is a lift.
现在进行时|正在发生的动作：be + -ing。一般状态动词如 know 通常不用进行时。|They are waiting outside.~They waiting outside.|I know the answer.~I am knowing the answer.|She is talking to a customer.~She is talk to a customer.
过去时与时间|有明确过去时间用过去式。did/didn't 后用原形；不规则变化单独记。|We went there yesterday.~We go there yesterday.|She did not see the sign.~She did not saw the sign.|Did you book a room?~Did you booked a room?
过去进行与事件顺序|过去进行时描述背景动作；一般过去时常表示插入的短动作。when/while 要结合语义判断。|I was cooking when he called.~I cooking when he called.|They were waiting at noon.~They was waiting at noon.|While she was reading, the lights went out.~While she reading, the lights went out.
将来安排|be going to 常表达已有计划；现在进行时也能表达已安排的将来行动；will 后用动词原形。|We are meeting on Friday.~We meeting on Friday.|I will call you later.~I will calling you later.|She is going to apply tomorrow.~She going to apply tomorrow.
现在完成时|have/has + 过去分词连接过去与现在。明确已结束的过去时间通常用过去时，不与 yesterday 搭配完成时。|I have lost my key.~I have lose my key.|She has lived here since May.~She have lived here since May.|We visited them yesterday.~We have visited them yesterday.
for 与 since|for 接持续时长；since 接起点。描述持续至今的状态时常与完成时配合。|I have worked here for three years.~I have worked here since three years.|He has been away since Monday.~He has been away for Monday.|We have known her for a long time.~We have known her since a long time.
时间地点介词|at 常接时刻，on 接具体日子，in 接月份/年份。地点短语要结合场景，不逐字翻译中文。|The class starts at eight.~The class starts on eight.|We meet on Tuesday.~We meet in Tuesday.|She moved here in June.~She moved here at June.
比较与最高级|短形容词常用-er/-est，较长形容词常用 more/most，不双重比较；than 引出比较对象。|This route is shorter than that one.~This route is more shorter than that one.|It is the most convenient option.~It is the most convenientest option.|Today is better than yesterday.~Today is more better than yesterday.
频率与方式副词|频率副词通常在实义动词前、be 后；修饰动作常用副词，描述主语常用形容词。|She usually arrives early.~She usual arrives early.|He speaks clearly.~He speaks clear.|They are often busy.~They often are busyly.
情态动词与请求|can/could/must/should 后用原形，不加 to 或第三人称-s。could 可用于礼貌请求。|Could you repeat that?~Could you to repeat that?|You should check the address.~You should checks the address.|She can help us.~She cans help us.
义务与禁止|mustn't 表示禁止；don't have to 表示不必，两者不能混用。have to 随主语和时态变化。|You must not park here.~You do not must park here.|She has to wear a badge.~She have to wear a badge.|You do not have to pay today.~You do not have pay today.
动词不定式|want/decide/hope 后常接 to do；目的也可用 to do。let/make 后接原形。|I decided to stay.~I decided staying.|We went out to buy milk.~We went out for buy milk.|Let me check the price.~Let me to check the price.
动名词|enjoy/avoid/finish 后接-ing；介词后用名词或动名词。不要混淆 look forward to 中的 to。|She enjoys reading.~She enjoys to read.|Thank you for helping.~Thank you for help.|I look forward to hearing from you.~I look forward to hear from you.
并列与因果|and/but/so 连接不同逻辑关系。英语避免 because 和 so 在同一结构中重复连接主从句。|I stayed home because I was ill.~Because I was ill, so I stayed home.|It was expensive, but it was useful.~It was expensive, but useful it was.|The train stopped, so we waited.~The train stopped, because so we waited.
条件句：真实可能|第一条件句常用 if + 现在时，主句 will + 原形。条件从句通常不用 will 表示未来。|If it rains, we will stay inside.~If it will rain, we will stay inside.|Unless you book, you may not get a seat.~Unless you will book, you may not get a seat.|Call me if you need help.~Call me if you will need help.
关系从句：人和物|who 指人，which 指物；that 可用于很多限定性从句。关系词作主语时不能再重复主语。|The woman who lives next door is a nurse.~The woman who she lives next door is a nurse.|This is the book that I borrowed.~This is the book that I borrowed it.|I need a desk which fits this room.~I need a desk which it fits this room.
宾语从句|间接问句使用陈述语序；whether/if 表示是否。主句礼貌提问不改变从句语序。|Could you tell me where the office is?~Could you tell me where is the office?|I wonder whether it is open.~I wonder whether is it open.|Do you know when she arrives?~Do you know when does she arrive?
被动语态|be + 过去分词强调承受动作的一方。be 随时态、主语变化；并非所有句子都需要被动。|The form was sent yesterday.~The form sent yesterday.|These rooms are cleaned daily.~These rooms is cleaned daily.|The road will be repaired.~The road will repaired.
过去完成时|had + 过去分词表示过去某一时点之前已经完成；不是凡过去都用过去完成。|The train had left when we arrived.~The train has left when we arrived.|She had finished before the meeting began.~She had finish before the meeting began.|I realized that I had forgotten my card.~I realized that I have forgotten my card.
非真实条件|假设现在或未来不太可能的情况：if + 过去式，主句 would + 原形。were 可用于假设 be。|If I had more time, I would volunteer.~If I have more time, I would volunteered.|If I were you, I would ask.~If I were you, I will asked.|We would move if rent were lower.~We would moved if rent were lower.
让步与对比|although 后接完整从句；despite 后接名词或-ing。避免 although...but 双重连接。|Although it rained, we continued.~Although it rained, but we continued.|Despite the delay, she arrived in time.~Despite it was delayed, she arrived in time.|While some agree, others disagree.~While some agree, but others disagree.
主谓一致|主语中心词决定动词，不被介词短语中的复数干扰。each/every + 单数名词通常用单数动词。|Each student has a locker.~Each student have a locker.|The list of names is ready.~The list of names are ready.|Both options are available.~Both options is available.
指代与段落衔接|指代对象应清晰；this/these 与名词数一致。连接词表达明确关系，不能只靠堆积过渡词。|These changes affect everyone.~This changes affect everyone.|This problem needs attention.~These problem needs attention.|Both plans have advantages, but neither is perfect.~Both plans have advantages, but neither are a perfect plan.
限定与非限定从句|非限定性关系从句提供补充信息，用逗号隔开，通常不用 that。不能用逗号把两个独立句硬连接。|Maya, who manages the shop, is away.~Maya, that manages the shop, is away.|The library, which opened last year, is popular.~The library, that opened last year, is popular.|My brother lives in Leeds, where he works.~My brother lives in Leeds, which he works.
分词与长句拆解|先找主句主谓，再看分词修饰对象。主动关系用-ing，被动关系常用过去分词；避免悬垂修饰。|The people waiting outside need help.~The people waited outside need helping now.|The documents attached to this email are important.~The documents attaching to this email are important.|Walking home, I noticed a new cafe.~Walking home, a new cafe was noticed my attention.
间接引语|转述过去的话常有时态和人称调整；转述事实可保留现在时。said 后不直接接人，told 后通常有人。|She told me that she was busy.~She said me that she was busy.|He asked whether I needed help.~He asked did I need help.|They said they would return.~They said they will returned.
程度与数量限定|too...to 表示过度导致无法，enough 放形容词后；few/little 通常偏否定，a few/a little 表示有一些。|The box is too heavy to carry.~The box is too heavy for carry.|The room is large enough.~The room is enough large.|We have a little time left.~We have a few time left.
情态完成式|may/might/could have done 表示对过去的可能推测；should have done 常表示未做到的建议或遗憾。|She may have missed the bus.~She may has missed the bus.|We should have checked first.~We should checked first.|He might have misunderstood.~He might had misunderstood.
复杂名词短语|名词短语中先辨中心词，再添加修饰；动名词可作主语。表达抽象概念时留意冠词和数。|Improving public transport takes time.~Improving public transport take time.|Access to reliable information is important.~Access to reliable information are important.|The cost of the two repairs was high.~The cost of the two repairs were high.
句子边界与标点|独立句间用句号、分号或并列连词；不能只用逗号连接。because 从句不能独立充当正式完整句。|It was late, so we left.~It was late, we left.|I stayed because the meeting was useful.~Because the meeting was useful.|The plan is simple; the cost is low.~The plan is simple the cost is low.
语域与礼貌表达|根据读者选择正式或日常语气。书信要具体而礼貌；避免僵硬套话和不完整请求。|I would appreciate it if you could reply.~I would appreciate if you could reply it.|Please let me know whether this is possible.~Please let me know is this possible.|I am writing to request a refund.~I am writing for request a refund.
'''.strip().splitlines()

def build_grammar(week, theme):
    index=week-1 if week<=40 else (week-41)%38
    title,note,*pairs=ROWS[index].split('|')
    examples=[x.split('~')[0] for x in pairs]
    questions=[]
    for i,pair in enumerate(pairs):
        right,wrong=pair.split('~')
        for mode in range(2):
            opts=[right,wrong,'Both sentences are correct.'] if mode==0 else [wrong,right,'Neither sentence needs correction.']
            rotation=(week+i+mode)%3;opts=opts[rotation:]+opts[:rotation]
            answer=right if mode==0 else wrong
            questions.append(dict(id=f'v2-w{week:02}-grammar-{len(questions)+1}',prompt='选择语法和表达正确的一句。' if mode==0 else '哪一句需要修改？',options=opts,correct=opts.index(answer),explanation=f'正确表达：{right} 对比：{wrong}。{note}'))
    exercises=[]
    for i,sentence in enumerate(examples[:2]):
        words=sentence.split();position=next((j for j,w in enumerate(words) if w.lower() in ['is','are','am','was','were','have','has','had','to','for','since','at','on','in','would','will','does','do','can','should','could']), min(2,len(words)-1));answer=words[position];words[position]='____'
        exercises.append(dict(kind='gap',prompt='填入缺失的语法词：'+' '.join(words),answer=f'{answer}。完整句：{sentence}。{note}'))
    for pair in pairs[1:]:
        right,wrong=pair.split('~');exercises.append(dict(kind='edit',prompt='改正这句话，并说明依据：'+wrong,answer=f'{right}。{note}'))
    exercises.extend([dict(kind='produce',prompt=f'围绕“{theme}”写两个自己的句子，使用本单元结构。',answer=f'开放题，无唯一答案。检查：主谓完整、时间一致、结构正确、符合主题。参考结构：{examples[0]}。不要只抄范句。'),dict(kind='transfer',prompt=f'把本周材料中的一个信息改写成自己的表达，再说明使用“{title}”如何改变句意或语气。',answer=f'保留原信息；正确使用本单元语法；解释对象、时间或逻辑关系。参考：{examples[-1]}。请让 AI 根据你的原句给反馈，不能仅按字数判断掌握。')])
    return dict(title=('综合运用 · ' if week>40 else '')+title,note=note,examples=' / '.join(examples),questions=questions,exercises=exercises,concept=index+1)
