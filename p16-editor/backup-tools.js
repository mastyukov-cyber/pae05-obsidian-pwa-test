/* PAE-05 CP-P19, iPhone-only synthetic backup and restore, no cloud/network. */
(function(root){
 'use strict';
 const FORMAT='PAE05_SYNTHETIC_BACKUP_V1',MAX_BYTES=1048576,MAX_RECORDS=100,MAX_HISTORY=50;
 const DB_NAME=root.PAE05MockEditor?.DB_NAME;
 function fail(code){return Error(code);}
 function goodText(x,min,max){return typeof x==='string'&&x.length>=min&&x.length<=max&&!x.includes('\0');}
 function validId(id){return typeof id==='string'&&(/^(demo-0[1-3])$/.test(id)||/^local-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id));}
 function cleanRecord(src){
  if(!src||typeof src!=='object'||Array.isArray(src)||!validId(src.id)||!goodText(src.title,1,80)||!goodText(src.text,0,5000)||!Number.isSafeInteger(src.rev)||src.rev<1||src.rev>100000||!Array.isArray(src.history)||src.history.length<1||src.history.length>MAX_HISTORY)throw fail('BACKUP_BAD_RECORD');
  let last=0;
  const history=src.history.map(h=>{
   if(!h||typeof h!=='object'||Array.isArray(h)||h.id!==src.id||!Number.isSafeInteger(h.rev)||h.rev<=last||h.rev>src.rev||!goodText(h.title,1,80)||!goodText(h.text,0,5000))throw fail('BACKUP_BAD_HISTORY');
   last=h.rev;return {id:h.id,title:h.title,text:h.text,rev:h.rev};
  });
  const tail=history[history.length-1];
  if(tail.rev!==src.rev||tail.title!==src.title||tail.text!==src.text)throw fail('BACKUP_HISTORY_MISMATCH');
  return {id:src.id,title:src.title,text:src.text,rev:src.rev,history};
 }
 function sanitize(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.format!==FORMAT||input.schema!==1||typeof input.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(input.createdAt)||!Number.isFinite(Date.parse(input.createdAt))||!Array.isArray(input.records)||input.records.length>MAX_RECORDS)throw fail('BACKUP_INVALID_FORMAT');
  const ids=new Set(),records=[];
  for(const x of input.records){const record=cleanRecord(x);if(ids.has(record.id))throw fail('BACKUP_DUPLICATE_ID');ids.add(record.id);records.push(record);}
  records.sort((a,b)=>a.id.localeCompare(b.id));
  return {format:FORMAT,schema:1,createdAt:input.createdAt,records};
 }
 function parseJson(json){
  if(typeof json!=='string'||new TextEncoder().encode(json).length>MAX_BYTES)throw fail('BACKUP_TOO_LARGE');
  let v;try{v=JSON.parse(json);}catch{throw fail('BACKUP_INVALID_JSON');}
  return sanitize(v);
 }
 function encodePayload(rows){
  const payload=sanitize({format:FORMAT,schema:1,createdAt:new Date().toISOString(),records:rows});
  const json=JSON.stringify(payload,null,2)+'\n';
  if(new TextEncoder().encode(json).length>MAX_BYTES)throw fail('BACKUP_TOO_LARGE');
  return json;
 }
 function create({indexedDBImpl=root.indexedDB,dbName=DB_NAME}={}){
  if(typeof dbName!=='string'||!dbName)throw fail('INVALID_BACKUP_DB');
  function openDb(){return new Promise((resolve,reject)=>{
   if(!indexedDBImpl||typeof indexedDBImpl.open!=='function')return reject(fail('BACKUP_STORAGE_DENIED'));
   let q;try{q=indexedDBImpl.open(dbName,1);}catch{reject(fail('BACKUP_STORAGE_DENIED'));return;}
   q.onupgradeneeded=()=>{try{q.transaction?.abort();}catch{};};
   q.onsuccess=()=>resolve(q.result);
   q.onerror=()=>reject(fail('BACKUP_STORAGE_DENIED'));
   q.onblocked=()=>reject(fail('BACKUP_DB_BLOCKED'));
  });}
  async function exportJson(){
   const db=await openDb();try{
    const rows=await new Promise((resolve,reject)=>{
     let tx,req,result;try{tx=db.transaction('notes','readonly');req=tx.objectStore('notes').getAll();}catch{reject(fail('BACKUP_READ_DENIED'));return;}
     req.onsuccess=()=>{result=req.result;};req.onerror=()=>reject(fail('BACKUP_READ_DENIED'));
     tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(fail('BACKUP_READ_ABORTED'));tx.onerror=()=>reject(fail('BACKUP_READ_DENIED'));
    });
    return encodePayload(rows);
   }finally{db.close();}
  }
  async function restore(payload,confirmed){
   if(confirmed!==true)throw fail('BACKUP_RESTORE_CONFIRMATION_REQUIRED');
   const data=sanitize(payload);
   if(new TextEncoder().encode(JSON.stringify(data)).length>MAX_BYTES)throw fail('BACKUP_TOO_LARGE');
   const db=await openDb();try{
    return await new Promise((resolve,reject)=>{
     let tx,store,req,reason=null;
     try{tx=db.transaction('notes','readwrite');store=tx.objectStore('notes');req=store.getAll();}catch{reject(fail('BACKUP_WRITE_DENIED'));return;}
     req.onsuccess=()=>{
      try{
       if(!Array.isArray(req.result)||req.result.length!==0)throw fail('RESTORE_TARGET_NOT_EMPTY');
       for(const row of data.records)store.put(row);
      }catch(e){reason=e;try{tx.abort();}catch{}}
     };
     req.onerror=()=>{reason=fail('BACKUP_WRITE_DENIED');};
     tx.oncomplete=()=>resolve(data.records.length);
     tx.onabort=()=>reject(reason||fail('BACKUP_WRITE_ABORTED'));
     tx.onerror=()=>{if(!reason)reason=fail('BACKUP_WRITE_DENIED');};
    });
   }finally{db.close();}
  }
  return Object.freeze({exportJson,restore,parseJson,format:FORMAT,maxBytes:MAX_BYTES});
 }
 const api=Object.freeze({create,parseJson,encodePayload,FORMAT,MAX_BYTES});
 root.PAE05LocalBackup=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
