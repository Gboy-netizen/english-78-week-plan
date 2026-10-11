"""Versioned 78-week teaching pack; no API or network dependency at build time."""
import copy
import re
import json
from pathlib import Path
from curriculum_library import FOUNDATION_SECOND, DOSSIERS
import curriculum_advanced, curriculum_exam, curriculum_exam_final, curriculum_consolidation, curriculum_finish
from reading_extensions import EXTENSIONS
import reading_extensions_middle, reading_extensions_upper, reading_extensions_upper_end
import reading_extensions_final_edits
from reading_extensions_foundation import ADDITIONS as FOUNDATION_ADDITIONS
from grammar_content import build_grammar
from comprehension_questions import add_questions

CHECKS=[10,20,30,40,50,60,70,78]
SOURCE={'kind':'original','label':'本项目原创教学材料；不是雅思真题','version':2}
OFFICIAL='https://ielts.org/take-a-test/preparation-resources/sample-test-questions/general-training-test'
LISTENING='https://ielts.org/take-a-test/preparation-resources/sample-test-questions'

def count(text): return len(re.findall(r"[A-Za-z]+(?:['’-][A-Za-z]+)*",text))

def material(week,kind,title,encoded):
    sections=[row.split('~',1) for row in encoded.split('||')]
    assert len(sections)==4 and all(len(x)==2 for x in sections),(week,kind)
    heads=[x[0] for x in sections]
    paragraphs=[x[1] for x in sections]
    questions=[]
    for i,(head,paragraph) in enumerate(sections):
        options=[head,heads[(i+1)%4],heads[(i+2)%4]]
        offset=(week+i)%3;options=options[offset:]+options[:offset]
        questions.append(dict(id=f'v2-w{week:02}-{kind}-{i+1}',prompt=f'Which heading best summarizes paragraph {i+1}?' if kind!='listening' else f'What is the main purpose of part {i+1} of the conversation?',options=options,correct=options.index(head),explanation=f'第 {i+1} 段重点是「{head}」。依据：{paragraph}。其余选项分别概括其他段落，不能代替本段主旨。',type='heading'))
    return dict(text='\n\n'.join(paragraphs),paragraphs=paragraphs,translation=f'主题导读：{title}。依次辨认「'+ '」「'.join(heads)+'」。先独立理解，再用原文证据解释每段作用；这段导读不是逐句翻译。',questions=questions)

WRITING=[
'Write to the food-bank coordinator. Explain your changing work schedule, offer two possible shifts, and ask how a shift will be confirmed.',
'Write to your supervisor about a scanner problem. Describe when it occurs, its effect on orders, and the support you need.',
'Write to the bus operator. Explain why the last bus is unsuitable for your shift, propose a later departure, and ask about any trial plans.',
'Write to the library manager. Describe a difficulty using the study room, explain who is affected, and suggest a practical improvement.',
'Write to a repair shop requesting an estimate. Describe the fault, ask what the inspection fee covers, and request approval before extra work.',
'Write to colleagues proposing a shorter meeting format. Explain the current problem, describe the new arrangement, and invite specific concerns.',
'Write instructions to a housemate about reducing food waste. Describe two changes, explain their reasons, and distinguish quality dates from safety dates.',
'Write to a guesthouse about a late arrival. Give your booking details, explain the delay, and ask how to obtain the key and early breakfast.',
'Write to a study partner proposing a new review routine. Explain why rereading is insufficient, describe the practice, and agree on a check-in.',
'Write to residents about a delayed workshop opening. Explain the reason, describe what can still take place, and state when the next update will come.',
'Some employers offer remote work to everyone. Discuss the benefits and limitations, and explain which arrangements you would recommend.',
'Write to your landlord about repeated condensation. Describe previous actions, request an inspection, and offer two access times.',
'Public services are increasingly provided online. Discuss the benefits and difficulties, and suggest how access can remain fair.',
'Should a council use a vacant site for parking or public green space? Discuss both views and give a reasoned opinion.',
'Why do misleading headlines attract attention, and what can readers and publishers do to reduce misunderstanding?',
'Adults often find it difficult to attend education courses. Explain the main barriers and propose practical responses.',
'Employers should encourage staff to be more physically active. Discuss possible benefits and limits without assuming all workers have the same needs.',
'Replacing disposable packaging with reusable containers is always beneficial. To what extent do you agree or disagree?',
'Write to a manager requesting a work placement. Explain relevant experience, identify what you hope to learn, and ask about the duties and schedule.',
'A study center has limited funds. Should it extend evening hours or improve daytime facilities? Discuss both options and give your view.',
'Write to a repair shop disputing additional charges. State what you approved, explain the difference on the invoice, and request a specific resolution.',
'Write to a course provider before enrolling. Explain your equipment and timetable constraints and ask about costs and missed lessons.',
'Write to a furniture supplier requesting a new delivery slot. Explain the access problem, propose alternatives, and ask for written confirmation.',
'Write to a shared-office manager. Explain the problem with private calls, propose a solution, and acknowledge another team affected by it.',
'Governments should lower public transport fares rather than add more services. Discuss both approaches and give your opinion.',
'Learning apps can replace traditional language teaching. To what extent do you agree or disagree?',
'Who should pay for work-related training: employers or employees? Discuss both views and give your opinion.',
'Building more homes near railway stations is the best way to improve urban life. To what extent do you agree or disagree?',
'Tourism benefits a community more than it harms it. Discuss the advantages and disadvantages and give your view.',
'Write to the council about its traffic-free street trial. Explain one benefit, one difficulty and a practical adjustment you recommend.',
'Write to a leisure center about a membership misunderstanding. Explain what you expected, what the policy says, and the help you request.',
'Write to a repair service about a time-sensitive job. Describe the item, explain both material and deadline requirements, and ask for a confirmed estimate.',
'Public reports should explain what they do not know as well as what they found. To what extent do you agree?',
'Write a report-style email to a delivery manager. Separate different complaint types, explain the evidence and recommend a next step.',
'Write to a venue to correct a booking. Confirm the final date, number of participants, total cost and contact details.',
'Write directions for a visitor with limited mobility. Explain the starting point, accessible route and temporary entrance restriction.',
'Working in a group produces better decisions than working alone. Discuss both views and give your own opinion.',
'Some people think all employees should work from home, while others believe shared workplaces are essential. Discuss both views and give your opinion.',
'Practical skills are best learned through experience rather than instruction. To what extent do you agree or disagree?',
'Write to a study partner proposing a four-skill practice week within one hour per day. Explain timing, review days and the limits of split-day results.',
'Write to an internet provider about repeated disconnections. Give evidence, describe the effect and request a suitable appointment and update.',
'Write to finance explaining a returned expense claim. Identify missing evidence, explain an exceptional journey and state how you will correct the claim.',
'Organizations should expand successful pilot projects immediately. To what extent do you agree or disagree?',
'Write to a hall manager confirming an event booking. Include capacity, setup time, equipment and the distinction between deposit and hire fee.',
'Write to a project tutor proposing a research question. Define what you will measure, describe one limitation and explain how you will protect participants.',
'Write to a landlord about a recurring security fault. Give the history, request action and an interim arrangement, and offer access times.',
'Public libraries are no longer necessary because information is online. Discuss both views and give your opinion.',
'Technology has made everyday life simpler. To what extent do you agree or disagree?',
'Write a reflection to your coach about a repeated error. Explain the evidence, its likely cause, a targeted exercise and how you will test transfer.',
'Write a progress email distinguishing strengths, weak evidence and next priorities. Explain why course completion does not establish an examination score.',
'Write to a museum asking whether an offer applies to you. Explain your circumstances and clarify eligibility, timing and required evidence.',
'Write to your study partner explaining your final-month priorities. Keep the 6.5 goal, describe evidence gaps and propose a review date.',
'Exposure to many different speakers is more useful than repeatedly listening to one familiar speaker. Discuss both approaches and give your view.',
'Write a note to your coach about a timed reading attempt. Describe where time was lost and propose a specific strategy to test on new material.',
'Rewrite an earlier essay on public transport fares using an unfamiliar example. State your view, explain funding and access, and address an objection.',
'Write about a decision changed by new information. Explain the original plan, the evidence and the outcome, then discuss a limitation of relying on one visit.',
'Write a final-assessment checklist for your study partner. Explain unseen materials, timing, assistance, source labels and what the result can establish.',
'Write a final learning report. Compare baseline and current evidence, identify unresolved weaknesses and propose a focused four-week extension if needed.'
]

def build(legacy):
    official=json.loads((Path(__file__).parent/'data/official_practice.json').read_text(encoding='utf-8'))
    units=copy.deepcopy(legacy)
    for week,(theme,title,encoded) in enumerate(FOUNDATION_SECOND,1):
        u=units[week-1];u['reading2']=material(week,'read2',title,encoded)
        # Preserve the carefully authored legacy detail questions, adding a new
        # text-evidence task rather than relabeling its old score as new work.
        for kind in ['reading','listening']:
            part=u[kind]; sentence=re.split(r'(?<=[.!?])\s+',part['text'])[0]
            opts=[sentence,'The text says everyone follows the same daily routine.','The text is a scientific report comparing several countries.']
            if kind=='listening': opts=[sentence,'The speakers are explaining a scientific experiment.','The conversation contains no practical information.']
            n=(week+1)%3;opts=opts[n:]+opts[:n]
            part['questions'].append(dict(id=f'v2-w{week:02}-{kind}-extra',prompt='Which statement or opening belongs to this material?',options=opts,correct=opts.index(sentence),explanation=f'原文开头：{sentence}。其他选项添加了原文没有的概括。',type='evidence'))
        u['model']=u['reading']['text']
        for kind,extra in zip(['reading','reading2'],FOUNDATION_ADDITIONS.get(week,('',''))):
            if extra:
                u[kind]['text']+='\n\n'+extra
                if 'paragraphs' in u[kind]:u[kind]['paragraphs'].append(extra)
    for week,theme,title,a,b,c,d in sorted(DOSSIERS):
        u=dict(week=week,id=f'w{week:02}',title=theme+' · '+title,goal='理解信息与限制，解释证据，再用自己的表达完成本周任务。',reading=material(week,'read',title,a),reading2=material(week,'read2',title+' — another perspective',b),listening=material(week,'listening',title+' — conversation',c),transfer=material(week,'transfer','Unseen check: '+theme,d),writing=WRITING[week-21],roleplay=f'围绕“{theme}”进行对话：先由你说明本周案例中的实际问题；请AI扮演另一方，提出一个条件变化和三个追问。用事实说明选择、限制和下一步行动。不要背诵原文。',minWords=100 if week<=30 else 150 if week<=44 or WRITING[week-21].startswith('Write') else 250,speakingSeconds=120,model=' '.join(x.split('~',1)[1] for x in b.split('||')[:2]))
        units.append(u)
    add_questions(units)
    for u in units:
        if u['week'] in EXTENSIONS:
            for kind,extra in zip(['reading','reading2'],EXTENSIONS[u['week']]):
                p=u[kind];sections=[x.split('~',1) for x in extra.split('||')];base=len(p['paragraphs'])
                p['paragraphs'].extend(x[1] for x in sections);p['text']='\n\n'.join(p['paragraphs'])
                for i,(heading,paragraph) in enumerate(sections):
                    alternatives=[heading,sections[(i+1)%len(sections)][0],p['questions'][0]['options'][p['questions'][0]['correct']]]
                    rotation=(u['week']+i)%3;alternatives=alternatives[rotation:]+alternatives[:rotation]
                    p['questions'].append(dict(id=f'v2-w{u["week"]:02}-{kind}-long-{i+1}',prompt=f'Which heading best summarizes paragraph {base+i+1}?',options=alternatives,correct=alternatives.index(heading),explanation=f'本段围绕「{heading}」。原文依据：{paragraph}。其他标题对应不同段落，遗漏了本段的核心关系。',type='heading'))
    for u in units:
        w=u['week'];u['version']=2;u['phase']='P'+str(min(8,(w-1)//10+1));u['level']='基础' if w<=10 else '基础进阶' if w<=20 else '中级衔接' if w<=40 else '独立表达' if w<=50 else '雅思题型训练'
        u['grammar']=build_grammar(w,u['title'])
        u['stageCheck']=w in CHECKS
        u['listening']['audioKind']='system-tts';u['listening']['dictation']=re.split(r'(?<=[.!?])\s+',u['listening']['text'])[1:3]
        u['authentic']={'url':LISTENING,'label':'IELTS 官方样题与真人听力入口（联网）','instruction':'选择 Listening 样题中的一个未练片段，先听后答，再核对 transcript。记录具体题目、日期与提示使用。该入口不是本周自编文本的真人配音。','fallback':OFFICIAL}
        if w>=21:
            sample=official['listening'][min(7,(w-21)//7)]
            u['authentic'].update(url=sample['url'],label=sample['name']+' · 官方真人样题',instruction='本阶段用这份公开样题做精听。第一次先独立作答，后续重听标为已见材料，不把重复结果当作新模考。先听10分钟、对照官方答案与 transcript 5分钟，替代当天等量核心练习。免费样题只有有限数量，后续独立模考需另选未见过的合法材料。')
        u['examPractice']=None if w<51 else {'url':OFFICIAL,'label':'官方 G 类样题 · 分科诊断','minutes':60,'instruction':'阅读：选择未见过的完整40题/3部分材料，按其说明计时60分钟；写作：Task 1至少150词、Task 2至少250词，共60分钟。当天替代普通任务，次日复盘。免费样题未构成完整套卷时，仅记录分项训练，不拼成虚假整卷成绩。'}
        for kind in ['reading','reading2','listening','transfer','grammar']:
            p=u[kind];p.update(id=f'v2-w{w:02}-{kind}',version=2,week=w,skill='reading' if kind.startswith('read') else kind,level=u['level'],minutes=15 if kind!='grammar' else 12,source=copy.deepcopy(SOURCE))
            p.setdefault('title',u['title']+{'reading':' · 主阅读','reading2':' · 应用阅读','listening':' · 听力','transfer':' · 陌生周测','grammar':''}[kind])
            for q in p['questions']:
                if not q['id'].startswith('v2-'):q['id']='v2-'+q['id']
        u['chunks']=[]
        if w>=21:
            u['roleplay']='情境：'+u['listening']['paragraphs'][0]+'\n你扮演先提出问题的一方，AI扮演回应者。请围绕以下已知限制追问并确认安排：'+u['listening']['paragraphs'][2]+'\n第一轮可以参考材料；第二轮请AI改变一个日期、费用或条件，最后由你复述双方真正同意的下一步。只问一个问题，等待回答后继续。'
        # Short useful phrases remain connected to the exact sentence they came from.
        for sent in re.split(r'(?<=[.!?])\s+',u['reading']['text'])[:4]:
            u['chunks'].append({'phrase':' '.join(sent.split()[:6]),'example':sent,'instruction':'听完整句，再用自己的场景替换人物、时间或条件；不要只记孤立词。'})
    validate(units)
    return {'version':2,'units':units,'source':SOURCE['label'],'coverage':{'weeks':78,'readings':156,'listening':78,'transfer':78,'grammar':78},'limitations':['内置听力为系统合成语音；真人练习需打开官方资源。','W21–50增加分级长文，W51起短篇策略课配合独立官方分科训练；内置文章不是完整雅思试卷。','自编题以细节理解、段落匹配和语法应用为主，不是经过标准化校准的雅思题库。']}

def validate(units):
    if [u['week'] for u in units]!=list(range(1,79)):raise ValueError('必须连续覆盖78周')
    ids=set();texts=set()
    for u in units:
        if u['week']<=50:
            minimum,maximum=(80,150) if u['week']<=10 else (150,250) if u['week']<=20 else (250,400) if u['week']<=30 else (350,550) if u['week']<=40 else (450,700)
            for kind in ['reading','reading2']:
                if not minimum<=count(u[kind]['text'])<=maximum:raise ValueError(f'阅读梯度不符 W{u["week"]}/{kind}: {count(u[kind]["text"])}')
        for kind in ['reading','reading2','listening','transfer','grammar']:
            p=u[kind]
            if kind!='grammar':
                if p['text'] in texts or count(p['text'])<35:raise ValueError(f'重复或过短 {p["id"]}')
                texts.add(p['text'])
            minimum=6 if kind=='grammar' else 3 if kind=='transfer' else 4
            if len(p['questions'])<minimum:raise ValueError(f'题目不足 {p["id"]}')
            for q in p['questions']:
                if q['id'] in ids or len(set(q['options']))!=3 or not 0<=q['correct']<3 or not q['explanation']:raise ValueError(f'无效问题 {q["id"]}')
                ids.add(q['id'])
        if len(u['grammar']['questions'])+len(u['grammar']['exercises'])<12:raise ValueError('语法训练不足')
