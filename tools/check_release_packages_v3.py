"""Verify full and stage installation packages against the current static site."""
from pathlib import Path
import json,zipfile,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import curriculum_v3

def main():
    course=curriculum_v3.build()
    for phase in [None,*course['phases']]:
        name='english-course-v3.zip' if phase is None else f"english-course-{phase['id']}-v3.zip"
        selected={a['audio'] for u in course['units'] if phase is None or phase['start']<=u['week']<=phase['end'] for a in u['listening']}
        with zipfile.ZipFile(ROOT/'downloads'/name) as archive:
            names=archive.namelist();assert len(names)==len(set(names)),name
            human={n for n in names if n.startswith('assets/human/ls-')}
            assert human==selected,(name,'wrong stage audio coverage')
            assert 'assets/human/diagnostic.mp3' in names
            assert not any(n.startswith(('_cache/','_backup/','node_modules/','.git/')) for n in names)
            for path in names:
                if path in ['使用说明.txt','分阶段说明.txt']:continue
                source=ROOT/path;assert source.is_file(),(name,path)
                if phase and path=='sw.js':
                    sw=source.read_text(encoding='utf-8');first=sorted(selected)[:2]
                    expected=sw.replace('assets/human/ls-001.mp3',first[0]).replace('assets/human/ls-002.mp3',first[1]).replace("const NAME='english-v3-", "const NAME='english-v3-"+phase['id']+'-').encode()
                elif phase and path=='assets/course-data.js':
                    expected=(source.read_text(encoding='utf-8')+'\nwindow.ENGLISH_COURSE.offlinePackage='+json.dumps({'start':phase['start'],'end':phase['end']})+';\n').encode()
                else:expected=source.read_bytes()
                assert archive.read(path)==expected,(name,path,'stale or corrupted package')
        print('PASS',name,len(selected),'core recordings')
if __name__=='__main__':main()
