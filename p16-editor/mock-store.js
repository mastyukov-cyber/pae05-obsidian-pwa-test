/* PAE-05 CP-P17 / TEST v0.3.0: synthetic IndexedDB editor.
 * No network, Dropbox, iCloud, Gateway, auth, secrets, or real Vault.
 * Only a successful IndexedDB transaction may produce a saved result.
 */
(function(root){
 'use strict';
 const BUILD='CP-P17', VERSION='TEST v0.3.0';
 const DB_NAME='pae05_p17_synthetic_editor_v1', DB_VERSION=1;
 const seed=Object.freeze([
  {id:'demo-01',title:'Главная',text:'# Главная\nДобро пожаловать в учебную базу.\n\nЭто вымышленная заметка. Ссылка: [[План проекта]].',rev:1},
  {id:'demo-02',title:'План проекта',text:'# План проекта\n## Цели\n- Создавать заметки\n- Редактировать с подтверждением\n- Обрабатывать конфликты версий',rev:1},
  {id:'demo-03',title:'Идеи',text:'# Идеи\nПользоваться Obsidian AI с телефона.\n\n[[Главная]]',rev:1}
 ]);
 const seedById=new Map(seed.map(n=>[n.id,n]));
 function copy(n){return n?{id:n.id,title:n.title,text:n.text,rev:n.rev}:null;}
 function validateText(v,min,max,label){if(typeof v!=='string'||v.length<min||v.length>max||v.includes('\0'))throw Error('INVALID_'+label);return v;}
 function conflict(){const e=Error('CONFLICT_409');e.code=409;return e;}
 function storageError(e){return Error('STORAGE_UNAVAILABLE'+(e?.name?':'+e.name:''));}
 function safeRecord(r){
  if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^(demo-\d\d|local-[a-f0-9-]{36})$/.test(r.id)||!Number.isSafeInteger(r.rev)||r.rev<1||r.rev>100000||!Array.isArray(r.history)||r.history.length<1||r.history.length>50)throw Error('UNTRUSTED_LOCAL_RECORD');
  validateText(r.title,1,80,'TITLE');validateText(r.text,0,5000,'BODY');
  if(r.history.some(h=>!h||h.id!==r.id||!Number.isSafeInteger(h.rev)||h.rev<1||typeof h.title!=='string'||h.title.length>80||typeof h.text!=='string'||h.text.length>5000))throw Error('UNTRUSTED_LOCAL_HISTORY');
  return {id:r.id,title:r.title,text:r.text,rev:r.rev,history:r.history.map(copy)};
 }
 function openDb(idb,name){return new Promise((resolve,reject)=>{
  if(!idb||typeof idb.open!=='function')return reject(Error('INDEXEDDB_DENIED'));
  let q;try{q=idb.open(name,DB_VERSION);}catch(e){reject(storageError(e));return;}
  q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('notes'))q.result.createObjectStore('notes',{keyPath:'id'});};
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(storageError(q.error));
  q.onblocked=()=>reject(Error('STORAGE_BLOCKED_BY_OTHER_TAB'));
 });}
 function getAll(db){return new Promise((resolve,reject)=>{
  let tx,req;try{tx=db.transaction('notes','readonly');req=tx.objectStore('notes').getAll();}catch(e){reject(storageError(e));return;}
  let value;
  req.onsuccess=()=>{value=req.result;};req.onerror=()=>reject(storageError(req.error));
  tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(storageError(tx.error));tx.onerror=()=>reject(storageError(tx.error));
 });}
 function create({indexedDBImpl=root.indexedDB,dbName=DB_NAME,idFactory=null}={}){
  let db=null,ready=false,failure='NOT_INITIALIZED',seq=0;
  let notes=new Map(seed.map(n=>[n.id,copy(n)]));
  let history=new Map(seed.map(n=>[n.id,[copy(n)]]));
  const pending=new Map();let pseq=0;
  const newid=idFactory||(()=>{if(!root.crypto||typeof root.crypto.randomUUID!=='function')throw Error('SECURE_UUID_UNAVAILABLE');return 'local-'+root.crypto.randomUUID();});
  function status(){return Object.freeze({ready,failure:ready?null:failure,version:VERSION,build:BUILD});}
  async function init(){
   if(db){try{db.close();}catch{}}db=null;ready=false;failure='NOT_INITIALIZED';
   try{
    const opened=await openDb(indexedDBImpl,dbName);
    const rows=await getAll(opened);
    const nextNotes=new Map(seed.map(n=>[n.id,copy(n)])),nextHistory=new Map(seed.map(n=>[n.id,[copy(n)]]));
    for(const row of rows){const r=safeRecord(row);nextNotes.set(r.id,copy(r));nextHistory.set(r.id,r.history.map(copy));}
    db=opened;notes=nextNotes;history=nextHistory;ready=true;failure=null;
    db.onversionchange=()=>{db.close();db=null;ready=false;failure='SCHEMA_CHANGED';};
   }catch(e){ready=false;failure=e.message||'STORAGE_UNAVAILABLE';try{db?.close();}catch{}db=null;}
   return status();
  }
  function list(){return [...notes.values()].map(copy);}
  function get(id){return copy(notes.get(id));}
  function revisions(id){return (history.get(id)||[]).map(copy);}
  function prepare({id=null,title,text,baseRev=null}){
   title=validateText(title,1,80,'TITLE').trim();if(!title)throw Error('INVALID_TITLE');
   text=validateText(text,0,5000,'BODY');
   const n=id===null?null:notes.get(id);
   if(id!==null&&!n)throw Error('NOT_FOUND');
   if(n&&(!Number.isSafeInteger(baseRev)||baseRev<1))throw Error('INVALID_BASE_REV');
   if(id===null&&baseRev!==null)throw Error('INVALID_BASE_REV');
   const token='preview-'+String(++pseq).padStart(6,'0');
   pending.set(token,{id,title,text,baseRev});
   return Object.freeze({token,id,baseRev,before:copy(n),after:Object.freeze({title,text}),warning:'Только локальные синтетические данные. НЕ синхронизировано.'});
  }
  function discard(token){return pending.delete(token);}
  function write({id,title,text,baseRev,isNew=false}){
   if(!ready||!db)return Promise.reject(Error('STORAGE_UNAVAILABLE'));
   let target=id;
   try{if(isNew){target=newid();if(typeof target!=='string'||!/^local-[a-f0-9-]{36}$/.test(target))throw Error('INVALID_RANDOM_ID');}}catch(e){return Promise.reject(e);}
   return new Promise((resolve,reject)=>{
    let tx,os,req,finish=null,error=null;
    try{tx=db.transaction('notes','readwrite');os=tx.objectStore('notes');req=os.get(target);}catch(e){reject(storageError(e));return;}
    req.onsuccess=()=>{
     try{
      const old=req.result?safeRecord(req.result):(seedById.has(target)?{...copy(seedById.get(target)),history:[copy(seedById.get(target))]}:null);
      if(isNew?!!old:(!old||old.rev!==baseRev))throw conflict();
      const record={id:target,title,text,rev:old?old.rev+1:1,history:[]};
      record.history=(old?old.history:[]).concat([copy(record)]).slice(-50);
      if(old&&old.rev>=100000)throw Error('REVISION_LIMIT');
      os.put(record);finish=record;
     }catch(e){error=e;try{tx.abort();}catch{}}
    };
    req.onerror=()=>{error=storageError(req.error);};
    tx.oncomplete=()=>{
     if(!finish)return reject(Error('INCOMPLETE_STORAGE_COMMIT'));
     notes.set(finish.id,copy(finish));history.set(finish.id,finish.history.map(copy));resolve(copy(finish));
    };
    tx.onabort=()=>reject(error||storageError(tx.error));
    tx.onerror=()=>{if(!error)error=storageError(tx.error);};
   });
  }
  async function commit(token,confirmed){
   const p=pending.get(token);if(!p)throw Error('PREVIEW_EXPIRED');
   pending.delete(token);
   if(confirmed!==true)throw Error('CONFIRMATION_REQUIRED');
   return write({...p,isNew:p.id===null});
  }
  async function peerEdit(id){
   const n=notes.get(id);if(!n)throw Error('NOT_FOUND');
   return write({id,title:n.title,text:n.text+'\n\n(Имитация изменения другим клиентом; не другое устройство)',baseRev:n.rev});
  }
  function reset(){
   if(!ready||!db)return Promise.reject(Error('STORAGE_UNAVAILABLE'));
   return new Promise((resolve,reject)=>{
    let tx;try{tx=db.transaction('notes','readwrite');tx.objectStore('notes').clear();}catch(e){reject(storageError(e));return;}
    tx.oncomplete=()=>{notes=new Map(seed.map(n=>[n.id,copy(n)]));history=new Map(seed.map(n=>[n.id,[copy(n)]]));pending.clear();pseq=0;resolve(true);};
    tx.onabort=()=>reject(storageError(tx.error));tx.onerror=()=>reject(storageError(tx.error));
   });
  }
  function close(){if(db){try{db.close();}catch{}}db=null;ready=false;failure='CLOSED';pending.clear();}
  return Object.freeze({init,status,list,get,prepare,discard,commit,peerEdit,revisions,reset,close});
 }
 const api=Object.freeze({create,VERSION,BUILD,DB_NAME});
 root.PAE05MockEditor=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
