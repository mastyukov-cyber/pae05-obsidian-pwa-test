(()=>{'use strict';
const store=globalThis.PAE05MockEditor.create(),content=document.getElementById('content'),heading=document.getElementById('heading');
const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const add=(p,n)=>{p.appendChild(n);return n;};
let tab='home',id=null,draft=null,preview=null,notice='',searchTerm='',busy=false,resetPrompt=false;
const VERSION='TEST v0.5.0',BUILD='CP-P20';
const backup=globalThis.PAE05LocalBackup.create();let exportJsonText=null,restoreCandidate=null,backupBusy=false;
function button(parent,label,fn,cls='btn'){const n=add(parent,$('button',cls,label));n.type='button';n.addEventListener('click',fn);return n;}
function banner(){const s=store.status();add(content,$('p','banner','СИНТЕТИЧЕСКОЕ ДЕМО · Только вымышленные заметки. Нет Dropbox, iCloud, Gateway, AI и синхронизации.'));
 add(content,$('p',s.ready?'meta':'error',s.ready?'Локальная память этого устройства: IndexedDB доступна. Данные могут исчезнуть при очистке Safari.':'НЕ СОХРАНЕНО · Локальное хранилище недоступно: '+s.failure));}
function nav(){document.querySelectorAll('nav button').forEach(n=>{const a=n.dataset.tab===tab;n.classList.toggle('active',a);n.setAttribute('aria-current',a?'page':'false');});}
function render(){content.replaceChildren();heading.textContent={home:'Мои знания',note:'Заметка',create:'Создать заметку',edit:'Редактор',preview:'Проверка изменений',chat:'Учебный чат',settings:'О приложении'}[tab]||'Obsidian AI';nav();banner();if(notice){add(content,$('p',notice.includes('409')||notice.includes('НЕ СОХРАНЕНО')?'error':'warn',notice));notice='';}({home,note,create:()=>editor(true),edit:()=>editor(false),preview:previewPage,chat,settings})[tab]();}
function openNote(noteId){id=noteId;draft=null;preview=null;tab='note';render();}
function home(){const row=add(content,$('div','actions'));button(row,'＋ Новая заметка',()=>{tab='create';id=null;draft=null;render();});const input=add(content,$('input','control'));input.type='search';input.placeholder='Поиск по вымышленным заметкам';input.value=searchTerm;input.setAttribute('aria-label','Поиск');const target=add(content,$('section'));
 function show(){target.replaceChildren();const q=input.value.toLocaleLowerCase('ru');for(const n of store.list().filter(x=>(x.title+' '+x.text).toLocaleLowerCase('ru').includes(q))){const b=add(target,$('button','card note-link'));b.type='button';add(b,$('div','note-title',n.title));add(b,$('div','meta','Версия '+n.rev+' · вымышленная заметка'));add(b,$('p','body',n.text.slice(0,90)));b.addEventListener('click',()=>openNote(n.id));}if(!target.children.length)add(target,$('p','meta','Ничего не найдено'));}input.addEventListener('input',()=>{searchTerm=input.value;show();});show();}
function note(){const n=store.get(id);if(!n){notice='Заметка не найдена';tab='home';render();return;}add(content,$('span','tag','Синтетическая версия '+n.rev));add(content,$('h2','',n.title));add(content,$('pre','card body',n.text));
 const links=globalThis.PAE05WikiLinks.extract(n.text);
 if(links.length){
   const section=add(content,$('section','wiki-links'));
   add(section,$('h2','','Связанные заметки'));
   const known=store.list();
   for(const link of links){
     const result=globalThis.PAE05WikiLinks.resolve(link,known);
     if(result.status==='ok')button(section,'↗ '+link.label,()=>openNote(result.id),'btn subtle wiki-link');
     else add(section,$('p','meta',result.status==='ambiguous'?'Неоднозначная ссылка: '+link.label:'Заметка не найдена: '+link.label));
   }
 }
 const actions=add(content,$('div','actions'));button(actions,'✎ Редактировать',()=>{draft={id:n.id,baseRev:n.rev,title:n.title,text:n.text};tab='edit';render();});button(actions,'← Все заметки',()=>{tab='home';render();},'btn subtle');const simulate=button(actions,'Имитировать 2-е устройство',async()=>{if(busy)return;busy=true;simulate.disabled=true;try{await store.peerEdit(n.id);notice='Синтетическая имитация: версия увеличена только на этом устройстве.';}catch(e){notice='НЕ СОХРАНЕНО · '+e.message;}finally{busy=false;render();}},'btn subtle');
 const revs=store.revisions(n.id);add(content,$('h2','','История тестовых версий'));for(const old of revs.slice().reverse()){const row=add(content,$('div','card'));add(row,$('div','meta','Версия '+old.rev));add(row,$('p','body',old.text.slice(0,85)));if(old.rev!==n.rev)button(row,'Восстановить через подтверждение',()=>{draft={id:n.id,baseRev:n.rev,title:old.title,text:old.text};tab='edit';render();},'btn subtle');}}
function editor(create){const current=create?null:store.get(id);if(!create&&!current){tab='home';render();return;}if(!draft||draft.id!==(create?null:id)){draft={id:create?null:id,baseRev:create?null:current.rev,title:create?'':current.title,text:create?'# Новая заметка\n':current.text};}add(content,$('p','meta',create?'Создание вымышленной заметки':'Исходная версия: '+draft.baseRev));const label1=add(content,$('label','field','Название'));label1.htmlFor='title';const title=add(content,$('input','control'));title.id='title';title.maxLength=80;title.value=draft.title;const label2=add(content,$('label','field','Markdown'));label2.htmlFor='body';const body=add(content,$('textarea','control'));body.id='body';body.maxLength=5000;body.value=draft.text;add(content,$('p','meta','Markdown и [[вики-ссылки]] остаются текстом. HTML не выполняется.'));const actions=add(content,$('div','actions'));button(actions,'Предпросмотр →',()=>{draft.title=title.value;draft.text=body.value;try{preview=store.prepare(draft);tab='preview';render();}catch(e){notice=e.message;render();}});button(actions,'Отмена',()=>{draft=null;tab=create?'home':'note';render();},'btn subtle');}
function previewPage(){if(!preview){tab='home';render();return;}add(content,$('p','warn','Проверьте содержимое до подтверждения. Сохранение произойдёт только после успешной записи в IndexedDB.'));if(preview.before){const p=add(content,$('div','card before'));add(p,$('div','meta','До · ревизия '+preview.baseRev));add(p,$('h2','',preview.before.title));add(p,$('pre','body',preview.before.text));}const a=add(content,$('div','card after'));add(a,$('div','meta','После · локальная версия (НЕ синхронизирована)'));add(a,$('h2','',preview.after.title));add(a,$('pre','body',preview.after.text));const row=add(content,$('label','checkbox'));const consent=add(row,$('input'));consent.type='checkbox';add(row,$('span','','Подтверждаю запись вымышленной заметки только на этом устройстве'));const actions=add(content,$('div','actions'));const save=button(actions,'Сохранить локально',async()=>{if(busy||!consent.checked)return;busy=true;save.disabled=true;save.textContent='Сохранение…';const token=preview.token;try{const n=await store.commit(token,true);id=n.id;draft=null;preview=null;tab='note';notice='Сохранено только на этом iPhone · НЕ синхронизировано';}catch(e){preview=null;tab=draft?.id===null?'create':'edit';notice=e.message==='CONFLICT_409'?'Конфликт 409: версия изменилась. Перезапись запрещена.':('НЕ СОХРАНЕНО · '+e.message);}finally{busy=false;render();}},'btn');save.disabled=true;consent.addEventListener('change',()=>{save.disabled=!consent.checked||!store.status().ready||busy;});if(!store.status().ready)add(actions,$('p','error','НЕ СОХРАНЕНО · Сохранение заблокировано: IndexedDB недоступна.'));button(actions,'← Исправить',()=>{store.discard(preview.token);preview=null;tab=draft.id===null?'create':'edit';render();},'btn subtle');if(preview.id!==null)button(actions,'Сымитировать конфликт 409',async()=>{if(busy)return;busy=true;try{await store.peerEdit(preview.id);notice='Имитировано другое изменение; при сохранении будет конфликт 409.';}catch(e){notice='НЕ СОХРАНЕНО · '+e.message;}finally{busy=false;render();}},'btn danger');}
function chat(){add(content,$('div','chatmsg','Это учебный чат. Настоящий ИИ и сервер не подключены.'));button(content,'Перейти к заметкам',()=>{tab='home';render();});}
function backupSection(){
 const panel=add(content,$('section','card'));
 add(panel,$('h2','','Резервная копия для iPhone'));
 add(panel,$('p','meta','Только вымышленные заметки. Файл JSON не зашифрован и не синхронизирован. Не вводите личные данные.'));
 const prepare=button(panel,'Подготовить резервную копию',async()=>{
  if(backupBusy)return;backupBusy=true;prepare.disabled=true;
  try{exportJsonText=await backup.exportJson();notice='Копия подготовлена. Отдельно нажмите «Поделиться файлом» и сохраните её в «Файлы».';}
  catch(e){exportJsonText=null;notice='КОПИЯ НЕ СОЗДАНА · '+e.message;}
  finally{backupBusy=false;render();}
 });prepare.disabled=backupBusy||!store.status().ready;
 if(exportJsonText){
  button(panel,'Поделиться файлом / скачать',()=>{
   const name='ObsidianAI_TEST_v0.5.0_backup.json';
   const type='application/json';
   const blob=new Blob([exportJsonText],{type});
   const file=typeof File==='function'?new File([exportJsonText],name,{type}):null;
   if(file&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'Obsidian AI TEST — резервная копия'}).then(()=>{notice='Меню «Поделиться» закрыто. Проверьте, что файл действительно сохранён.';render();}).catch(e=>{notice=e.name==='AbortError'?'Сохранение отменено пользователем.':'Не удалось поделиться файлом: '+e.message;render();});
   }else{
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    notice='Загрузка запрошена. Проверьте в «Файлах» → «Загрузки», что копия действительно сохранилась.';render();
   }
  },'btn');
 }
 const picker=add(panel,$('input'));picker.type='file';picker.accept='.json,application/json';picker.hidden=true;picker.setAttribute('aria-label','Выберите резервную копию JSON');
 button(panel,'Выбрать файл для восстановления',()=>picker.click(),'btn subtle');
 picker.addEventListener('change',async()=>{
  const file=picker.files?.[0];restoreCandidate=null;if(!file)return;
  if(backupBusy)return;backupBusy=true;
  try{
   if(file.size>backup.maxBytes)throw Error('BACKUP_TOO_LARGE');
   const json=await file.text();const payload=backup.parseJson(json);
   restoreCandidate=payload;notice='Проверена структура резервной копии. Изменений пока нет.';
  }catch(e){notice='КОПИЯ ОТКЛОНЕНА · '+e.message;}
  finally{backupBusy=false;render();}
 });
 if(restoreCandidate){
  add(panel,$('p','warn','Готово к восстановлению: '+restoreCandidate.records.length+' изменённых/новых вымышленных заметок. Импорт разрешён ТОЛЬКО в пустую локальную тестовую базу; существующие записи не будут перезаписаны.'));
  const row=add(panel,$('label','checkbox')),consent=add(row,$('input'));consent.type='checkbox';
  add(row,$('span','','Подтверждаю восстановление только вымышленных данных на этом iPhone'));
  const doRestore=button(panel,'Восстановить из копии',async()=>{
   if(backupBusy||!consent.checked)return;backupBusy=true;doRestore.disabled=true;
   try{
    const count=await backup.restore(restoreCandidate,true);const readback=await store.init();restoreCandidate=null;exportJsonText=null;tab='home';id=null;draft=null;preview=null;notice=readback.ready?('Восстановлено локально '+count+' вымышленных записей · НЕ синхронизировано'):('РЕЗУЛЬТАТ НЕ ПОДТВЕРЖДЁН · повторное чтение недоступно: '+readback.failure+'. Не повторяйте импорт автоматически.');
   }catch(e){notice='НЕ ВОССТАНОВЛЕНО · '+e.message;}
   finally{backupBusy=false;render();}
  },'btn');doRestore.disabled=true;consent.addEventListener('change',()=>{doRestore.disabled=!consent.checked||backupBusy||!store.status().ready;});
  button(panel,'Отмена восстановления',()=>{restoreCandidate=null;render();},'btn subtle');
 }
}
function settings(){add(content,$('h2','','Obsidian AI · '+VERSION));add(content,$('p','meta','Сборка '+BUILD+' · только вымышленные заметки'));add(content,$('p','card','После подтверждения заметки сохраняются только в IndexedDB этого браузера. Это НЕ Dropbox и НЕ синхронизация iPhone/iPad. Safari может очистить локальное хранилище; запись может пропасть после удаления приложения/очистки данных.'));add(content,$('p','meta','CSP connect-src none. Нет реального Gateway, Vault, аккаунта, AI, облачных ключей или Service Worker.'));backupSection();if(!resetPrompt){button(content,'Сбросить тестовые заметки',()=>{resetPrompt=true;render();},'btn danger');return;}
 add(content,$('p','error','Внимание: будут удалены все подтверждённые синтетические изменения только из локальной базы этого браузера. Восстановление возможно только из отдельно сохранённых копий.'));const row=add(content,$('label','checkbox'));const consent=add(row,$('input'));consent.type='checkbox';add(row,$('span','','Понимаю, что локальная история тестовых заметок будет удалена'));const actions=add(content,$('div','actions'));const go=button(actions,'Удалить локальные тестовые заметки',async()=>{if(busy||!consent.checked)return;busy=true;go.disabled=true;try{await store.reset();draft=null;preview=null;id=null;searchTerm='';exportJsonText=null;restoreCandidate=null;tab='home';notice='Тестовые заметки сброшены только в этом браузере.';}catch(e){notice='НЕ УДАЛЕНО · '+e.message;}finally{busy=false;resetPrompt=false;render();}},'btn danger');go.disabled=true;consent.addEventListener('change',()=>{go.disabled=!consent.checked||busy||!store.status().ready;});button(actions,'Отмена',()=>{resetPrompt=false;render();},'btn subtle');}
document.querySelectorAll('nav button').forEach(n=>n.addEventListener('click',()=>{if(preview)store.discard(preview.token);preview=null;draft=null;resetPrompt=false;if(n.dataset.tab!=='settings'){exportJsonText=null;restoreCandidate=null;}tab=n.dataset.tab;if(tab==='create')id=null;render();}));
window.addEventListener('pagehide',()=>{if(preview)store.discard(preview.token);preview=null;draft=null;});
store.init().then(s=>{if(!s.ready)notice='НЕ СОХРАНЕНО · IndexedDB недоступна. Запись отключена.';render();}).catch(e=>{notice='НЕ СОХРАНЕНО · '+e.message;render();});
})();
