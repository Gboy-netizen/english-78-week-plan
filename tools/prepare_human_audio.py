"""Build a licensed, local human-reading library, without synthesised speech.

LibriSpeech dev-clean: CC BY 4.0, https://www.openslr.org/12.
The literary excerpts are language practice, not IELTS tests or conversations.
Only corpus FLAC/transcript files are read; no archive paths are extracted.
"""
from pathlib import Path
import urllib.request, tarfile, json, subprocess, hashlib, re, shutil, time

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '_cache' / 'librispeech'
OUT = ROOT / 'assets' / 'human'
URLS = ['https://openslr.magicdatatech.com/resources/12/dev-clean.tar.gz',
        'https://www.openslr.org/resources/12/dev-clean.tar.gz']

def main():
    CACHE.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    archive = CACHE / 'dev-clean.tar.gz'
    if not archive.exists():
        for url in URLS:
            try:
                print('Downloading licensed human speech:', url, flush=True)
                req = urllib.request.Request(url, headers={'User-Agent':'EnglishLearning/3.0'})
                with urllib.request.urlopen(req, timeout=40) as response, archive.with_suffix('.part').open('wb') as f:
                    count=0; report=0
                    while chunk := response.read(1024*1024):
                        f.write(chunk); count += len(chunk)
                        if count-report>30*1024*1024:
                            print('Downloaded', round(count/1024/1024), 'MiB', flush=True);report=count
                archive.with_suffix('.part').replace(archive); break
            except Exception as exc:
                print('Download failed:', str(exc), flush=True)
        if not archive.exists(): raise RuntimeError('No human corpus downloaded; no TTS substitution allowed')
    raw=CACHE/'raw';raw.mkdir(exist_ok=True)
    transcripts={};flacs={};metadata={}
    with tarfile.open(archive,'r:gz') as tf:
        for item in tf:
            if not item.isfile():continue
            name=Path(item.name).name
            if name.endswith('.trans.txt'):
                content=tf.extractfile(item).read().decode()
                (raw/name).write_text(content,encoding='utf-8')
                for line in content.splitlines():
                    key,text=line.split(' ',1);transcripts[key]=text
            elif name.endswith('.flac'):
                target=raw/name
                if not target.exists():
                    with target.open('wb') as f:shutil.copyfileobj(tf.extractfile(item),f)
                flacs[name[:-5]]=target
            elif name in ['SPEAKERS.TXT','CHAPTERS.TXT','LICENSE.TXT']:
                metadata[name]=tf.extractfile(item).read().decode()
                (CACHE/name).write_text(metadata[name],encoding='utf-8')
    # Preserve consecutive utterances in a chapter. Order excerpts by a transparent
    # length/long-word proxy, not by an invented CEFR or IELTS score.
    groups={}
    for key in sorted(transcripts):
        groups.setdefault('-'.join(key.split('-')[:2]),[]).append(key)
    vocabulary=json.loads((ROOT/'data/vocabulary.json').read_text(encoding='utf-8-sig'))
    common={x['word'].lower() for x in vocabulary if isinstance(x.get('rank'),(int,float)) and x['rank']<=1500}
    archaic=set('thou thee thy thine hath hast doth ye ere unto whence wherefore'.split())
    candidates=[]
    for group, keys in groups.items():
        for key in keys:
            words=transcripts[key].split()
            lower=[w.lower() for w in words]
            if 7<=len(words)<=32 and sum(len(w)>8 for w in words)<=3 and not archaic.intersection(lower):
                unknown=sum(w not in common for w in lower)
                candidates.append(([key],len(words)+4*unknown+2*sum(len(w)>7 for w in words)))
    candidates.sort(key=lambda row:(row[1],row[0][0]))
    chosen=[];used=set()
    # Short coherent passages, rather than counting a two-second sentence as a
    # complete lesson. Prefer common vocabulary; CEFR is not inferred from it.
    early=[]
    chapter_books={}
    for line in metadata.get('CHAPTERS.TXT','').splitlines():
        if line.startswith(';') or not line.strip():continue
        fields=[x.strip() for x in line.split('|')];chapter_books[fields[0]]=fields[-1]
    beginner_books={"It's Like This, Cat (Version 2)",'Stories Mother Nature Told Her Children','Junior Classics Volume 8: Animal and Nature Stories','Tik-Tok of Oz','Sky Island (version 2)','Pony Rider Boys in Texas','Pony Rider Boys in the Rockies'}
    for group,keys in groups.items():
        if chapter_books.get(group.split('-')[1]) not in beginner_books:continue
        for pos in range(len(keys)):
            bucket=[];words=[]
            for key in keys[pos:pos+5]:
                bucket.append(key);words+=transcripts[key].lower().split()
                if len(words)>=45:break
            unknown=sum(w not in common for w in words)
            if 45<=len(words)<=100 and not archaic.intersection(words):
                early.append((bucket,unknown*4+sum(len(w)>8 for w in words)*3+len(words)*.15))
    early.sort(key=lambda row:(row[1],row[0][0]))
    foundation=json.loads((ROOT/'data/foundation_human_lessons.json').read_text(encoding='utf-8'))
    if len(foundation)!=24:raise RuntimeError('Need 24 curated foundation lessons')
    for lesson in foundation:
        keys=lesson['utterances']
        if any(key not in transcripts or key in used for key in keys):raise RuntimeError('Invalid foundation source')
        chosen.append(keys);used.update(keys)
    for target,count in [(65,32),(150,32),(350,68)]:
        for group,keys in groups.items():
            bucket=[];n=0
            for key in keys:
                if key in used:
                    bucket=[];n=0;continue
                bucket.append(key);n+=len(transcripts[key].split())
                if n>=target:
                    chosen.append(bucket);used.update(bucket);bucket=[];n=0
                    count-=1
                    if not count:break
            if not count:break
        if count:raise RuntimeError('Insufficient distinct excerpts')
    speakers={};chapters={}
    for line in metadata.get('SPEAKERS.TXT','').splitlines():
        if line.startswith(';') or not line.strip():continue
        fields=[x.strip() for x in line.split('|')];speakers[fields[0]]=fields[-1]
    for line in metadata.get('CHAPTERS.TXT','').splitlines():
        if line.startswith(';') or not line.strip():continue
        fields=[x.strip() for x in line.split('|')];chapters[fields[0]]={'chapter':fields[6],'book':fields[7],'bookId':fields[5],'projectId':fields[4]}
    previous={x['id']:x for x in json.loads((ROOT/'data/human_library.json').read_text(encoding='utf-8'))} if (ROOT/'data/human_library.json').exists() else {}
    library=[]
    for index,keys in enumerate(chosen,1):
        path=OUT/f'ls-{index:03}.mp3';segments=[];offset=0
        for key in keys:
            p=flacs[key]
            dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True))
            segments.append({'id':key,'start':round(offset,3),'end':round(offset+dur,3),'text':transcripts[key].lower(),'timing':'corpus-utterance-boundaries'})
            offset+=dur
        if not path.exists() or previous.get(f'human-{index:03}',{}).get('utterances')!=keys:
            concat=CACHE/'concat.txt';concat.write_text('\n'.join("file '"+str(flacs[key]).replace('\\','/').replace("'","'\\''")+"'" for key in keys),encoding='utf-8')
            subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-ar','16000','-b:a','48k',str(path)],check=True)
        source='librispeech/dev-clean/'+keys[0].rsplit('-',1)[0]
        chapter=chapters.get(keys[0].split('-')[1],{})
        speaker=speakers.get(keys[0].split('-')[0],keys[0].split('-')[0])
        library.append({'id':f'human-{index:03}','title':f'真人朗读 {index:03} · '+chapter.get('book','公开文学选段'),
            'audio':'assets/human/'+path.name,'audioKind':'human-audio','duration':round(offset,3),
            'text':' '.join(s['text'] for s in segments),'segments':segments,'utterances':keys,
            'sourceId':source,'speakerId':keys[0].split('-')[0],'speaker':speaker,'book':chapter, 'accent':'未逐人核验；多位英语朗读者',
            'sourceUrl':'https://www.openslr.org/12','license':'CC BY 4.0',
            'licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
            'attribution':'LibriSpeech, Vassil Panayotov / Daniel Povey; original human reader: '+speaker+' (LibriVox)',
            'adaptation':'Original adjacent corpus utterances concatenated and transcoded to MP3; transcript casing changed.',
            'verified':{'fileDecodedOn':time.strftime('%Y-%m-%d'),'humanListenedOn':None},
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
            'reviewStatus':'machine-checked','kind':'literary-reading','examEvidence':False})
        if index%24==0:print('Prepared',index,'human excerpts',flush=True)
    if len(library)!=156:raise RuntimeError('Expected 156 excerpts')
    (ROOT/'data'/'human_library.json').write_text(json.dumps(library,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'CREDITS.txt').write_text('LibriSpeech dev-clean corpus: https://www.openslr.org/12\nLicense: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/\nLibriSpeech (c) 2014 Vassil Panayotov. Original human audio: LibriVox readers named below.\n'+library[0]['adaptation']+'\nLocal excerpts are literary language practice, not IELTS tests. Speaker accent and teaching difficulty are not independently certified.\n\n'+ '\n'.join(x['id']+' | '+x['audio']+' | '+x['speaker']+' | '+x['book'].get('book','')+' | '+x['sourceId']+' | utterances: '+','.join(x['utterances']) for x in library),encoding='utf-8')
    diagnostic=ROOT/'data/diagnostic_audio.json'
    if diagnostic.exists():
        m=json.loads(diagnostic.read_text(encoding='utf-8'))
        with (OUT/'CREDITS.txt').open('a',encoding='utf-8') as f:f.write('\n\nDiagnostic | '+m['audio']+' | '+m['attribution']+' | '+m['sourceId']+' | '+m['adaptation']+'\n')
    print('Ready:',len(library),'real human audio files;',sum(x['bytes'] for x in library),'bytes',flush=True)

if __name__=='__main__':main()
