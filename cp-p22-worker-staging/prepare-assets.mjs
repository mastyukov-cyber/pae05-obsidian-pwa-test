/* CP-P22 R02: prepare only exact pinned synthetic staging assets.
 * This script does NOT deploy, run tests, alter source, delete, or overwrite.
 * Execute once with Node.js 26 after separate scoped approval.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {lstat,mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

if(process.versions.node.split(".")[0]!=="26")throw Error("NODE26_REQUIRED");
const ROOT=fileURLToPath(new URL("../",import.meta.url));
const TARGET=fileURLToPath(new URL("./.staging-assets/",import.meta.url));
const INPUTS=Object.freeze([
  ["p16-editor/app.css","app.css","ff78c3047e7dce7a4656958e6847fab1f75efdf0"],
  ["p16-editor/app.js","app.js","b3371bb5aee3d66e03b0d797fa61d501442def20"],
  ["p16-editor/backup-tools.js","backup-tools.js","f7fcb658bbcc838bc13132d5a8817eebc3d0f8ba"],
  ["p16-editor/index.html","index.html","93050f16b85d5402eea0cf7536d9e6980427b460"],
  ["p16-editor/manifest.webmanifest","manifest.webmanifest","7ecbb25e55d4e8ba0c97138997637606416330c9"],
  ["p16-editor/mock-store.js","mock-store.js","5878f85c28ef0a4f7c8926b2a100c65f21e9da0f"],
  ["p16-editor/p22-cloud-readonly.css","p22-cloud-readonly.css","19f8ea73b524d44bab854bfadae7e9dc15489364"],
  ["p16-editor/p22-cloud-readonly.js","p22-cloud-readonly.js","9ba8e36c13618486dadd14b6aeb75d22642916c4"],
  ["p16-editor/wikilinks.js","wikilinks.js","eaace31297d9cfa1558958ea5230467c258245f7"],
  ["icons/icon-192.png","icons/icon-192.png","5d6e346903c91c8f079aa50694c703dda4ae7769"],
  ["icons/icon-512.png","icons/icon-512.png","799ee2dd58bf5ccd71b88726b402770708876524"],
  ["icons/icon-maskable-512.png","icons/icon-maskable-512.png","5a308674304a8ed391eb40a29f8b990980de6dc2"]
]);
function gitBlobSha(buf){
  return createHash("sha1").update("blob "+buf.length+"\0").update(buf).digest("hex");
}
async function main(){
  // All original bytes and Git blob SHAs must pass before any filesystem write.
  const sourceBytes=new Map();
  for(const [src,dest,pin] of INPUTS){
    const path=join(ROOT,src),info=await lstat(path);
    assert.ok(info.isFile()&&!info.isSymbolicLink(),"INVALID_OR_SYMLINK_SOURCE: "+src);
    assert.ok(info.size>0&&info.size<100000,"SOURCE_SIZE_OUT_OF_SCOPE: "+src);
    const data=await readFile(path);
    assert.equal(gitBlobSha(data),pin,"GIT_BLOB_SHA_MISMATCH: "+src);
    sourceBytes.set(dest,data);
  }
  const manifest=JSON.parse(sourceBytes.get("manifest.webmanifest").toString("utf8"));
  assert.deepEqual(manifest.icons.map(x=>x.src),[
    "../icons/icon-192.png","../icons/icon-512.png",
    "../icons/icon-maskable-512.png"
  ],"MANIFEST_ICON_PATH_MISMATCH");
  const originalHtml=sourceBytes.get("index.html").toString("utf8");
  const oldApple='<link rel="apple-touch-icon" sizes="180x180" href="../icons/apple-touch-icon.png">';
  const newApple='<link rel="apple-touch-icon" sizes="192x192" href="../icons/icon-192.png">';
  assert.equal(originalHtml.split(oldApple).length-1,1,"APPLE_TOUCH_REFERENCE_MISMATCH");
  assert.ok(originalHtml.includes("connect-src 'none'"),"PINNED_PWA_CSP_MISMATCH");
  // Only the GENERATED staging HTML uses the already-approved original 192px icon.
  // Pinned repository p16-editor/index.html stays byte-for-byte unchanged.
  const derivedHtml=originalHtml.replace(oldApple,newApple);
  sourceBytes.set("index.html",Buffer.from(derivedHtml,"utf8"));
  assert.ok(!derivedHtml.includes("../icons/apple-touch-icon.png"));
  // Root deployment /index.html and /manifest.webmanifest resolve ../icons/* to /icons/*.
  const iconDestinations=INPUTS.filter(x=>x[1].startsWith("icons/")).map(x=>x[1]);
  assert.equal(iconDestinations.length,3,"EXACT_THREE_ORIGINAL_ICONS_REQUIRED");
  try{
    await lstat(TARGET);
    throw Error("STAGING_ALREADY_EXISTS_NO_OVERWRITE");
  }catch(e){if(e.code!=="ENOENT")throw e;}
  await mkdir(TARGET);
  await mkdir(join(TARGET,"icons"));
  for(const [dest,data] of sourceBytes){
    const out=join(TARGET,dest);
    await writeFile(out,data,{flag:"wx"});
    const written=await readFile(out);
    assert.ok(written.equals(data),"STAGING_READBACK_MISMATCH: "+dest);
  }
  assert.equal(sourceBytes.size,12,"STAGING_FILE_COUNT_MISMATCH");
  const total=[...sourceBytes.values()].reduce((s,data)=>s+data.length,0);
  process.stdout.write("PASS_SCOPED_CP_P22_STAGING_ASSETS files=12 original_icons=3 bytes="+total+
    " deployment=NOT_RUN node_tests=NOT_RUN\n");
}
await main();
