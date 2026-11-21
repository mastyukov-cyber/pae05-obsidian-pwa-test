/* CP-P22 R01 staging only: immutable, public, synthetic read-only notes. */
(()=>{
"use strict";
let generation=0,controller=null;
function node(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function mount(){
 const parent=document.querySelector(".shell");
 if(!parent||document.getElementById("p22-test-panel"))return;
 const panel=node("section");panel.id="p22-test-panel";panel.className="card p22-test-panel";
 panel.setAttribute("aria-label","Облачный синтетический TEST — только чтение");
 panel.appendChild(node("h2","Облако TEST · только чтение"));
 panel.appendChild(node("p","Три вымышленные заметки. Нет Dropbox, настоящего Vault, AI и синхронизации."));
 const status=node("p","Тестовый сеанс не открыт.");status.setAttribute("role","status");
 const controls=node("div");controls.className="p22-controls";
 const listing=node("div");listing.className="p22-list";
 const detail=node("pre");detail.className="p22-detail";detail.hidden=true;
 function button(label,where,callback){const b=node("button",label);b.type="button";b.className="btn p22-button";b.addEventListener("click",callback);where.appendChild(b);return b;}
 function clear(){listing.replaceChildren();detail.textContent="";detail.hidden=true;}
 async function read(path,signal){
   const response=await fetch(path,{method:"GET",credentials:"same-origin",cache:"no-store",signal,headers:{Accept:"application/json"}});
   if(!response.ok)throw Error(response.status===401?"TEST_SESSION_EXPIRED":"HTTP_"+response.status);
   return response.json();
 }
 const open=button("Открыть 3 облачные TEST-заметки",controls,async()=>{
  const id=++generation;if(controller)controller.abort();controller=new AbortController();
  clear();open.disabled=true;status.textContent="Открываем синтетический сеанс...";
  try{
   const response=await fetch("/api/session",{method:"POST",cache:"no-store",credentials:"same-origin",signal:controller.signal,
    headers:{"Content-Type":"application/json","X-PAE05-P22-Demo":"synthetic-only"},body:"{}"});
   if(!response.ok)throw Error("SESSION_HTTP_"+response.status);
   const session=await response.json();
   if(session.scope!=="SYNTHETIC_GUEST_READ_ONLY"||session.authenticated!==false)throw Error("UNEXPECTED_SESSION_SCOPE");
   const result=await read("/api/notes",controller.signal);
   if(id!==generation)return;
   if(!Array.isArray(result.items)||result.items.length!==3||result.peerConfirmed!==false||
     result.syncStatus!=="SYNTHETIC_NOT_SYNCED")throw Error("INVALID_SYNTHETIC_RESULT");
   for(const item of result.items){
    if(typeof item.id!=="string"||!/^synthetic-[a-z]+$/.test(item.id)||typeof item.title!=="string")
      throw Error("INVALID_NOTE_ID");
    button(item.title,listing,async()=>{
     const selected=generation;
     try{
      const data=await read("/api/notes/"+encodeURIComponent(item.id),controller.signal);
      if(selected!==generation)return;
      if(data.id!==item.id||data.peerConfirmed!==false||
        data.syncStatus!=="SYNTHETIC_NOT_SYNCED"||typeof data.markdown!=="string")throw Error("INVALID_NOTE_RESPONSE");
      detail.textContent=data.title+"\n\n"+data.markdown;
      detail.hidden=false;status.textContent="Только синтетическое чтение. НЕ синхронизировано.";
     }catch(e){if(selected===generation)status.textContent="Ошибка чтения: "+e.message;}
    });
   }
   status.textContent="Открыт публичный синтетический сеанс · 10 минут.";
  }catch(e){if(id===generation){clear();status.textContent="TEST-сервер недоступен: "+e.message;}}
  finally{if(id===generation)open.disabled=false;}
 });
 button("Закрыть TEST-сеанс",controls,async()=>{
  ++generation;if(controller)controller.abort();clear();open.disabled=false;
  status.textContent="Сеанс закрывается...";
  try{
   const response=await fetch("/api/logout",{method:"POST",cache:"no-store",credentials:"same-origin",
    headers:{"Content-Type":"application/json","X-PAE05-P22-Demo":"synthetic-only"},body:"{}"});
   status.textContent=response.ok?"Cookie очищена; серверного отзыва уже выданного токена нет.":
     "Закрытие на сервере не подтверждено; тестовая cookie истечёт через 10 минут.";
  }catch{status.textContent="Нет связи: cookie может сохраняться до истечения 10 минут.";}
 });
 panel.appendChild(controls);panel.appendChild(status);panel.appendChild(listing);panel.appendChild(detail);
 parent.insertBefore(panel,document.querySelector("#content"));
 window.addEventListener("pagehide",()=>{++generation;if(controller)controller.abort();clear();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
