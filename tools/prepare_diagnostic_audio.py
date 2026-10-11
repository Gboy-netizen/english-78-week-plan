"""Three simple, individually identified human utterances for a foundation
diagnostic. They are different readers, not a fabricated conversation.
Requires the licensed corpus prepared by prepare_human_audio.py.
"""
from pathlib import Path
import subprocess,json,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'_cache/librispeech/raw'
ITEMS=[('8297-275156-0000','Which question did you hear?',['What are you doing here?','What do you do every day?','Where are you going?'],0,'询问对方正在这里做什么。'),
       ('6345-93306-0005','Where is the seat?',['In a shop.','In the garden.','On a bus.'],1,'座位在花园里，房子一侧。'),
       ('6313-66129-0007','How does the speaker feel?',['Tired.','Cold.','Hungry.'],2,'说话者承认自己也饿了。')]
def main():
    transcripts={}
    for p in RAW.glob('*.trans.txt'):
        for line in p.read_text().splitlines():
            key,text=line.split(' ',1);transcripts[key]=text.lower()
    pieces=[];segments=[];questions=[];offset=0
    for n,(key,prompt,options,answer,explanation) in enumerate(ITEMS,1):
        path=RAW/(key+'.flac');duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True))
        pieces.append(path);segments.append({'id':key,'start':offset,'end':offset+duration,'text':transcripts[key]})
        questions.append({'id':f'diagnostic-listen-q{n}','prompt':prompt,'options':options,'correct':answer,'explanation':explanation,'evidence':{'quote':transcripts[key],'audioStart':offset,'audioEnd':offset+duration,'humanReviewed':False},'reviewStatus':'authored'})
        offset+=duration
    concat=RAW/'diagnostic-concat.txt';concat.write_text('\n'.join("file '"+str(p).replace('\\','/')+"'" for p in pieces),encoding='utf-8')
    out=ROOT/'assets/human/diagnostic.mp3';subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-ar','16000','-b:a','48k',str(out)],check=True)
    subprocess.run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    m={'id':'v3-diagnostic-listening','version':3,'title':'三句简单真人短句','text':' '.join(s['text'] for s in segments),'segments':segments,'questions':questions,
        'audio':'assets/human/diagnostic.mp3','duration':offset,'audioKind':'human-audio','sourceId':'librispeech/diagnostic/'+','.join(k for k,*_ in ITEMS),
        'sourceUrl':'https://www.openslr.org/12','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
        'attribution':'LibriSpeech (Vassil Panayotov); LibriVox readers 8297, 6345, 6313, individually identified in SPEAKERS.TXT',
        'adaptation':'Three different reader utterances concatenated for a word/meaning recognition diagnostic; not a dialogue.',
        'verified':{'fileDecodedOn':datetime.date.today().isoformat(),'humanListenedOn':None},'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'examEvidence':False}
    full=m['text']
    for q in questions:q['evidence'].update(start=full.index(q['evidence']['quote']),end=full.index(q['evidence']['quote'])+len(q['evidence']['quote']))
    (ROOT/'data/diagnostic_audio.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8');print('Prepared simple human diagnostic:',round(offset,1),'seconds')
if __name__=='__main__':main()
