import {normalizeRecord,normalizeSettings,clampProgress} from './core.mjs';
const $=id=>document.getElementById(id);
let config={},session=null,busy=false;
function state(message){$('status').textContent=message;for(const id of ['upload','restore'])$(id).disabled=busy||!session;}
async function request(path,body,method='POST',authenticated=false){
  const response=await fetch(config.url+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+session.access_token}:{}),Prefer:'resolution=merge-duplicates'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw Error('服务器返回了无效数据');}
  if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'请求失败 '+response.status);
  return data;
}
async function authorize(){
  if(!session)throw Error('请先登录');
  if(session.expires_at*1000<Date.now()+60000){
    session=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});
    await chrome.storage.session.set({nr_cloud_session:session});
  }
}
async function run(fn){if(busy)return;busy=true;state('处理中…');try{await fn();}catch(e){state('失败：'+e.message);}finally{busy=false;state($('status').textContent);}}
$('login').onsubmit=e=>{e.preventDefault();void run(async()=>{
  const url=new URL($('url').value.trim());
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.search||url.hash||url.port||url.username||url.password)throw Error('请输入 https://项目编号.supabase.co 格式的项目地址');
  const key=$('key').value.trim();
  if(!key.startsWith('sb_publishable_')){let role;try{role=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;}catch{}if(role!=='anon')throw Error('只能使用 publishable 或 anon key');}
  const allowed=await chrome.permissions.request({origins:[url.origin+'/*']});if(!allowed)throw Error('需要允许连接该 Supabase 项目');
  session=null;await chrome.storage.session.remove('nr_cloud_session');
  config={url:url.origin,key,email:$('email').value.trim()};
  try{session=await request('/auth/v1/token?grant_type=password',{email:config.email,password:$('password').value});}finally{$('password').value='';}
  await chrome.storage.local.set({nr_cloud_config:config});await chrome.storage.session.set({nr_cloud_session:session});state('已登录，可上传或恢复数据');
});};
$('upload').onclick=()=>{if(!confirm('将用本机数据覆盖当前账号的云端备份，继续吗？'))return;void run(async()=>{
  await authorize();const data=await chrome.storage.local.get(['nr_records','nr_progress','nr_settings']);
  await request('/rest/v1/niche-radar-backups?on_conflict=niche-radar-user-id',{'niche-radar-user-id':session.user.id,'niche-radar-data':{records:data.nr_records||[],progress:data.nr_progress||{},settings:normalizeSettings(data.nr_settings)},'niche-radar-updated-at':new Date().toISOString()},'POST',true);state('云端保存成功 · '+new Date().toLocaleString());
});};
$('restore').onclick=()=>void run(async()=>{
  await authorize();const rows=await request('/rest/v1/niche-radar-backups?select=*&niche-radar-user-id=eq.'+encodeURIComponent(session.user.id),null,'GET',true);
  if(!rows?.length)throw Error('当前账号还没有云端备份');const data=rows[0]['niche-radar-data'];
  if(!data||!Array.isArray(data.records)||data.records.length>20000)throw Error('云端数据格式无效');
  if(!confirm(`将用云端的 ${data.records.length} 条线索及进度、时长替换本机数据，并结束当前计时。继续吗？`)){state('已取消恢复');return;}
  const old=await chrome.storage.local.get(['nr_records','nr_progress','nr_settings','nr_timer']);
  await chrome.storage.local.set({nr_before_cloud_restore:{...old,savedAt:new Date().toISOString()}});
  if(old.nr_timer){const result=await chrome.runtime.sendMessage({type:'NR_TIMER_ACTION',action:'finish',taskId:old.nr_timer.taskId});if(!result?.ok)throw Error('无法结束本机计时，请重试');}
  await chrome.storage.local.set({nr_records:data.records.map(normalizeRecord).filter(r=>r.keyword),nr_progress:clampProgress(data.progress),nr_settings:normalizeSettings(data.settings)});state('恢复成功，原本机数据已保留在本地恢复备份中');
});
$('logout').onclick=()=>void run(async()=>{session=null;await chrome.storage.session.remove('nr_cloud_session');state('已退出登录');});
const stored=await chrome.storage.local.get('nr_cloud_config');config=stored.nr_cloud_config||{url:'https://okcbgjudvftfzgcmqqrw.supabase.co',key:'sb_publishable_xh4L_KvmfPWhG1VXk2aOhg_ghN0Bejn'};
for(const id of ['url','key','email'])$(id).value=config[id]||'';
session=(await chrome.storage.session.get('nr_cloud_session')).nr_cloud_session||null;state(session?'已登录，可上传或恢复数据':'请登录；关闭浏览器后需重新登录');
