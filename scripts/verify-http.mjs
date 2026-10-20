import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const report={passed:false,checks:0,requests:[]};
function http(path,method='GET'){
  return new Promise((resolve,reject)=>{
    const req=request({host:'127.0.0.1',port,path,method},res=>{
      const data=[];res.on('data',chunk=>data.push(chunk));res.on('end',()=>{report.requests.push({path,method,status:res.statusCode});resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(data)})});
    });req.on('error',reject);req.end();
  });
}
async function checkFiles(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,entry.name);if(entry.isDirectory()){await checkFiles(path);continue}
    const url='/'+relative(join(root,'public'),path).replaceAll('\\','/');
    const response=await http(url);assert.equal(response.status,200,url);assert.deepEqual(response.body,await readFile(path),url);report.checks+=2;
    assert.deepEqual(await readFile(join(root,'dist',relative(join(root,'public'),path))),response.body,'Build output mismatch: '+url);report.checks++;
    if(extname(path)==='.js'){assert.match(response.headers['content-type'],/javascript/);report.checks++}
  }
}
const child=spawn(process.execPath,[join(root,'scripts/serve.mjs')],{cwd:root,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out')),5000);child.once('error',reject);child.stdout.once('data',()=>{clearTimeout(timer);resolve()})});
  await checkFiles(join(root,'public'));
  for(const [path,method,status] of [['/','GET',200],['/assets/js/app.js','HEAD',200],['/not-found','GET',404],['/scripts/build.mjs','GET',404],['/','POST',405],['/%ZZ','GET',400],['/%2e%2e%2fpackage.json','GET',403]]){
    const response=await http(path,method);assert.equal(response.status,status,path);report.checks++;
    if(method==='HEAD'){assert.equal(response.body.length,0);report.checks++}
  }
  report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1}
finally{
  const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;
  await mkdir(join(root,'test-results'),{recursive:true});await writeFile(join(root,'test-results/http-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,checks:report.checks,error:report.error},null,2));
}
