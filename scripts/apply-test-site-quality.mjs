import fs from 'node:fs';
import path from 'node:path';

const ROOT='.';
const SKIP_DIRS=new Set(['.git','.github','node_modules','scripts','tests']);

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.isDirectory()&&SKIP_DIRS.has(entry.name)) return [];
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function removeRobots(html){
  return html.replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>\s*/gi,'');
}

let changed=0;
for(const file of walk(ROOT).filter(file=>file.endsWith('.html'))){
  const before=fs.readFileSync(file,'utf8');
  let after=before;

  if(!/<html\b[^>]*\blang=["'][^"']+["']/i.test(after)){
    after=after.replace(/<html\b([^>]*)>/i,'<html lang="en"$1>');
  }

  after=removeRobots(after);
  after=after.replace(/<\/head>/i,'<meta name="robots" content="noindex,nofollow">\n</head>');

  if(after!==before){
    fs.writeFileSync(file,after);
    changed+=1;
    console.log(`test-site quality updated ${file}`);
  }
}

const robots='User-agent: *\nDisallow: /\n';
if(!fs.existsSync('robots.txt')||fs.readFileSync('robots.txt','utf8')!==robots){
  fs.writeFileSync('robots.txt',robots);
  changed+=1;
  console.log('test-site quality updated robots.txt');
}

console.log(`Test-site quality baseline complete; ${changed} file(s) changed.`);
