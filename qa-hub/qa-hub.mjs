/* PAE-00 QA HUB v1 / PAE-05 PWA adapter. Synthetic tests only.
 * PREPARED ONLY. No automatic execution, networking outside the local preview,
 * Vault/Gateway connections, production writes, or GitHub Actions.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HOME,'..');
const RUN=join(HOME,'.run');
const SOURCE_COMMIT='13118049776f58635714a2aff374b51dc487c4ad';
const PINS={
  "p16-editor/index.html": "93050f16b85d5402eea0cf7536d9e6980427b460",
  "p16-editor/app.css": "ff78c3047e7dce7a4656958e6847fab1f75efdf0",
  "p16-editor/app.js": "b3371bb5aee3d66e03b0d797fa61d501442def20",
  "p16-editor/mock-store.js": "5878f85c28ef0a4f7c8926b2a100c65f21e9da0f",
  "p16-editor/backup-tools.js": "f7fcb658bbcc838bc13132d5a8817eebc3d0f8ba",
  "p16-editor/wikilinks.js": "eaace31297d9cfa1558958ea5230467c258245f7",
  "p16-editor/manifest.webmanifest": "7ecbb25e55d4e8ba0c97138997637606416330c9",
  "icons/apple-touch-icon.png": "01240b20f0e0e3fb438dabefb34abf2b6fd21c61",
  "icons/icon-192.png": "5d6e346903c91c8f079aa50694c703dda4ae7769",
  "icons/icon-512.png": "799ee2dd58bf5ccd71b88726b402770708876524",
  "icons/icon-maskable-512.png": "5a308674304a8ed391eb40a29f8b990980de6dc2"
};
const ALLOW=new Set(Object.keys(PINS));
const ENTRY='/p16-editor/index.html';
const PORT=8767;
const MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.webmanifest':'application/manifest+json',
  '.png':'image/png'
};
function stop(message){throw Error(message)}
function gitBlobSHA(bytes){
  return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
async function verifySource(){
  const checked=[];
  for(const [rel,expected] of Object.entries(PINS)){
    if(rel.includes('..')||rel.startsWith('/')||!ALLOW.has(rel))stop('PATH_DENIED '+rel);
    const bytes=await readFile(join(ROOT,rel));
    if(bytes.length>100000)stop('OVERSIZE '+rel);
    const actual=gitBlobSHA(bytes);
    if(actual!==expected)stop('SOURCE_SHA_MISMATCH '+rel);
    checked.push({path:rel,gitBlobSha:actual,bytes:bytes.length});
  }
  const html=(await readFile(join(ROOT,'p16-editor/index.html'))).toString('utf8');
  if(!html.includes("connect-src 'none'")||!html.includes("worker-src 'none'"))stop('CSP_GUARD_MISSING');
  if(!html.includes('TEST v0.5.0'))stop('VERSION_UNEXPECTED');
  const app=(await readFile(join(ROOT,'p16-editor/app.js'))).toString('utf8');
  if(!app.includes('СИНТЕТИЧЕСКОЕ ДЕМО')||!app.includes("const VERSION='TEST v0.5.0'"))stop('SYNTHETIC_GUARD_MISSING');
  return checked;
}
function mappedPath(requestUrl){
  const u=new URL(requestUrl,'http://127.0.0.1/');
  let p;
  try{p=decodeURIComponent(u.pathname)}catch{return null}
  if(p==='/'||p==='/p16-editor/')return {redirect:ENTRY};
  const rel=p.replace(/^\/+/, '');
  if(!ALLOW.has(rel))return null;
  if(u.search&&rel!=='p16-editor/index.html')return null;
  return {rel};
}
async function listen(host,port){
  const server=createServer(async(req,res)=>{
    try{
      if(req.method!=='GET'&&req.method!=='HEAD'){
        res.writeHead(405,{'Cache-Control':'no-store'});res.end();return;
      }
      const mapped=mappedPath(req.url);
      if(!mapped){res.writeHead(404,{'Cache-Control':'no-store'});res.end();return;}
      if(mapped.redirect){
        res.writeHead(302,{Location:mapped.redirect,'Cache-Control':'no-store'});res.end();return;
      }
      const path=resolve(ROOT,mapped.rel);
      if(!path.startsWith(ROOT+sep))stop('PATH_OUTSIDE_ROOT');
      const body=await readFile(path);
      res.writeHead(200,{
        'Content-Type':MIME[extname(path)]||'application/octet-stream',
        'Content-Length':String(body.length),
        'X-Content-Type-Options':'nosniff',
        'X-PAE-Data':'synthetic-only',
        'Cache-Control':'no-store'
      });
      res.end(req.method==='HEAD'?undefined:body);
    }catch{
      res.writeHead(404,{'Cache-Control':'no-store'});res.end();
    }
  });
  await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,host,ok)});
  return {server,address:server.address()};
}
async function browserScenario(name,engine,base){
  const browser=await engine.launch({headless:true});
  const evidence=[];
  const errors=[];
  try{
    const context=await browser.newContext({serviceWorkers:'block'});
    try{
      const page=await context.newPage();
      page.on('pageerror',err=>errors.push(String(err.message).slice(0,200)));
      await page.goto(base+ENTRY.slice(1),{waitUntil:'domcontentloaded',timeout:20000});
      await page.getByText('IndexedDB доступна',{exact:false}).waitFor({timeout:15000});
      await page.getByText('TEST v0.5.0',{exact:false}).first().waitFor();
      evidence.push('version-and-indexeddb');
      const title='QA_HUB_'+name.toUpperCase();
      await page.locator('nav button[data-tab="create"]').click();
      await page.locator('#title').fill(title);
      await page.locator('#body').fill('# QA\nSYNTHETIC ONLY · create');
      await page.getByRole('button',{name:'Предпросмотр →'}).click();
      await page.locator('#content input[type="checkbox"]').check();
      await page.getByRole('button',{name:'Сохранить локально'}).click();
      await page.getByText('Сохранено только',{exact:false}).waitFor();
      evidence.push('create-confirm-commit');
      await page.reload({waitUntil:'domcontentloaded'});
      const note=page.locator('button.note-link').filter({hasText:title});
      await note.waitFor({timeout:15000});
      await note.click();
      await page.getByRole('button',{name:/Редактировать/}).click();
      await page.locator('#body').fill('# QA\nSYNTHETIC ONLY · edit v2');
      await page.getByRole('button',{name:'Предпросмотр →'}).click();
      await page.locator('#content input[type="checkbox"]').check();
      await page.getByRole('button',{name:'Сохранить локально'}).click();
      await page.getByText('Синтетическая версия 2',{exact:false}).waitFor();
      await page.getByText('История тестовых версий',{exact:false}).waitFor();
      evidence.push('reload-edit-history');
      const json=await page.evaluate(()=>globalThis.PAE05LocalBackup.create().exportJson());
      const parsed=JSON.parse(json);
      if(parsed.format!=='PAE05_SYNTHETIC_BACKUP_V1'||
         !Array.isArray(parsed.records)||parsed.records.length!==1||
         parsed.records[0].title!==title||parsed.records[0].rev!==2)stop('BACKUP_CONTENT_UNEXPECTED');
      evidence.push('backup-export-validated');
      const isolated=await browser.newContext({serviceWorkers:'block'});
      try{
        const restore=await isolated.newPage();
        await restore.goto(base+ENTRY.slice(1),{waitUntil:'domcontentloaded',timeout:20000});
        await restore.getByText('IndexedDB доступна',{exact:false}).waitFor({timeout:15000});
        const restored=await restore.evaluate(async text=>{
          const m=globalThis.PAE05LocalBackup.create();
          return m.restore(m.parseJson(text),true);
        },json);
        if(restored!==1)stop('RESTORE_COUNT_UNEXPECTED');
        await restore.reload({waitUntil:'domcontentloaded'});
        await restore.locator('button.note-link').filter({hasText:title}).waitFor();
        const blocked=await restore.evaluate(async text=>{
          const m=globalThis.PAE05LocalBackup.create();
          try{await m.restore(m.parseJson(text),true);return 'UNEXPECTED_SUCCESS'}
          catch(e){return String(e.message)}
        },json);
        if(blocked!=='RESTORE_TARGET_NOT_EMPTY')stop('NONEMPTY_RESTORE_NOT_BLOCKED '+blocked);
        evidence.push('isolated-empty-db-restore','nonempty-restore-refused');
      }finally{await isolated.close()}
      if(errors.length)stop('BROWSER_JS_ERROR '+errors.join('; '));
      return {browser:name,status:'PASS_SCOPED',checks:evidence,errors};
    }finally{await context.close()}
  }finally{await browser.close()}
}
async function test(){
  const report={project:'PAE-05',scope:'p16-editor/ CP-P20 synthetic QA only',
    sourceCommit:SOURCE_COMMIT,startedAt:new Date().toISOString(),
    browsers:[],offline:'NOT_APPLICABLE_NO_SERVICE_WORKER',status:'NOT_RUN'};
  let server=null;
  try{
    report.sourceAssets=(await verifySource()).length;
    const active=await listen('127.0.0.1',0);
    server=active.server;
    const origin='http://127.0.0.1:'+active.address.port+'/';
    const {chromium,webkit}=await import('playwright');
    for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
      const result=await browserScenario(name,engine,origin);
      report.browsers.push(result);
    }
    report.status='PASS_SCOPED';
  }catch(e){
    report.status='FAIL_STOP_FIRST';
    report.error=String(e?.message||e).slice(0,300);
    process.exitCode=1;
  }finally{
    report.finishedAt=new Date().toISOString();
    if(server)await new Promise(ok=>server.close(ok));
    await mkdir(RUN,{recursive:true});
    const name='pae05-qa-'+randomUUID()+'.json';
    await writeFile(join(RUN,name),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({...report,reportFile:'qa-hub/.run/'+name},null,2));
  }
}
async function main(){
  const action=process.argv[2];
  if(action==='verify'){
    const a=await verifySource();
    console.log(JSON.stringify({status:'PASS_STATIC_SOURCE_ONLY',sourceCommit:SOURCE_COMMIT,assets:a.length,run:'NOT_RUN'}));
  }else if(action==='serve'){
    await verifySource();
    const instance=await listen('0.0.0.0',PORT);
    console.log(JSON.stringify({status:'SYNTHETIC_PREVIEW_READY',port:instance.address.port,visibility:'VERIFY_PRIVATE_IN_GITHUB_UI',sourceCommit:SOURCE_COMMIT}));
  }else if(action==='test')await test();
  else stop('USAGE: node qa-hub.mjs verify | test | serve');
}
await main();
