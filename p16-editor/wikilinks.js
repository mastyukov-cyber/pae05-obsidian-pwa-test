/* CP-P20, local-only wiki-links. Never opens URLs or files; read-only navigation. */
(function(root){
  'use strict';
  function extract(text){
    if(typeof text!=='string' || text.length>5000) return [];
    const result=[], seen=new Set(), rx=/\[\[([^\[\]\n]{1,160})\]\]/g;
    for(const found of text.matchAll(rx)){
      const raw=found[1], sep=raw.indexOf('|');
      const title=(sep<0?raw:raw.slice(0,sep)).trim();
      const label=(sep<0?title:raw.slice(sep+1)).trim();
      if(!title || title.length>80 || !label || label.length>80 ||
        /[\/\\:#\u0000-\u001f]/u.test(title) || /[\u0000-\u001f]/u.test(label)) continue;
      const key=title.normalize('NFC').toLocaleLowerCase('ru');
      if(seen.has(key))continue;
      seen.add(key);
      result.push(Object.freeze({title,label}));
      if(result.length>=50)break;
    }
    return result;
  }
  function resolve(link,notes){
    if(!link||!Array.isArray(notes))return Object.freeze({status:'invalid',id:null});
    const key=link.title.normalize('NFC').toLocaleLowerCase('ru');
    const hits=notes.filter(x=>x&&typeof x.title==='string'&&
      x.title.trim().normalize('NFC').toLocaleLowerCase('ru')===key);
    return Object.freeze({status:hits.length===1?'ok':hits.length===0?'missing':'ambiguous',
      id:hits.length===1?hits[0].id:null});
  }
  const api=Object.freeze({extract,resolve});
  root.PAE05WikiLinks=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
