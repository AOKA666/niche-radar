import {TASKS} from './core.mjs';
const taskId=new URLSearchParams(location.search).get('task');
document.getElementById('task').textContent=TASKS.find(t=>t.id===taskId)?.title||'当前任务';
document.getElementById('dismiss').onclick=()=>window.close();
document.getElementById('open').onclick=async()=>{
  try{await chrome.tabs.create({url:chrome.runtime.getURL('sidepanel.html')});window.close();}
  catch{document.getElementById('error').textContent='打开失败，请点击工具栏中的插件图标。';}
};
