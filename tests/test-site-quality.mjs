import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS=new Set(['.git','.github','node_modules','scripts','tests']);
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.isDirectory()&&SKIP_DIRS.has(entry.name)) return [];
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

const htmlFiles=walk('.').filter(file=>file.endsWith('.html'));
assert.ok(htmlFiles.length>=3,'expected the test site HTML pages');

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/<html\b[^>]*\blang=["'][^"']+["']/i,`${file} must declare document language`);
  assert.match(html,/<meta\b[^>]*\bname=["']viewport["']/i,`${file} must include viewport metadata`);
  assert.match(html,/<title>[\s\S]*?<\/title>/i,`${file} must include a title`);
  const robots=[...html.matchAll(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/gi)];
  assert.equal(robots.length,1,`${file} must have exactly one robots meta tag`);
  assert.match(robots[0][0],/content=["']noindex,nofollow["']/i,`${file} must stay noindex,nofollow`);
}

const robotsTxt=fs.readFileSync('robots.txt','utf8');
assert.match(robotsTxt,/^User-agent:\s*\*/m,'robots.txt must address all crawlers');
assert.match(robotsTxt,/^Disallow:\s*\/$/m,'robots.txt must disallow the public test site');

const manifests=[];
for(let i=1;i<=8;i++){
  const name=`sound-intuition/sounds-${String(i).padStart(2,'0')}.json`;
  assert.ok(fs.existsSync(name),`${name} must exist`);
  const data=JSON.parse(fs.readFileSync(name,'utf8'));
  assert.ok(Array.isArray(data),`${name} must be an array`);
  manifests.push(...data);
}

assert.equal(manifests.length,159,'Sound Intuition should keep the documented 159 manifest entries');
const ids=new Set();
const paths=new Set();
for(const item of manifests){
  assert.equal(typeof item.id,'string','sound id must be a string');
  assert.ok(item.id.trim(),'sound id must not be blank');
  assert.ok(!ids.has(item.id),`duplicate Sound Intuition id: ${item.id}`);
  ids.add(item.id);
  assert.equal(typeof item.category,'string',`${item.id} must have a category`);
  assert.equal(typeof item.reveal_label,'string',`${item.id} must have a reveal label`);
  assert.ok([1,2,3].includes(Number(item.startle_level)),`${item.id} must use startle level 1, 2, or 3`);
  assert.equal(typeof item.production_file,'string',`${item.id} must have production_file`);
  assert.match(item.production_file,/^audio-normalized\/.+\.mp3$/i,`${item.id} production path must stay under audio-normalized and end in .mp3`);
  assert.ok(!paths.has(item.production_file),`duplicate Sound Intuition production path: ${item.production_file}`);
  paths.add(item.production_file);
}

const app=fs.readFileSync('sound-intuition/app.js','utf8');
assert.match(app,/Array\.from\(\{length:8\}/,'Sound Intuition app must load all eight manifest parts');
assert.match(app,/RECENT_LIMIT\s*=\s*12/,'recent-repeat window must remain 12 sounds');
assert.match(app,/No startling sounds|gentleMode/i,'gentle-mode behavior must remain represented in the app source');

const readme=fs.readFileSync('sound-intuition/README.md','utf8');
assert.match(readme,/159 normalized production entries/i,'README must preserve the documented 159-entry manifest count');
assert.match(readme,/Do not move this into the main `intuition\.tinythor\.cc` production repo until audio staging and listening tests pass\./,'production-promotion guardrail must remain documented');
assert.match(readme,/audio folder is staged in Hunter’s local clone but is not yet in the GitHub repository/i,'missing-audio live-test blocker must remain documented until resolved');

const intentionallyAbsent=['gentle-rain','morning-birds','fireworks','hail','thunderstorm','geiger-counter'];
for(const value of intentionallyAbsent){
  assert.ok(!ids.has(value),`intentionally unavailable source ${value} must not silently enter the manifest before source validation`);
}

console.log(`Test-site quality passed: ${htmlFiles.length} HTML pages protected from indexing and ${manifests.length} Sound Intuition manifest entries validated.`);
