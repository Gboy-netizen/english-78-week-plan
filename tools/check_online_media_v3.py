"""Sample external access only; never infer playback or human review from HTTP."""
from pathlib import Path
from urllib.request import Request,urlopen
import json,datetime,concurrent.futures
ROOT=Path(__file__).resolve().parents[1]

def main():
    lessons=json.loads((ROOT/'data/online_lessons.json').read_text(encoding='utf-8'))
    items=[]
    for level in ['A1','A2','B1','B2']:
        m=next(m for m in lessons if m.get('level')==level and m.get('audioUrls'))
        items.extend([(level+' source',m['url']),(level+' stream',m['audioUrls'][min(1,len(m['audioUrls'])-1)])])
    items.extend([('General sample','https://ielts.org/take-a-test/preparation-resources/sample-test-questions/general-training-test'),('Rachel pronunciation','https://rachelsenglish.com/english-pronounce-ee-vowel/'),('UBC pronunciation','https://enunciate.arts.ubc.ca/i/')])
    def check(item):
        label,url=item;r={'label':label,'url':url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'HTTP access only','played':False,'humanListened':False}
        try:
            with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20) as response:
                data=response.read(4096);r.update(status=response.status,contentType=response.headers.get('Content-Type'),sampleBytes=len(data),accessible=True)
        except Exception as error:r.update(accessible=False,error=str(error))
        return r
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,items))
    (ROOT/'_shots').mkdir(exist_ok=True)
    (ROOT/'_shots/online-media-checks-v3.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
