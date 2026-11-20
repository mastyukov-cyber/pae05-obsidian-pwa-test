'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../mock-store.js');

function idbRows(rows) {
  const db={
    objectStoreNames:{contains:n=>n==='notes'},
    close(){},
    transaction(name,mode){
      assert.equal(name,'notes');assert.equal(mode,'readonly');
      const tx={oncomplete:null,onabort:null,onerror:null,objectStore(){return{getAll(){
        const req={result:undefined,onsuccess:null,onerror:null};
        Promise.resolve().then(()=>{
          req.result=structuredClone(rows);req.onsuccess?.();
          Promise.resolve().then(()=>tx.oncomplete?.());
        });return req;
      }};}};
      return tx;
    }
  };
  return{open(){const req={result:db,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
    Promise.resolve().then(()=>req.onsuccess?.());return req;}};
}
function revision(rev,title='Главная',text='# Демо'){return{id:'demo-01',rev,title,text};}
function record(revisions,latest={}){
  const last=revisions[revisions.length-1];
  return{id:'demo-01',rev:last.rev,title:last.title,text:last.text,history:revisions,...latest};
}
async function statusOf(rows){
  const s=api.create({indexedDBImpl:idbRows(rows),dbName:'qa-record'});
  return s.init();
}
test('valid original one-revision history accepted',async()=>{
  const x=await statusOf([record([revision(1)])]);assert.equal(x.ready,true);
});
test('valid consecutive history accepted',async()=>{
  const x=await statusOf([record([revision(1),revision(2,'Главная','# Новое')])]);assert.equal(x.ready,true);
});
test('tampered current body must fail closed',async()=>{
  const x=await statusOf([record([revision(1),revision(2)],{text:'# Подмена'})]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('tampered current title must fail closed',async()=>{
  const x=await statusOf([record([revision(1),revision(2)],{title:'Подмена'})]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('history gap must fail closed',async()=>{
  const x=await statusOf([record([revision(1),revision(3)])]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('duplicate revision must fail closed',async()=>{
  const x=await statusOf([record([revision(1),revision(1)])]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('reversed revision history must fail closed',async()=>{
  const x=await statusOf([record([revision(2),revision(1)])]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('valid trimmed 50-item history accepted',async()=>{
  const versions=Array.from({length:50},(_,i)=>revision(i+3,'Главная','# Шаг '+(i+3)));
  const x=await statusOf([record(versions)]);assert.equal(x.ready,true);
});
test('history with wrong record ID must fail closed',async()=>{
  const x=await statusOf([record([revision(1),{...revision(2),id:'demo-02'}])]);
  assert.equal(x.ready,false);assert.equal(x.failure,'UNTRUSTED_LOCAL_HISTORY');
});
test('no IndexedDB is explicitly not ready',async()=>{
  const s=api.create({indexedDBImpl:null});const x=await s.init();
  assert.equal(x.ready,false);assert.equal(x.failure,'INDEXEDDB_DENIED');
});
