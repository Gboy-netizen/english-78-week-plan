"""Audit coverage, exact evidence bounds, files and optional real MP3 decode.
This verifies structure and playback feasibility, not teaching calibration.
"""
from pathlib import Path
import sys,json,hashlib,subprocess,argparse,datetime
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import curriculum_v3
def main():
    p=argparse.ArgumentParser();p.add_argument('--decode',action='store_true');args=p.parse_args()
    manifest=curriculum_v3.build();coverage=curriculum_v3.validate(manifest)
    decoded=[]
    materials=[m for u in manifest['units'] for m in u['listening']]+[manifest['diagnostic']['listening']]
    for m in materials:
        audio=ROOT/m['audio'];assert audio.stat().st_size==m['bytes'];assert hashlib.sha256(audio.read_bytes()).hexdigest()==m['sha256']
        end=0
        for seg in m['segments']:
            assert seg['start']>=end-.001 and seg['end']>seg['start'];end=seg['end']
        assert abs(end-m['duration'])<.01
        if args.decode:
            subprocess.run(['ffmpeg','-v','error','-i',str(audio),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            decoded.append(m['id'])
    phonemes={p['localAudio'] for p in manifest['phonemes'] if p.get('localAudio')}
    assert len(phonemes)==46
    for audio in phonemes:
        assert (ROOT/audio).is_file()
        if args.decode:subprocess.run(['ffmpeg','-v','error','-i',str(ROOT/audio),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    concealment={'listeningMaterials':len(materials)-1,'grammarPanels':len(manifest['units']),
        'diagnosticLanguageItems':len(manifest['diagnostic']['language']['items']),
        'check':'target words absent from own/neighbour prompts and metadata; grammar references gated by browser test',
        'teacherReview':False}
    report={'version':manifest['version'],'coverage':coverage,'answerConcealment':concealment,'decodedMP3':len(decoded),'decodedPhonemes':len(phonemes) if args.decode else 0,'checkedOn':datetime.date.today().isoformat(),'humanReview':'not performed by this audit','limitations':manifest['limitations']}
    if args.decode:
        (ROOT/'_shots').mkdir(exist_ok=True);(ROOT/'_shots/media-validation-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
