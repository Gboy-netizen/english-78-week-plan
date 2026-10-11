"""Record ELLLO lesson links and stream URLs; never redistribute its recordings
or full transcripts. The original page remains the transcript/worksheet source.
HTTP checks are not human listening or guaranteed future network availability.
"""
from pathlib import Path
from urllib.request import urlopen,Request
from urllib.parse import urljoin
import re,json,concurrent.futures,datetime
ROOT=Path(__file__).resolve().parents[1]
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:return r.read().decode('utf-8','replace')
def main():
    pages=[]
    for level in ['A1','A2','B1','B2']:
        base=f'https://elllo.org/book/{level}/'
        text=fetch(base+'index.html')
        links=list(dict.fromkeys(urljoin(base,x) for x in re.findall(r'href="([^"#]+\.html)"',text) if re.match(level+r'-\d\d-',x)))
        pages.extend((level,url) for url in links)
    def parse(item):
        level,url=item
        try:
            text=fetch(url)
            title=re.search(r'<title>(.*?)</title>',text,re.S).group(1).strip()
            mp3=list(dict.fromkeys(urljoin(url,x) for x in re.findall(r'(?:src|href)="([^"#]+\.mp3)"',text)))
            return {'level':level,'title':title,'url':url,'audioUrls':mp3,'verified':{'pageFetchedOn':datetime.date.today().isoformat(),'audioDecodedOn':None,'humanListenedOn':None},'license':'Copyright ELLLO — online access only; redistribution not established'}
        except Exception as e:return {'level':level,'url':url,'error':str(e)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:rows=list(pool.map(parse,pages))
    (ROOT/'data'/'online_lessons.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Catalogued',len(rows),'original pages;',sum(bool(x.get('audioUrls')) for x in rows),'with human audio links')
if __name__=='__main__':main()
