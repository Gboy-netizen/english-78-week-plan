(function(root){
  'use strict';
  const E=root.EnglishV3||(typeof require==='function'?require('./engine.js'):null);
  const Z=root.fflate||(typeof require==='function'?require('fflate'):null);
  const DB='little-english-v3',LEGACY='little-english-progress-v1';
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const finished=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('存储失败'));tx.onabort=()=>reject(tx.error||Error('存储事务中断'));});
  async function open(){
    if(!root.indexedDB)throw Error('当前环境没有 IndexedDB，无法可靠保存学习和录音');
    const r=root.indexedDB.open(DB,1);r.onupgradeneeded=()=>{
      r.result.createObjectStore('states',{keyPath:'id'});
      r.result.createObjectStore('audio',{keyPath:'storageId'});
      r.result.createObjectStore('meta',{keyPath:'id'});
    };return request(r);
  }
  async function oldClips(){
    if(root.indexedDB.databases){const dbs=await root.indexedDB.databases();if(!dbs.some(x=>x.name==='little-english-audio'))return [];}
    return new Promise((resolve,reject)=>{
      const r=root.indexedDB.open('little-english-audio');let absent=false;
      r.onupgradeneeded=()=>{absent=true;r.transaction.abort();};
      r.onerror=()=>absent?resolve([]):reject(r.error||Error('旧录音数据库读取失败'));
      r.onsuccess=async()=>{const db=r.result;try{
        if(!db.objectStoreNames.contains('clips'))throw Error('旧录音结构不完整');
        const tx=db.transaction('clips','readonly'),done=finished(tx),clips=await request(tx.objectStore('clips').getAll());await done;resolve(clips);
      }catch(e){reject(e);}finally{db.close();}};
    });
  }
  let active=null,queue=Promise.resolve();
  const serialize=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
  async function initialize(){
    const db=await open();try{
      const tx=db.transaction(['meta','states'],'readonly'),done=finished(tx),meta=await request(tx.objectStore('meta').get('active'));
      const record=meta?await request(tx.objectStore('states').get(meta.generation)):null;await done;
      if(record){active=meta.generation;return E.validate(record.state);}
    }finally{db.close();}
    let old=null;const text=root.localStorage?.getItem(LEGACY);if(text)old=E.safeParse(text);
    const clips=await oldClips(),state=E.migrateLegacy(old);
    for(const c of clips){if(!(c.blob instanceof Blob))throw Error('旧录音 '+c.id+' 缺少音频数据，迁移已停止');}
    const audio=clips.map(c=>({id:String(c.id),taskId:c.key||'legacy',key:c.key||'legacy',epochId:null,name:c.name||'旧版录音',recordedAt:c.recordedAt||c.created,blob:c.blob,origin:'legacy'}));
    await activate(state,audio);return state;
  }
  async function activate(state,audio,expectedRevision){
    E.validate(state);const generation=E.uid(),db=await open();
    try {
      const tx=db.transaction(['states','audio','meta'],'readwrite'),done=finished(tx);
      const meta=await request(tx.objectStore('meta').get('active'));
      const record=meta?await request(tx.objectStore('states').get(meta.generation)):null;
      if((meta?.generation||null)!==active||(expectedRevision!==undefined&&record?.state.revision!==expectedRevision)){
        tx.abort();try{await done;}catch{}throw Error('恢复期间另一页面改变了记录，请刷新并重新校验学习包');
      }
      try {
        tx.objectStore('states').put({id:generation,state:E.copy(state)});
        for(const c of audio){if(!(c.blob instanceof Blob))throw Error('录音数据不完整');tx.objectStore('audio').put({...c,storageId:generation+'/'+c.id,generation});}
        tx.objectStore('meta').put({id:'active',generation,previous:active,changedAt:new Date().toISOString()});
      } catch(e) {try{tx.abort();}catch{}try{await done;}catch{}throw e;}
      await done;active=generation;return state;
    }finally{db.close();}
  }
  function save(state,clips=[]){const snapshot=E.copy(state);return serialize(async()=>{
    E.validate(snapshot);if(!active)throw Error('学习数据尚未初始化');const db=await open();
    try{const tx=db.transaction(['states','audio','meta'],'readwrite'),done=finished(tx);
      const [meta,record]=await Promise.all([request(tx.objectStore('meta').get('active')),request(tx.objectStore('states').get(active))]);
      if(meta?.generation!==active||!record||snapshot.revision!==record.state.revision+1){tx.abort();try{await done;}catch{}throw Error('记录已在另一个页面变化，请刷新后继续，避免覆盖新数据');}
      try {
        tx.objectStore('states').put({id:active,state:snapshot});
        for(const c of clips){if(!c.id||!(c.blob instanceof Blob))throw Error('录音数据不完整');tx.objectStore('audio').put({...c,generation:active,storageId:active+'/'+c.id});}
      } catch(e) {try{tx.abort();}catch{}try{await done;}catch{}throw e;}
      await done;
    }finally{db.close();}
  });}
  async function snapshot(){await queue;if(!active)throw Error('尚未初始化');const db=await open();try{
    const tx=db.transaction(['states','audio'],'readonly'),done=finished(tx);
    const [record,all]=await Promise.all([request(tx.objectStore('states').get(active)),request(tx.objectStore('audio').getAll())]);await done;
    if(!record)throw Error('找不到当前学习记录');return {state:E.validate(record.state),clips:all.filter(c=>c.generation===active)};
  }finally{db.close();}}
  async function clips(taskId){const snap=await snapshot();return snap.clips.filter(c=>!taskId||c.taskId===taskId);}
  async function hash(bytes){
    if(!root.crypto?.subtle)throw Error('当前环境不能校验备份文件，请使用 HTTPS 或本地 HTTP');
    const result=await root.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,'0')).join('');
  }
  function assertAudioReferences(state,clips){
    const ids=new Set(clips.map(c=>c.id));
    if(ids.size!==clips.length)throw Error('录音 ID 重复');
    for(const a of state.attempts)for(const id of a.audioIds||[])if(!ids.has(id))throw Error('缺失录音：'+id+'（练习 '+a.taskId+'）');
    for(const p of Object.values(state.pronunciation))for(const id of p.audioIds||[])if(!ids.has(id))throw Error('缺失发音录音：'+id);
    for(const p of Object.values(state.diagnostic.days))for(const id of p.audioIds||[])if(!ids.has(id))throw Error('缺失诊断录音：'+id);
    for(const item of state.archives){
      for(const p of Object.values(item.diagnostic?.days||{}).concat(item.pronunciation?[item.pronunciation]:[]))for(const id of p.audioIds||[])if(!ids.has(id))throw Error('缺失历史录音：'+id);
    }
    for(const clip of clips){if(!/^[A-Za-z0-9_.:-]+$/.test(clip.id||'')||typeof clip.taskId!=='string'||/[<>"']/.test(clip.taskId)||!(clip.blob instanceof Blob)||!clip.blob.size)throw Error('录音清单或文件无效');}
  }
  async function pack(state,clips){
    E.validate(state);assertAudioReferences(state,clips);
    const files={},entries=[],audio=[];
    async function add(name,bytes){files[name]=bytes;entries.push({name,bytes:bytes.length,sha256:await hash(bytes)});}
    await add('progress.json',Z.strToU8(JSON.stringify(state,null,2)));
    for(const clip of clips){
      const {blob,storageId,generation,...meta}=clip;
      const ext=blob.type.includes('mp3')||blob.type.includes('mpeg')?'mp3':blob.type.includes('wav')?'wav':blob.type.includes('mp4')?'m4a':'webm';
      const path='audio/'+encodeURIComponent(clip.id)+'.'+ext;
      await add(path,new Uint8Array(await blob.arrayBuffer()));audio.push({...meta,path,type:blob.type,size:blob.size});
    }
    await add('audio-manifest.json',Z.strToU8(JSON.stringify(audio,null,2)));
    await add('writing-feedback.json',Z.strToU8(JSON.stringify({attempts:state.attempts.filter(a=>a.output),feedback:state.feedback},null,2)));
    await add('README.txt',Z.strToU8('每天一点英语 v3 学习包\nprogress.json 是完整学习记录。audio/ 是原始录音，audio-manifest.json 保存任务对应。\n录音、自评和 AI 反馈不是官方评分。导入前验证所有文件 SHA-256；本包没有账号或自动同步。\n'));
    files['manifest.json']=Z.strToU8(JSON.stringify({application:'little-english-v3-bundle',version:3,exportedAt:new Date().toISOString(),courseVersion:3,files:entries,audioCount:audio.length},null,2));
    return Z.zipSync(files,{level:1});
  }
  async function exportBundle(){const snap=await snapshot();return pack(snap.state,snap.clips);}
  function decodeDataURL(data){
    const m=String(data).match(/^data:((?:audio|video)\/[\w.+-]+)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=\r\n]+)$/);
    if(!m)throw Error('旧学习包音频编码无效');const raw=root.atob(m[2]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    if(!bytes.length)throw Error('旧学习包录音为空');return new Blob([bytes],{type:m[1]});
  }
  async function unpack(bytes){
    if(bytes.length>512*1024*1024)throw Error('学习包超过512MB，请分包恢复');
    // Parse JSON by its actual fields: pretty printing and whitespace are valid.
    const head=new TextDecoder().decode(bytes.slice(0,60)).trimStart();
    if(head.startsWith('{')){
      const p=E.safeParse(new TextDecoder().decode(bytes));let state,audio=[];
      if(p.application==='little-english-v3'){state=E.validate(p);}
      else if(['little-english','little-english-bundle'].includes(p.application)){
        if(!p.progress||!((p.application==='little-english'&&p.version===2)||(p.application==='little-english-bundle'&&p.version===1)))throw Error('不支持的旧备份版本');
        state=E.migrateLegacy(p.progress);
        if(p.application==='little-english-bundle'){
          if(!Array.isArray(p.audio))throw Error('旧学习包缺少音频清单');
          audio=p.audio.map(c=>{if(!c?.id||!c.key||!c.dataUrl)throw Error('旧学习包有缺失的音频项目');return {id:String(c.id),taskId:c.key,key:c.key,name:c.name||'旧版录音',recordedAt:c.recordedAt||c.created,blob:decodeDataURL(c.dataUrl),origin:'legacy-import'};});
        }
      }else throw Error('不是本项目的学习备份');
      assertAudioReferences(state,audio);return {state,clips:audio,warnings:p.application==='little-english'?['旧 JSON 不包含录音；请另导入原始录音或完整旧学习包。']:[]};
    }
    let total=0;const paths=new Set();
    const files=Z.unzipSync(bytes,{filter:file=>{
      if(paths.has(file.name)||file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))throw Error('备份路径无效或重复');paths.add(file.name);
      if(file.originalSize>128*1024*1024||(total+=file.originalSize)>1024*1024*1024)throw Error('解压内容超过安全大小');return true;
    }});
    if(!files['manifest.json'])throw Error('学习包缺少清单');
    const manifest=E.safeParse(Z.strFromU8(files['manifest.json']));
    if(manifest.application!=='little-english-v3-bundle'||manifest.version!==3||!Array.isArray(manifest.files))throw Error('不支持的学习包版本');
    if(manifest.files.length+1!==Object.keys(files).length||new Set(manifest.files.map(x=>x.name)).size!==manifest.files.length)throw Error('学习包文件清单不一致');
    for(const item of manifest.files){const data=files[item.name];if(!data||item.bytes!==data.length||await hash(data)!==item.sha256)throw Error('文件缺失或校验失败：'+item.name);}
    for(const key of ['progress.json','audio-manifest.json','writing-feedback.json','README.txt'])if(!manifest.files.some(x=>x.name===key))throw Error('学习包缺少 '+key);
    const state=E.validate(E.safeParse(Z.strFromU8(files['progress.json']))),audio=E.safeParse(Z.strFromU8(files['audio-manifest.json']));
    if(!Array.isArray(audio)||manifest.audioCount!==audio.length)throw Error('录音数量不一致');
    const used=new Set();const clips=audio.map(c=>{
      if(!c.path?.startsWith('audio/')||used.has(c.path)||!files[c.path]||c.size!==files[c.path].length||!manifest.files.some(x=>x.name===c.path)||!/^audio\//.test(c.type||''))throw Error('录音文件或关联无效');used.add(c.path);
      const {path,type,size,...meta}=c;return {...meta,blob:new Blob([files[path]],{type})};
    });
    if(Object.keys(files).filter(x=>x.startsWith('audio/')).length!==used.size)throw Error('存在未登记录音');
    assertAudioReferences(state,clips);return {state,clips,warnings:[]};
  }
  async function restore(bundle,mode='merge'){
    return serialize(async()=>{
      E.validate(bundle.state);assertAudioReferences(bundle.state,bundle.clips);
      // Read both stores in one transaction; a generation switch happens only
      // after every state and audio write completes in a single transaction.
      const db=await open();let current;
      try{const tx=db.transaction(['states','audio','meta'],'readonly'),done=finished(tx);const [record,all,meta]=await Promise.all([request(tx.objectStore('states').get(active)),request(tx.objectStore('audio').getAll()),request(tx.objectStore('meta').get('active'))]);await done;if(meta?.generation!==active||!record)throw Error('当前记录已在另一页面切换，请刷新再恢复');current={state:record.state,clips:all.filter(c=>c.generation===active)};}finally{db.close();}
      let state=E.copy(bundle.state),audio=bundle.clips.slice();
      if(mode==='merge'){
        // Resolve audio collisions before merging attempts, so an otherwise
        // identical attempt with different recording bytes keeps both versions.
        const audioRemap={};const incoming=[];
        for(const c of audio){const old=current.clips.find(x=>x.id===c.id);
          if(old){if(await hash(new Uint8Array(await old.blob.arrayBuffer()))===await hash(new Uint8Array(await c.blob.arrayBuffer()))&&old.taskId===c.taskId&&old.epochId===c.epochId)continue;audioRemap[c.id]=c.id+'-import-'+E.uid();}
          incoming.push({...c,id:audioRemap[c.id]||c.id});
        }
        function rewriteAudio(value){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(key==='audioIds'&&Array.isArray(child))value[key]=child.map(id=>audioRemap[id]||id);else if(typeof child==='object')rewriteAudio(child);}}
        rewriteAudio(state);
        const result=E.merge(current.state,state);state=result.state;
        audio=[...current.clips,...incoming.map(c=>({...c,epochId:result.remap[c.epochId]||c.epochId}))];
      }
      assertAudioReferences(state,audio);await activate(state,audio,current.state.revision);return state;
    });
  }
  async function rollback(){return serialize(async()=>{
    const db=await open();try{
      const tx=db.transaction(['states','meta'],'readwrite'),done=finished(tx),meta=await request(tx.objectStore('meta').get('active'));
      if(meta?.generation!==active){tx.abort();try{await done;}catch{}throw Error('另一页面已切换学习数据，请刷新再回滚');}
      if(!meta?.previous){tx.abort();try{await done;}catch{}throw Error('目前没有可恢复的导入前版本');}
      const record=await request(tx.objectStore('states').get(meta.previous));
      if(!record){tx.abort();try{await done;}catch{}throw Error('回滚数据缺失');}
      tx.objectStore('meta').put({id:'active',generation:meta.previous,previous:meta.generation,changedAt:new Date().toISOString()});
      await done;active=meta.previous;return E.validate(record.state);
    }finally{db.close();}
  });}
  const api={initialize,save,snapshot,clips,pack,unpack,exportBundle,restore,rollback,assertAudioReferences,hash,DB,LEGACY};
  root.EnglishStorage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
