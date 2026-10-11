"""Copy the reproducible static site plus CI sources to the publishing checkout.
Does not commit, push or deploy. Never copies caches, private learning packages,
node_modules, screenshots, credentials or repository internals.
"""
from pathlib import Path
import shutil,hashlib,json
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'github-pages-site'
def main():
    if not (DEST/'.git').exists():raise RuntimeError('Publishing checkout not found')
    paths=[]
    for d in ['assets','src','data','tools','docs','教案素材','.github']:
        for p in (ROOT/d).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts:paths.append(p)
    for p in ROOT.iterdir():
        if p.is_file() and (p.suffix=='.py' or p.name in ['index.html','english-18m-plan.html','sw.js','start-learning.cmd','package.json','package-lock.json','README.md','SOURCES.md','LICENSE','.gitignore','CHANGELOG.md']):paths.append(p)
    paths.extend((ROOT/'downloads').glob('english-course-*-v3.zip'));paths.append(ROOT/'downloads/english-course-v3.zip');paths.append(ROOT/'legacy/index.html')
    files={}
    for p in paths:
        target=DEST/p.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
        source_hash=hashlib.sha256(p.read_bytes()).hexdigest();assert hashlib.sha256(target.read_bytes()).hexdigest()==source_hash
        files[p.relative_to(ROOT).as_posix()]=source_hash
    report={'version':json.loads((ROOT/'data/course_manifest_v3.json').read_text(encoding='utf-8'))['version'],'files':files,'synced':True,'published':False}
    (ROOT/'release-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Synced and verified',len(files),'files; no commit, push or deployment')
if __name__=='__main__':main()
