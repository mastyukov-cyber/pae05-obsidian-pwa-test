/* PAE-05 CP-P16: synthetic-only, in-memory note editor model.
 * No network, storage, authentication, filesystem, provider or AI.
 */
(function(root){
  'use strict';
  const seed = [
    {id:'demo-01',title:'Главная',text:'# Главная\nДобро пожаловать в учебную базу.\n\nЭто вымышленная заметка. Ссылка: [[План проекта]].',rev:1},
    {id:'demo-02',title:'План проекта',text:'# План проекта\n## Цели\n- Создавать заметки\n- Редактировать с подтверждением\n- Обрабатывать конфликты версий',rev:1},
    {id:'demo-03',title:'Идеи',text:'# Идеи\nПользоваться Obsidian AI с телефона.\n\n[[Главная]]',rev:1}
  ];
  function copy(n){return n?{id:n.id,title:n.title,text:n.text,rev:n.rev}:null;}
  function checkText(v,min,max,label){if(typeof v!=='string'||v.length<min||v.length>max||v.includes('\0'))throw Error('INVALID_'+label);return v;}
  function create(){
    let notes=new Map(seed.map(n=>[n.id,copy(n)]));
    let history=new Map(seed.map(n=>[n.id,[copy(n)]]));
    let pending=new Map(),seq=3,pseq=0;
    function list(){return [...notes.values()].map(copy);}
    function get(id){return copy(notes.get(id));}
    function prepare({id=null,title,text,baseRev=null}){
      title=checkText(title,1,80,'TITLE').trim();
      if(!title)throw Error('INVALID_TITLE');
      text=checkText(text,0,5000,'BODY');
      const existing=id===null?null:notes.get(id);
      if(id!==null&&!existing)throw Error('NOT_FOUND');
      if(existing&&(!Number.isSafeInteger(baseRev)||baseRev<1))throw Error('INVALID_BASE_REV');
      if(id===null&&baseRev!==null)throw Error('INVALID_BASE_REV');
      const token='preview-'+String(++pseq).padStart(6,'0');
      pending.set(token,{id,title,text,baseRev});
      return Object.freeze({token,id,baseRev,before:existing?copy(existing):null,after:Object.freeze({title,text}),warning:'Только синтетическая память. Настоящая заметка не изменится.'});
    }
    function commit(token,confirmed){
      const p=pending.get(token);
      if(!p)throw Error('PREVIEW_EXPIRED');
      pending.delete(token); // Single-use even on rejected action.
      if(confirmed!==true)throw Error('CONFIRMATION_REQUIRED');
      if(p.id!==null){
        const n=notes.get(p.id);
        if(!n||n.rev!==p.baseRev){const e=Error('CONFLICT_409');e.code=409;throw e;}
        const next={id:n.id,title:p.title,text:p.text,rev:n.rev+1};
        notes.set(next.id,next);history.get(next.id).push(copy(next));return copy(next);
      }
      const next={id:'demo-'+String(++seq).padStart(2,'0'),title:p.title,text:p.text,rev:1};
      notes.set(next.id,next);history.set(next.id,[copy(next)]);return copy(next);
    }
    function peerEdit(id){
      const n=notes.get(id);if(!n)throw Error('NOT_FOUND');
      const next={...n,rev:n.rev+1,text:n.text+'\n\n(Синтетическое изменение на другом устройстве)'};
      notes.set(id,next);history.get(id).push(copy(next));return copy(next);
    }
    function discard(token){return pending.delete(token);}
    function revisions(id){return (history.get(id)||[]).map(copy);}
    function reset(){notes=new Map(seed.map(n=>[n.id,copy(n)]));history=new Map(seed.map(n=>[n.id,[copy(n)]]));pending=new Map();seq=3;pseq=0;}
    return Object.freeze({list,get,prepare,commit,discard,peerEdit,revisions,reset});
  }
  const api=Object.freeze({create});
  root.PAE05MockEditor=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
