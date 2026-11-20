/* CP-P22 R01: public synthetic demo only; never owner authentication. */
const TTL=600000, COOKIE="pae05_p22_demo", SCOPE="SYNTHETIC_GUEST_READ_ONLY";
const NOTES=Object.freeze([
  Object.freeze({id:"synthetic-alpha",title:"Демо: начало",markdown:"# Демо: начало\nВымышленная тестовая заметка. Настоящий Vault не подключён.",revision:"synthetic-rev-1"}),
  Object.freeze({id:"synthetic-beta",title:"Демо: планы",markdown:"# Демо: планы\nТри тестовые заметки предназначены для проверки чтения с iPhone.",revision:"synthetic-rev-1"}),
  Object.freeze({id:"synthetic-gamma",title:"Демо: защита",markdown:"# Демо: защита\nЗапись, синхронизация, Dropbox и AI полностью отключены.",revision:"synthetic-rev-1"})
]);
const ENC=new TextEncoder(),DEC=new TextDecoder();
function b64(bytes){let s="";for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function un64(value){if(typeof value!=="string"||value.length>1024||!/^[A-Za-z0-9_-]+$/.test(value))return null;try{return Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),x=>x.charCodeAt(0));}catch{return null;}}
async function secretKey(env){
  const s=env&&env.PAE05_P22_SYNTHETIC_SESSION_KEY;
  if(typeof s!=="string"||ENC.encode(s).length<32)return null;
  return crypto.subtle.importKey("raw",ENC.encode(s),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function issue(key,origin){
  const nonce=new Uint8Array(16);crypto.getRandomValues(nonce);
  const payload=b64(ENC.encode(JSON.stringify({scope:SCOPE,aud:origin,exp:Date.now()+TTL,nonce:b64(nonce)})));
  const mac=await crypto.subtle.sign("HMAC",key,ENC.encode("v1."+payload));
  return "v1."+payload+"."+b64(new Uint8Array(mac));
}
function cookie(request){
  const part=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
  return part?part.slice(COOKIE.length+1):null;
}
async function authenticated(request,key,origin){
  const token=cookie(request);if(!token||token.length>1024)return false;
  const a=token.split(".");if(a.length!==3||a[0]!=="v1")return false;
  const data=un64(a[1]),mac=un64(a[2]);if(!data||!mac||mac.length!==32)return false;
  if(!await crypto.subtle.verify("HMAC",key,mac,ENC.encode("v1."+a[1])))return false;
  try{
    const p=JSON.parse(DEC.decode(data));
    return p&&p.scope===SCOPE&&p.aud===origin&&Number.isSafeInteger(p.exp)&&
      p.exp>Date.now()&&p.exp<=Date.now()+TTL&&typeof p.nonce==="string"&&p.nonce.length>=16;
  }catch{return false;}
}
const HEADERS={"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","Vary":"Cookie",
  "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",
  "X-Frame-Options":"DENY","Cross-Origin-Resource-Policy":"same-origin",
  "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"};
function json(status,body,more={}){return new Response(JSON.stringify(body),{status,headers:{
  ...HEADERS,"Content-Type":"application/json; charset=utf-8",...more}});}
function sameOriginPost(req,origin){
  const site=req.headers.get("Sec-Fetch-Site");
  return req.headers.get("Origin")===origin&&(!site||site==="same-origin")&&
    req.headers.get("X-PAE05-P22-Demo")==="synthetic-only"&&
    (req.headers.get("Content-Type")||"").split(";")[0].trim()==="application/json";
}
async function api(req,env,url){
  if(url.protocol!=="https:")return json(403,{error:"HTTPS_REQUIRED"});
  let key;try{key=await secretKey(env);}catch{return json(503,{error:"STAGING_SESSION_UNAVAILABLE"});}
  if(!key)return json(503,{error:"STAGING_SESSION_UNAVAILABLE"});
  const method=req.method.toUpperCase(),origin=url.origin;
  if(url.pathname==="/api/session"&&method==="POST"){
    if(!sameOriginPost(req,origin))return json(403,{error:"ORIGIN_OR_DEMO_SCOPE_REJECTED"});
    if(await req.text()!=="{}")return json(400,{error:"EXPECTED_EMPTY_JSON_OBJECT"});
    const token=await issue(key,origin);
    return json(200,{scope:SCOPE,authenticated:false,expiresInSeconds:600,status:"PUBLIC_GUEST_NOT_OWNER_AUTH"},{
      "Set-Cookie":COOKIE+"="+token+"; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Strict"});
  }
  if(url.pathname==="/api/logout"&&method==="POST"){
    if(!sameOriginPost(req,origin))return json(403,{error:"ORIGIN_OR_DEMO_SCOPE_REJECTED"});
    return json(200,{state:"COOKIE_CLEARED_NOT_SERVER_REVOKED"},{
      "Set-Cookie":COOKIE+"=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Strict"});
  }
  if(method!=="GET")return json(405,{error:"READ_ONLY_NO_WRITE_ENDPOINTS"},{Allow:"GET"});
  if(!await authenticated(req,key,origin))return json(401,{error:"SYNTHETIC_SESSION_REQUIRED"});
  if(url.pathname==="/api/session")return json(200,{scope:SCOPE,authenticated:false,status:"ACTIVE_SYNTHETIC_GUEST"});
  if(url.pathname==="/api/notes")return json(200,{items:NOTES.map(n=>({id:n.id,title:n.title,revision:n.revision})),
    syncStatus:"SYNTHETIC_NOT_SYNCED",peerConfirmed:false});
  const m=/^\/api\/notes\/([a-z0-9-]+)$/.exec(url.pathname);
  if(m){
    const note=NOTES.find(n=>n.id===m[1]);
    return note?json(200,{...note,syncStatus:"SYNTHETIC_NOT_SYNCED",peerConfirmed:false}):json(404,{error:"NOTE_NOT_FOUND"});
  }
  return json(404,{error:"API_ROUTE_NOT_FOUND"});
}
const PWA_CSP="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'self'; font-src 'self'";
async function assets(req,env,url){
  if(req.method!=="GET"&&req.method!=="HEAD")return json(405,{error:"STATIC_READ_ONLY"},{Allow:"GET, HEAD"});
  if(!env||!env.ASSETS||typeof env.ASSETS.fetch!=="function")return json(503,{error:"STAGING_ASSETS_MISSING"});
  const response=await env.ASSETS.fetch(req);
  if((url.pathname!=="/"&&url.pathname!=="/index.html")||req.method==="HEAD"||response.status!==200)return response;
  const html=await response.text();
  if(!html.includes("connect-src 'none'")||!html.includes("</body>")||!html.includes('src="./app.js"'))
    return json(503,{error:"PINNED_PWA_SHELL_MISMATCH"});
  const edited=html.replace("connect-src 'none'","connect-src 'self'")
    .replace("</body>",'<link rel="stylesheet" href="./p22-cloud-readonly.css"><script src="./p22-cloud-readonly.js" defer></script></body>');
  const headers=new Headers(response.headers);headers.delete("Content-Length");headers.delete("ETag");
  headers.set("Content-Type","text/html; charset=utf-8");headers.set("Content-Security-Policy",PWA_CSP);
  headers.set("Cache-Control","no-store, max-age=0");headers.set("X-Content-Type-Options","nosniff");
  headers.set("Referrer-Policy","no-referrer");
  return new Response(edited,{status:200,headers});
}
export default {async fetch(req,env){
  const url=new URL(req.url);
  try{return url.pathname.startsWith("/api/")?await api(req,env,url):await assets(req,env,url);}
  catch{return json(503,{error:"SYNTHETIC_STAGING_UNAVAILABLE"});}
}};
