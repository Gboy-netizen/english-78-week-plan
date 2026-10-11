"""The v3 teaching manifest. Original exercises remain uncalibrated practice.
Builds are deterministic; dates only enter through actual resource verification.
"""
import copy,hashlib,json,re
from collections import Counter
from pathlib import Path
import course_content
ROOT=Path(__file__).resolve().parent
PHASES=[(1,12,'foundation','基础恢复'),(13,28,'everyday','日常理解与表达'),(29,44,'independent','持续表达与考试入门'),(45,60,'ielts','IELTS专项训练'),(61,72,'strengthen','薄弱科强化'),(73,78,'verify','综合验证')]
STOP=set('a an the and or but for of to in on at by with from is are am was were be been this that these those it he she they we you i his her their our your as if then than do does did not have has had will can may could would should'.split())
def read(name):return json.loads((ROOT/'data'/name).read_text(encoding='utf-8-sig'))
def digest(text):return hashlib.sha256(text.encode()).hexdigest()[:14]
def paragraphs(text):
    parts=[p.strip() for p in text.split('\n\n') if p.strip()]
    return parts or [text.strip()]
def evidence(text,q):
    ps=paragraphs(text)
    match=re.search(r'paragraph (\d+)',q['prompt'],re.I)
    if match:idx=min(len(ps)-1,int(match.group(1))-1);method='paragraph-reference'
    else:
        terms=set(re.findall(r'[a-z]+',(q['explanation']+' '+q['options'][q['correct']]).lower()))-STOP
        idx=max(range(len(ps)),key=lambda i:len(terms & set(re.findall('[a-z]+',ps[i].lower()))));method='candidate-token-overlap'
    quote=ps[idx];start=text.index(quote)
    return {'start':start,'end':start+len(quote),'quote':quote,'paragraph':idx+1,'method':method,'humanReviewed':False}
def material(old,week,kind):
    m=copy.deepcopy(old);m['id']=f'v3-w{week:02}-{kind}';m['version']=3;m['sourceId']=m['id'];m['reviewStatus']='machine-checked';m['examEvidence']=False
    m['source']={'kind':'original','label':'原创教学练习；未独立人工审定，不是标准化测评'}
    # Remove the old artificial "which opening belongs" count-filler questions.
    m['questions']=[q for q in m['questions'] if 'extra' not in q['id']]
    for q in m['questions']:
        q['id']=q['id'].replace('v2-','v3-');q['evidence']=evidence(m['text'],q);q['reviewStatus']='machine-checked';q['difficulty']='教学参考';q['type']=q.get('type','detail')
    return m
def audio_questions(m):
    qs=[]
    # Genuine listening dictation with an explicitly bound utterance and word.
    # These questions test word recognition, never an IELTS band.
    candidates=[]
    segments=m['segments'][:3]
    counts=Counter(re.findall(r'\b[a-z]+\b',' '.join(s['text'] for s in segments).lower()))
    visible_words=set(re.findall(r'\b[a-z]+\b',m['title'].lower()))
    for n,seg in enumerate(segments,1):
        tokens=seg['text'].split();eligible=[(i,w) for i,w in enumerate(tokens) if len(w)>=4 and w.lower() not in STOP and w.isalpha()]
        if eligible:
            i,w=eligible[len(eligible)//2]
            unique=[(i,w) for i,w in eligible if counts[w.lower()]==1 and w.lower() not in visible_words]
            # Omit unusable segments instead of displaying the answer elsewhere
            # in this or a neighbouring question. Keep segment-based question IDs.
            if not unique:continue
            if counts[w.lower()]!=1 or w.lower() in visible_words:i,w=unique[len(unique)//2]
            candidates.append((n,seg,tokens,i,w))
    targets={w.lower() for _,_,_,_,w in candidates}
    for n,seg,tokens,i,word in candidates:
        heard=set(re.findall(r'\b[a-z]+\b',seg['text'].lower()))
        alternatives=[x for x in ['people','today','place','little','before','water','house','again','different','children'] if x not in heard|targets][:2]
        options=[word,*alternatives];r=(int(m['id'].split('-')[-1])+n)%3;options=options[r:]+options[:r]
        prompt=' '.join(tokens[:i]+['_____']+tokens[i+1:])
        start=m['text'].index(seg['text'])
        qs.append({'id':m['id']+f'-q{n}','prompt':prompt,'options':options,'correct':options.index(word),
            'explanation':'对照这一段真人录音确认缺词：'+seg['text'],'type':'dictation','difficulty':'教学参考',
            'reviewStatus':'machine-checked','evidence':{'quote':seg['text'],'start':start,'end':start+len(seg['text']),
                'audioStart':seg['start'],'audioEnd':seg['end'],'humanReviewed':False,'method':'aligned-corpus-utterance'}})
    if not qs:raise ValueError('Audio without usable dictation: '+m['id'])
    return qs
FOUNDATION_CHUNKS=[
 ('my name is','我叫……','My name is Mei.'),('live in','住在','I live in a small town.'),('work in','在……工作','I work in a shop.'),('nice to meet you','很高兴认识你','Nice to meet you.'),('near the park','在公园附近','I live near the park.'),
 ('take the bus','乘公交车','I take the bus to work.'),('at seven','在七点','Our class starts at seven.'),('need a pen','需要一支笔','I need a pen.'),('ask for help','寻求帮助','We can ask for help.'),('after class','下课后','We talk after class.'),
 ('get up','起床','I get up at six.'),('have breakfast','吃早餐','I have breakfast at home.'),('leave home','离开家','I leave home at eight.'),('on Sunday','在星期日','I call my mother on Sunday.'),('in the evening','在晚上','I study in the evening.'),
 ('how much','多少钱 / 多少','How much is this book?'),('would like','想要','I would like some water.'),('can you','你能……吗','Can you help me?'),('there is','有一个……','There is a library near my home.'),('next to','在……旁边','The shop is next to the bank.'),
 ('last week','上周','I visited my friend last week.'),('going to','打算','I am going to study tonight.'),('because of','因为……','The bus is late because of traffic.'),('a little','一点','I speak a little English.'),('look for','寻找','I am looking for a quiet room.')]
ESSAYS=[
 ('work','Some people prefer to work from home while others prefer an office. Discuss both views and give your opinion.'),
 ('learning','Adults should be encouraged to continue learning throughout their lives. To what extent do you agree?'),
 ('transport','Public money should improve public transport rather than build more roads. Discuss both views and give your opinion.'),
 ('technology','Technology helps people communicate but can also reduce face-to-face contact. Discuss the advantages and disadvantages.'),
 ('community','Local communities should provide more free public spaces. To what extent do you agree?'),
 ('environment','Individuals and governments share responsibility for reducing waste. Discuss both roles and give your opinion.'),
 ('health','Employers should help workers develop healthy habits. To what extent do you agree?')]
DETAILS=[
 ('What must Lena do to book the later Wednesday?','Submit a new request.','Keep the original email unchanged.','Pay a cancellation charge.','submit a new request rather than change the old email'),
 ('Who may operate the large ovens?','Trained staff.','All first-time volunteers.','Anyone wearing closed shoes.','only trained staff may operate the large ovens'),
 ('What does standard delivery include?','Carrying furniture to a ground-floor room.','Carrying it upstairs without checking access.','An exact delivery time chosen by the customer.','The service includes carrying furniture to a room on the ground floor.'),
 ('How are loan cameras allocated?','In the order requests arrive.','Automatically with every enrolment.','Only after the course ends.','allocated in the order requests arrive'),
 ('What happens to the inspection fee if Owen declines the repair?','It remains payable.','It is always refunded.','It covers a free screen repair.','the inspection fee is still payable'),
 ('What will the company do after six weeks?','Review the trial using several measures.','Keep the timetable permanently without review.','Use staff comments alone.','compare these with the previous six weeks before deciding whether to keep the arrangement'),
 ('How do visitors use the step-free entrance?','Ring the bell.','Use the unlocked main door.','Buy a cafe ticket.','Visitors using that entrance should ring the bell'),
 ('When can the damage bond be returned?','After an inspection finds no damage.','When the event date is first requested.','When kitchen use is confirmed.','returned after inspection if no damage is found'),
 ('How should patients change an appointment?','Contact reception.','Reply to the reminder text.','Wait for automatic rearrangement.','Patients should contact reception if they need to change an appointment.'),
 ('When must applicants renew their interest?','Each January.','Only when a plot is offered.','Every week.','must renew their interest each January'),
 ('Who may provide access for installation?','Another adult who can show where equipment should go.','Only the account holder in all cases.','Only a company employee.','provided the adult could show the installer where the equipment should go'),
 ('Where can residents take batteries?','To the collection point at the local shop.','To the mixed recycling bin.','To the paper bin.','take batteries to the collection point at the local shop'),
 ('What does Rina obtain for her revised claim?','An electronic taxi receipt.','A new bank account.','A guarantee that any taxi is reimbursed.','She obtained an electronic receipt from the taxi company'),
 ('What must all participants complete before their first swimming class?','A health declaration.','An advanced swimming test.','A permanent membership contract.','must complete a health declaration before the first session'),
 ('Which weekdays departure suits Farah?','The ten o’clock bus.','The eight o’clock bus.','A guaranteed ten fifteen departure.','could use the ten o\'clock bus'),
 ('What does an interview invitation mean?','The applicant is shortlisted, not already hired.','The job is already offered.','The application deadline changes to Wednesday.','The invitation did not mean that the job had been offered.'),
 ('When may Grace renew the missing book?','If no other reader has reserved it.','Only after finding it.','Only after replacing her card again.','if no other reader had reserved the book'),
 ('What does the organiser guarantee about the repair directory?','No guarantee of the listed businesses’ work.','Every listed repair will succeed.','All electrical work is free.','without guaranteeing the work of any listed business'),
 ('What does the residents’ group do before more spending?','Waits for a written decision.','Treats its receipt as a guaranteed award.','Removes all budget information.','postponed further spending until it received a written decision'),
 ('When are cash refunds normally available?','For withdrawal at least seven days before the course.','For every late withdrawal.','Only after all lessons finish.','withdraws at least seven days before the course starts'),
 ('How long can a call room be booked at a time?','Thirty minutes.','A whole working week.','Permanently with regular membership.','thirty minutes at a time'),
 ('What details appear in Chloe’s revised confirmation?','Both her seat and bicycle reservation.','A bicycle space without a passenger ticket.','A promise to remove other reservations.','both her seat and bicycle reservation'),
 ('When should customers report missing or damaged items?','Within twenty-four hours.','Only after eating the meal.','At the end of the month.','within twenty-four hours'),
 ('When should employees obtain course approval?','Before enrolling.','After submitting every expense.','Only after the examination.','Staff should obtain approval before enrolling.'),
 ('What alternative times does Sofia offer?','Friday morning or Monday afternoon.','Thursday morning only.','Any time without notice.','offering Friday morning or Monday afternoon'),
 ('What concern does Noah raise?','Limited wheelchair access.','Too much seating in every drawing.','A decision already made by the council.','one drawing left little space for wheelchair access'),
 ('Which costs are excluded from the scholarship?','Equipment, travel and optional activities.','Approved tuition in every case.','All costs of approved courses.','does not pay for equipment, travel or optional activities'),
 ('When can the group first access the hall?','Saturday at nine.','Friday evening.','Saturday after visitors arrive.','the hired room was available from nine')]
def transfer_case(case,detail,week):
    m={'id':f'v3-w{week:02}-transfer','version':3,'sourceId':f'v3-w{week:02}-transfer','title':case['title']+' · 未见迁移阅读',
       'text':case['text'],'questions':[],'reserved':True,'reviewStatus':'machine-checked','examEvidence':False,
       'source':{'kind':'original','label':'原创生活与工作案例；未独立人工审定'}}
    rows=[(case['question'],case['answer'],*case['wrong'],case['evidence']),detail]
    for n,(prompt,answer,b,c,quote) in enumerate(rows,1):
        start=m['text'].index(quote);options=[answer,b,c];r=(week+n)%3;options=options[r:]+options[:r]
        m['questions'].append({'id':f'v3-w{week:02}-case-q{n}','prompt':prompt,'options':options,'correct':options.index(answer),
            'explanation':'依据：'+quote,'type':'detail-or-condition','reviewStatus':'machine-checked','difficulty':'教学参考',
            'evidence':{'quote':quote,'start':start,'end':start+len(quote),'method':'authored-exact-quote','humanReviewed':False}})
    return m
def build():
    old=course_content.build_course_pack()['units'];human=read('human_library.json');foundation=read('foundation_human_lessons.json')
    if len(human)!=156:raise ValueError('Full core listening needs 156 real human excerpts')
    online=read('online_lessons.json') if (ROOT/'data'/'online_lessons.json').exists() else []
    banks={level:[p for p in online if p.get('level')==level and p.get('audioUrls')] for level in ['A1','A2','B1','B2']}
    cases=read('transfer_cases_v3.json');units=[]
    for i,u in enumerate(old):
        week=i+1;p=next(p for p in PHASES if p[0]<=week<=p[1]);level='A1' if week<=12 else 'A2' if week<=28 else 'B1' if week<=44 else 'B2'
        listening=[]
        for j in range(2):
            m=copy.deepcopy(human[2*i+j]);m['version']=4;m['questions']=audio_questions(m)
            m['instruction']='先听并填写缺词，不看全文。提交后看逐段文本，选一个意群跟读，再录音、回放和复述。朗读材料含文学用语，不能替代真实对话或考试听力。'
            if week<=12:
                support=copy.deepcopy(foundation[2*i+j]);m['support']=support;m['title']='真人短句 · '+support['title']
                q=support['questions'][0];quote=q['quote'];pos=m['text'].index(quote);segment=m['segments'][0]
                meaning={'id':m['id']+'-meaning','prompt':q['prompt'],'options':[q['answer'],*q['wrong']],'correct':0,'explanation':q['explanation'],'type':'main-meaning','reviewStatus':'authored',
                  'evidence':{'quote':quote,'start':pos,'end':pos+len(quote),'audioStart':segment['start'],'audioEnd':segment['end'],'humanReviewed':False}}
                rotation=(2*i+j)%3;meaning['options']=meaning['options'][rotation:]+meaning['options'][:rotation];meaning['correct']=meaning['options'].index(q['answer'])
                m['questions']=[meaning,*m['questions'][:1]]
                m['instruction']='先听短句并回答意思题，再尝试听辨一个关键词。提交后核对原始转写和中文，练习教学例句，最后换成自己的生活情境表达。'
            bank=banks[level]
            if bank:
                lesson=bank[(2*i+j)%len(bank)];urls=lesson['audioUrls'];m['conversation']={**lesson,'audio':urls[min(j+1,len(urls)-1)],'sourceId':lesson['url'],
                    'instruction':'这是另一份真人对话；全文、语法和习题在来源页。切换后重新保存首答，不沿用朗读题目。'}
            listening.append(m)
        if week>=51:
            source=copy.deepcopy(u['reading']);offset=len(paragraphs(source['text']));source['text']+='\n\n'+u['reading2']['text']
            extra=copy.deepcopy(u['reading2']['questions'])
            for q in extra:
                q['prompt']=re.sub(r'paragraph (\d+)',lambda m:'paragraph '+str(int(m[1])+offset),q['prompt'])
                q['explanation']=re.sub(r'第\s*(\d+)\s*段',lambda m:'第 '+str(int(m[1])+offset)+' 段',q['explanation'])
            source['questions']+=extra
            core=material(source,week,'reading');transfer=transfer_case(cases[week-51],DETAILS[week-51],week)
        else:core=material(u['reading'],week,'reading');transfer=material(u['reading2'],week,'transfer')
        if week<51:transfer['title']=u['title']+' · 未见迁移阅读'
        transfer['reserved']=True
        chunks=[]
        if week<=2:
            for phrase,meaning,example in FOUNDATION_CHUNKS[(week-1)*13:week*13]:chunks.append({'id':'chunk-'+digest(phrase),'phrase':phrase,'meaning':meaning,'example':example,'sourceId':core['id'],'reviewStatus':'authored'})
        # Select complete short utterances/clauses; never truncate random words
        # and present those fragments as professionally selected collocations.
        sentences=re.split(r'(?<=[.!?])\s+',core['text'])
        for sent in sentences:
            words=sent.split()
            if 4<=len(words)<=20 and len(chunks)<25:
                chunks.append({'id':'chunk-'+digest(sent.lower()),'phrase':sent,'meaning':'句型提取：先解释意思，再替换人物、时间或条件。','example':sent,'sourceId':core['id'],'reviewStatus':'machine-selected'})
        grammar=copy.deepcopy(u['grammar']);grammar['reviewStatus']='machine-checked';grammar['examEvidence']=False
        grammar.update(id=f'v3-w{week:02}-grammar',sourceId=f'v3-w{week:02}-grammar',version=4,text='',materialKind='grammar',
            instruction='先独立选择，再提交查看规则与例句。需要先学习时可查看提示，本次会记录辅助使用。每次练习保留10分钟预算。')
        # Each former correct/incorrect pair reused the same sentences. Keep one
        # question per sentence so adjacent questions do not duplicate the test.
        grammar['questions']=grammar['questions'][::2]
        for q in grammar['questions']:
            q['id']=q['id'].replace('v2-','v3-');q['evidence']={'quote':q['options'][q['correct']],'rule':grammar['note'],'humanReviewed':False};q['reviewStatus']='machine-checked'
        task1=u['writing']
        if week>=51:
            task1=f'Write a letter to the organisation in "{cases[week-51]["title"]}". Explain your own situation, describe the difficulty and request a practical solution. Use the case as background, but change the personal details. Choose an appropriate opening and ending.'
        elif week>=45 and not task1.lower().startswith('write to'):
            task1='Write a letter to a local course organiser. Explain your learning goals, describe a timetable problem and ask whether another class or arrangement is available. Choose an appropriate opening and ending.'
        topic,essay=ESSAYS[(week-45)%len(ESSAYS)]
        units.append({'id':f'v3-w{week:02}','week':week,'title':u['title'],'goal':u['goal'],'phase':p[2],'phaseTitle':p[3],
            'difficulty':{'label':level+' 教学参考','basis':'阅读长度、句型与任务设计；未做标准化校准'},
            'reading':core,'transfer':transfer,'listening':listening,'grammar':grammar,'chunks':chunks,
            'writing':{'id':f'v3-w{week:02}-writing','prompt':task1,'task2':essay if week>=45 else None,
                'minWords':150 if week>=45 else min(180,30+week*5),'task2MinWords':250 if week>=45 else None,
                'checklist':['覆盖任务要求','段落或句子顺序清楚','引用一个自己需要改的原句','保存首次原稿后再求助 AI']},
            'speaking':{'id':f'v3-w{week:02}-speaking','prompt':u['roleplay'],'seconds':min(180,30+week*5),
                'part2':'Describe a useful service in your community. Say what it is, when you use it and why it matters.' if week>=45 else None,
                'part3':['Who should pay for public services?','How could services meet different people’s needs?'] if week>=45 else [],
                'checklist':['回答了问题','能给具体信息或理由','有一次原始录音','回放后选择2个改进点']},
            'pronunciation':['i','ih','eh','ae','th','dh','r','l','w','v'][i%10],
            'review':{'id':f'v3-w{week:02}-review','prompt':'不看旧答案，完成保留的迁移阅读；提取本周词块，再修改原稿或重录。用证据安排下周。'},
            'deliveryStatus':'training-ready','humanReviewed':False,'version':3})
    phonemes=read('pronunciation.json')['phonemes'];credits=read('phoneme_audio_credits.json')
    for item in phonemes:
        item['localAudio']='assets/phonemes/'+credits[item['audio']]['file'] if item.get('audio') in credits else None
        item['credit']=credits.get(item.get('audio'))
        for clip in item.get('media',[]):
            if clip.get('verifiedOn'):clip['legacyClaimedDate']=clip.pop('verifiedOn')
            clip['status']='unverified';clip['verifiedOn']=None
    diagnostic_reading={'id':'v3-diagnostic-reading','version':3,'sourceId':'v3-diagnostic-reading','title':'先读懂生活信息','text':'Mia works in a small bakery. She starts work at eight in the morning. On Friday she finishes at three. Her English class starts at four, near the station. She takes the bus to class. She brings a notebook, but the teacher gives her a pen. After class, Mia calls her sister and tells her one new thing she learned.',
      'translation':'先独立读；提交后再核对。Mia在面包店工作，周五三点下班、四点上英语课，坐公交并带笔记本。',
      'questions':[{'id':'diag-read-1','prompt':'When does Mia finish work on Friday?','options':['At three.','At four.','At eight.'],'correct':0,'explanation':'周五三点下班。'},
        {'id':'diag-read-2','prompt':'How does she travel to class?','options':['She walks.','She takes the bus.','She takes a train.'],'correct':1,'explanation':'She takes the bus to class.'},
        {'id':'diag-read-3','prompt':'Who gives Mia a pen?','options':['Her sister.','Her friend.','Her teacher.'],'correct':2,'explanation':'the teacher gives her a pen.'}],'reviewStatus':'authored','examEvidence':False}
    for q in diagnostic_reading['questions']:q['evidence']=evidence(diagnostic_reading['text'],q)
    diagnostic={'reading':diagnostic_reading,'listening':read('diagnostic_audio.json'),
        'harderReading':units[20]['reading'],
        'days':[{'day':1,'title':'听懂与开口','steps':[('基础听辨',10),('真人短听力',20),('口头介绍与录音',15),('回放与自查',10),('保存困难',5)]},
                {'day':2,'title':'读懂与组织句子','steps':[('分级阅读',25),('常用词块',15),('基础句法',10),('自查',5),('保存结果',5)]},
                {'day':3,'title':'写作与情境口语','steps':[('短写作',25),('情境口语',20),('四科结果整理',10),('确认起点',5)]}]}
    diagnostic['language']={'version':2,'items':[
        {'name':'v0','prompt':'住在……','answer':'live in'}, {'name':'v1','prompt':'在……工作','answer':'work in'},
        {'name':'v2','prompt':'乘公交车','answer':'take the bus'}, {'name':'v3','prompt':'下课后','answer':'after class'},
        {'name':'v4','prompt':'起床','answer':'get up'}, {'name':'g0','prompt':'我是初学者。补全：I ___ a beginner.','answer':'am'},
        {'name':'g1','prompt':'她在一家商店工作。补全：She ___ in a shop.','answer':'works'},
        {'name':'g2','prompt':'你住在公园附近吗？补全：Do you ___ near the park?','answer':'live'}]}
    manifest={'version':'3.0.1','schemaVersion':3,'phases':[{'start':a,'end':b,'id':c,'title':d} for a,b,c,d in PHASES],
        'units':units,'diagnostic':diagnostic,'phonemes':phonemes,'phonemeCredits':credits,
        'officialSources':read('official_practice.json'),
        'resourceChecks':read('resource_checks_v3.json') if (ROOT/'data/resource_checks_v3.json').exists() else [],
        'principles':['先理解，再模仿','主动提取与间隔复习','有意义的输入与输出','反馈转成下一次动作','用新材料验证迁移'],
        'limitations':['本地真人音频是朗读型材料，不是自然对话或 IELTS 试卷；自然对话另有原站入口。',
            '自编题与自动选择的句型未经过独立教师逐项复核，不换算 IELTS 分数。','题目证据由机器绑定，候选证据仍需人工抽检。',
            '文件解码、链接访问、人工试听分别记录；未人工试听的文件不标为人工核验。']}
    validate(manifest);return manifest
def validate(m):
    assert [u['week'] for u in m['units']]==list(range(1,79))
    ids=set();audio=set();reading=set()
    for u in m['units']:
        for mat in [u['reading'],u['transfer'],*u['listening']]:
            assert mat['id'] not in ids;ids.add(mat['id'])
            if 'audio' in mat:
                assert mat['audioKind']=='human-audio';assert (ROOT/mat['audio']).exists();assert mat['license']=='CC BY 4.0';audio.add(mat['audio'])
            else:
                assert mat['text'] not in reading;reading.add(mat['text'])
            for q in mat['questions']:
                assert q['id'] not in ids;ids.add(q['id']);assert q['evidence']['quote']==mat['text'][q['evidence']['start']:q['evidence']['end']]
                assert 0<=q['correct']<len(q['options'])
                if q.get('type')=='dictation':
                    answer=q['options'][q['correct']]
                    assert not any(re.search(r'\b'+re.escape(answer)+r'\b',other['prompt'],re.I) for other in mat['questions']),q['id']+' leaks its target word'
                    assert not re.search(r'\b'+re.escape(answer)+r'\b',mat['title']+' '+mat['instruction'],re.I),q['id']+' leaks through metadata'
        g=u['grammar'];assert g['text']=='' and g['materialKind']=='grammar'
        for q in g['questions']:
            assert q['id'] not in ids;ids.add(q['id']);assert 0<=q['correct']<len(q['options'])
        assert u['chunks'] and u['writing']['prompt'] and u['speaking']['prompt']
    for item in m['diagnostic']['language']['items']:
        assert not re.search(r'\b'+re.escape(item['answer'])+r'\b',item['prompt'],re.I)
    assert len(audio)==156 and len(reading)==156
    return {'weeks':78,'days':546,'localHumanAudio':len(audio),'readings':len(reading),'humanReviewedUnits':sum(u['humanReviewed'] for u in m['units'])}
