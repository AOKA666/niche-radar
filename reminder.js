import {TASKS} from './core.mjs';
const taskId=new URLSearchParams(location.search).get('task');
document.getElementById('task').textContent=TASKS.find(t=>t.id===taskId)?.title||'当前任务';
document.getElementById('dismiss').onclick=()=>window.close();
document.getElementById('open').onclick=async()=>{
  try{await chrome.tabs.create({url:chrome.runtime.getURL('sidepanel.html')});window.close();}
  catch{document.getElementById('error').textContent='打开失败，请点击工具栏中的插件图标。';}
};

for(const action of ['extend','complete'])document.getElementById(action).onclick=async()=>{
 const minutes=Number(document.getElementById('minutes').value);
 if(action==='extend'&&(!Number.isInteger(minutes)||minutes<1||minutes>240)){document.getElementById('error').textContent='请输入 1—240 的整数分钟';return;}
 try{const result=await chrome.runtime.sendMessage({type:'NR_TIMER_ACTION',taskId,action,minutes});if(!result?.ok)throw Error(result?.error||'操作失败');window.close();}catch(e){document.getElementById('error').textContent=e.message;}
};
