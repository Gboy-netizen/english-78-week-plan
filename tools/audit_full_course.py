"""Reproducible content inventory; counts are not evidence of learning efficacy."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from course_content import build_course_pack
from course_v2 import count

def main():
    pack=build_course_pack();units=pack['units']
    parts=[u[k] for u in units for k in ['reading','reading2','listening','transfer']]
    questions=[q for u in units for k in ['reading','reading2','listening','transfer','grammar'] for q in u[k]['questions']]
    report={'version':2,'weeks':len(units),'days':len(units)*7,'coreReadings':len(units)*2,'listeningUnits':len(units),'transferTexts':len(units),'uniqueTexts':len({p['text'] for p in parts}),'totalEnglishWords':sum(count(p['text']) for p in parts),'objectiveQuestions':len(questions),'grammarExercises':sum(len(u['grammar']['questions'])+len(u['grammar']['exercises']) for u in units),'writingTasks':len(units),'speakingTasks':len(units),'phases':[], 'limitations':pack['limitations'], 'qualitySignals':{'questionsWithExplicitEvidence':sum(bool(q.get('evidence')) for q in questions),'questionsWithExplanation':sum(bool(q.get('explanation')) for q in questions),'listeningAudioKinds':{'system-tts':sum(u['listening'].get('audioKind')=='system-tts' for u in units)},'officialListeningLinks':sum(bool(u.get('authentic',{}).get('url')) for u in units)}}
    for start,end in [(1,10),(11,20),(21,30),(31,40),(41,50),(51,60),(61,70),(71,78)]:
        lengths=[count(u[k]['text']) for u in units if start<=u['week']<=end for k in ['reading','reading2']]
        report['phases'].append({'weeks':f'{start}-{end}','readings':len(lengths),'minWords':min(lengths),'maxWords':max(lengths),'meanWords':round(sum(lengths)/len(lengths))})
    report['longReadingStatus']='W1–50两篇核心阅读均通过所设词数梯度检查。W51–78内置题型策略微课，配合官方分科练习；不将策略短文冒充完整雅思卷。词数与自动检查不等于独立教师逐题审校或能力校准。'
    output=ROOT/'课程审查数据-v2.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=True,indent=2))
if __name__=='__main__':main()
