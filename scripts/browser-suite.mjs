import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export async function runBrowserSuite(suite){
  const root=fileURLToPath(new URL('../',import.meta.url));
  const browser=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  if(!browser)throw new Error('Set BROWSER_PATH to an installed Chromium browser.');
  const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/[^0-9]/g,'');
  const runName=stamp+'-'+suite+'-'+(browser.includes('Edge')?'edge':'chrome');
  const output=join(root,'test-results',runName);
  await mkdir(join(output,'images'),{recursive:true});
  await mkdir(join(output,'files'),{recursive:true});
  const profile=await mkdtemp(join(root,'.image-verification-'));
  const artifacts=[],requests=[];
  let complete,child,timer,diagnostics='';
  const result=new Promise(resolve=>{complete=resolve});
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='POST'&&url.pathname==='/artifact'){
        const name=url.searchParams.get('path')||'';
        if(!/^(images|files|fixtures)\//.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'||p.includes('\\')||p.includes(':'))){res.writeHead(400);res.end();return}
        const file=resolve(output,name);
        if(!file.startsWith(output+sep)){res.writeHead(403);res.end();return}
        if(artifacts.some(artifact=>artifact.path===name)){res.writeHead(409);res.end('Duplicate test artifact path');return}
        const chunks=[];let length=0;
        for await(const chunk of req){length+=chunk.length;if(length>25*1024*1024)throw new Error('Test artifact too large');chunks.push(chunk)}
        const data=Buffer.concat(chunks);await mkdir(dirname(file),{recursive:true});await writeFile(file,data);
        artifacts.push({path:name,bytes:data.length,type:req.headers['content-type'],sha256:createHash('sha256').update(data).digest('hex')});
        res.writeHead(200);res.end('saved');return;
      }
      if(req.method==='POST'&&(url.pathname==='/report'||url.pathname==='/progress')){
        let body='';for await(const chunk of req)body+=chunk;
        const value=JSON.parse(body);res.writeHead(200);res.end('ok');
        if(url.pathname==='/report')complete(value);else console.log('Checking: '+value.name);
        return;
      }
      const path=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
      const base=path.startsWith('/tests/')?root:join(root,'public');
      const file=resolve(base,'.'+path);
      if(!file.startsWith(resolve(base)+sep)){res.writeHead(403);res.end();return}
      if(path.startsWith('/tests/')&&!['.html','.js'].includes(extname(file))){res.writeHead(404);res.end();return}
      const data=await readFile(file);requests.push({path:url.pathname,status:200});
      res.writeHead(200,{'Content-Type':extname(file)==='.html'?'text/html; charset=utf-8':extname(file)==='.css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});res.end(data);
    }catch{requests.push({path:req.url,status:404});res.writeHead(404);res.end()}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--user-data-dir='+profile,'http://127.0.0.1:'+server.address().port+'/tests/browser-'+suite+'.html'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    child.stderr.on('data',chunk=>{diagnostics=(diagnostics+chunk.toString()).slice(-4000)});
    const launchFailure=new Promise((_,reject)=>child.once('error',reject));
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Browser verification timed out: '+diagnostics)),120000)});
    const report=await Promise.race([result,launchFailure,timeout]);
    Object.assign(report,{runName,artifacts,requests});
    await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const gallery=artifacts.filter(a=>a.type&&a.type.startsWith('image/')).map(a=>'<figure><a href="'+escape(encodeURI(a.path))+'"><img loading="lazy" src="'+escape(encodeURI(a.path))+'" alt="'+escape(a.path)+'"></a><figcaption>'+escape(a.path)+'<br>'+a.bytes.toLocaleString('en-US')+' bytes</figcaption></figure>').join('\n');
    await writeFile(join(output,'gallery.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test image outputs</title><style>body{font:14px system-ui;margin:24px;background:#f4f5f6;color:#16191d}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;max-width:1400px;margin:auto}h1{max-width:1400px;margin:24px auto}figure{margin:0;padding:12px;background:white;border-radius:8px}img{width:100%;height:200px;object-fit:contain;background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 50%/16px 16px}figcaption{margin-top:10px;overflow-wrap:anywhere;line-height:1.6}</style><h1>'+escape(runName)+'</h1><main>'+gallery+'</main></html>');
    await writeFile(join(output,'README.md'),[
      '# Browser verification: '+suite,
      '',
      '- Result: '+(report.passed?'PASS':'FAIL'),
      '- Browser: '+report.browser,
      '- Checks: '+report.checks,
      '- Saved artifacts: '+artifacts.length,
      '- Report: [report.json](report.json)',
      '- Images: [gallery.html](gallery.html)',
      '',
      ...(report.cases||[]).map(c=>'- '+c.status+': '+c.name+(c.error?' — '+c.error:'')),
      '',
      ...(report.limitations||[]).map(text=>'- Limitation: '+text),
      '',
      '## Saved files','',
      ...artifacts.map(a=>'- ['+a.path+']('+encodeURI(a.path)+') — '+a.bytes+' bytes')
    ].join('\n')+'\n');
    await writeFile(join(root,'test-results','latest-'+suite+'.json'),JSON.stringify({directory:runName,passed:report.passed,checks:report.checks,artifacts:artifacts.length},null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,checks:report.checks,artifacts:artifacts.length,directory:output,error:report.error},null,2));
    if(!report.passed)process.exitCode=1;
    return report;
  }finally{
    clearTimeout(timer);
    if(child&&child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    if(dirname(profile)!==resolve(root)||!profile.startsWith(join(root,'.image-verification-')))throw new Error('Invalid temporary browser profile path');
    await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  }
}
