import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const execute=promisify(execFile);
let preparing;
async function prepare(){
 const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||'C:/Android/Sdk',platform=path.join(sdk,'platforms/android-36');
 const output=path.resolve('.build/android-ui-dump'),source=path.resolve('tools/android/FastDump.java');
 await mkdir(output,{recursive:true});
 const digest=createHash('sha256').update(await readFile(source)).digest('hex'),jar=path.join(output,'wildfall-fast-dump.jar');
 try{await access(jar);if(await readFile(path.join(output,'digest.txt'),'utf8')===digest)return jar;}catch{}
 const cache=process.env.ANDROID_QA_JUNIT||path.join(process.env.USERPROFILE||'', '.gradle/caches/modules-2/files-2.1/junit/junit/4.13.2');
 let junit=cache;
 if(!cache.endsWith('.jar')){for(const dir of await readdir(cache)){const candidate=path.join(cache,dir,'junit-4.13.2.jar');try{await access(candidate);junit=candidate;break;}catch{}}}
 const classes=path.join(output,'classes'),dex=path.join(output,'dex');await mkdir(classes,{recursive:true});await mkdir(dex,{recursive:true});
 const run=async(executable,args)=>execute(executable,args,{timeout:60000,maxBuffer:1024*1024});
 await run('javac',['-source','8','-target','8','-classpath',[path.join(platform,'android.jar'),path.join(platform,'uiautomator.jar'),junit].join(path.delimiter),'-d',classes,source]);
 const input=path.join(output,'input.jar');await run('jar',['cf',input,'-C',classes,'com/ashenvalley/wildfall/qa/FastDump.class']);
 await run('java',['-cp',path.join(sdk,'build-tools/35.0.0/lib/d8.jar'),'com.android.tools.r8.D8','--min-api','26','--lib',path.join(platform,'android.jar'),'--output',dex,input]);
 await run('jar',['cf',jar,'-C',dex,'classes.dex']);await writeFile(path.join(output,'digest.txt'),digest);return jar;
}
export async function createAndroidDump(command){
 preparing??=prepare();const jar=await preparing;
 await command(['push',jar,'/data/local/tmp/wildfall-fast-dump.jar']);
 const prefix=['shell','env','CLASSPATH=/system/framework/android.test.runner.jar:/system/framework/android.test.base.jar:/system/framework/uiautomator.jar:/data/local/tmp/wildfall-fast-dump.jar','app_process','/system/bin','com.android.commands.uiautomator.Launcher','runtest'];
 const valid=result=>result.includes('OK (1 test)')&&!/aborted|FAILURES|unexpected exception/.test(result);
 const snapshot=async()=>{
  await command(['shell','rm','-f','/data/local/tmp/wildfall-fast.xml']);
  const result=await command([...prefix,'-c','com.ashenvalley.wildfall.qa.FastDump','-e','jars','/data/local/tmp/wildfall-fast-dump.jar']);
  if(!valid(result))throw new Error('Accessibility snapshot failed: '+result.slice(0,400)+result.slice(-650));
  const start=result.indexOf('WILDFALL_XML_BEGIN'),end=result.indexOf('WILDFALL_XML_END');
  if(start<0||end<start)throw new Error('Missing fresh accessibility XML: '+result.slice(-700));
  return result.slice(start+'WILDFALL_XML_BEGIN'.length,end);
 };
 return snapshot;
}
