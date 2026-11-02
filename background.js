import {TASKS, DEFAULT_MINUTES, normalizeSettings, normalizeTimer, timerRemainingMs, localDayKey, normalizeMinutes} from './core.mjs';

// The service worker is the single writer for timer changes. It survives UI closure
// because its wake-up is scheduled through chrome.alarms, never setInterval.
const TIMER_ALARM = 'nr-task-countdown';
const TIMER_NOTIFICATION = 'nr-task-time-up';
let operation = Promise.resolve();
const queue = fn => {
  const result=operation.then(fn);
  operation=result.catch(err=>console.error('Niche Radar timer error:',err));
  return result;
};

const TIMER_MENU = 'nr-toggle-timer';
async function syncTimerMenu(timer){
  const properties={title:timer?.status==='paused'?'继续倒计时':'暂停倒计时',enabled:['running','paused'].includes(timer?.status)};
  try{await chrome.contextMenus.update(TIMER_MENU,properties);}
  catch{await new Promise((resolve,reject)=>chrome.contextMenus.create({id:TIMER_MENU,contexts:['action'],...properties},()=>{const error=chrome.runtime.lastError;error?reject(new Error(error.message)):resolve();}));}
}

const BADGE_ALARM = 'nr-timer-badge';
async function updateBadge(timer){
  const minutes=Math.ceil(timerRemainingMs(timer)/60000);
  const text=!timer?'':timer.status==='expired'?'到点':minutes<1?'<1m':`${minutes}m`;
  await chrome.action.setBadgeText({text});
  await chrome.action.setBadgeBackgroundColor({color:timer?.status==='expired'?'#ba3928':timer?.status==='paused'?'#946b20':'#1c6c58'});
  await chrome.action.setTitle({title:!timer?'打开 Niche Radar 每日需求清单':`${TASKS.find(t=>t.id===timer.taskId)?.title} · ${timer.status==='expired'?'时间已到':timer.status==='paused'?'已暂停':'剩余'} ${text}`});
}

async function notifyExpired(taskId){
  const task=TASKS.find(t=>t.id===taskId);
  // Window and system notification are independent: either may fail on its own.
  await Promise.allSettled([
    chrome.windows.create({url:chrome.runtime.getURL('reminder.html')+'?task='+encodeURIComponent(taskId),type:'popup',width:440,height:330,focused:true}),
    chrome.notifications.create(TIMER_NOTIFICATION,{
    type:'basic',iconUrl:'icons/icon128.png',
    title:'⏰ 本项任务时间到了',
    message:`「${task?.title||'当前任务'}」计划时间已用完。可标记完成，或加 5 分钟继续。`,
    requireInteraction:true,priority:2
  })]).then(results=>{for(const result of results)if(result.status==='rejected')console.error('Timer reminder failed:',result.reason);});
}

async function scheduleTimer(timer){
  await chrome.alarms.clear(TIMER_ALARM);
  await chrome.alarms.clear(BADGE_ALARM);
  await updateBadge(timer);
  await syncTimerMenu(timer);
  if(timer?.status==='running'){
    await chrome.alarms.create(BADGE_ALARM,{periodInMinutes:1});
    await chrome.alarms.create(TIMER_ALARM,{when:Math.max(Date.now()+1000,timer.endAt)});
  }
}

async function expireIfNeeded(){
  const data=await chrome.storage.local.get('nr_timer');
  const timer=normalizeTimer(data.nr_timer);
  if(timer?.status==='running' && timer.endAt<=Date.now()){
    const expired={...timer,status:'expired',remainingMs:0,endAt:null};
    await chrome.storage.local.set({nr_timer:expired});
    await scheduleTimer(expired);
    await notifyExpired(timer.taskId);
    return expired;
  }
  return timer;
}

async function reconcile(){
  // Remove v1 wall-clock alarms: this version only alerts when a task timer expires.
  await chrome.alarms.clear('nr-daily');
  await chrome.alarms.clear('nr-weekly');
  const timer=await expireIfNeeded();
  await scheduleTimer(timer);
}

async function act(message){
  const data=await chrome.storage.local.get(['nr_timer','nr_settings']);
  const settings=normalizeSettings(data.nr_settings);
  let timer=normalizeTimer(data.nr_timer);
  const now=Date.now();

  if(message.type==='NR_RESET_DURATIONS'){
    await chrome.storage.local.set({nr_settings:{taskMinutes:{...DEFAULT_MINUTES}}});
    // Intentionally preserve any running timer: resetting defaults must not interrupt work.
    return {ok:true};
  }
  if(message.type==='NR_SET_DURATION'){
    const task=TASKS.find(t=>t.id===message.taskId);
    const value=Number(message.minutes);
    if(!task || !Number.isInteger(value)||value<1||value>240)return {ok:false,error:'计划时长须为 1—240 分钟'};
    const old=settings.taskMinutes[task.id];
    settings.taskMinutes[task.id]=value;
    if(timer?.taskId===task.id && timer.status!=='expired'){
      const next=timerRemainingMs(timer,now)+(value-old)*60000;
      if(next<=0){
        timer={...timer,status:'expired',endAt:null,remainingMs:0};
        await chrome.storage.local.set({nr_settings:settings,nr_timer:timer});
        await scheduleTimer(timer);
        await notifyExpired(timer.taskId);
        return {ok:true};
      }
      timer={...timer,remainingMs:next,endAt:timer.status==='running'?now+next:null};
      await chrome.storage.local.set({nr_settings:settings,nr_timer:timer});
      await scheduleTimer(timer);
      return {ok:true};
    }
    await chrome.storage.local.set({nr_settings:settings});
    return {ok:true};
  }

  if(message.type!=='NR_TIMER_ACTION')return {ok:false,error:'未知操作'};
  const taskId=String(message.taskId||'');
  if(!TASKS.some(t=>t.id===taskId))return {ok:false,error:'任务不存在'};
  const action=message.action;
  if(action==='start'||action==='reset'){
    const remainingMs=settings.taskMinutes[taskId]*60000;
    timer={taskId,status:'running',endAt:now+remainingMs,remainingMs,dayKey:localDayKey()};
  } else if(action==='pause'){
    if(timer?.taskId!==taskId||timer.status!=='running')return {ok:false,error:'任务未运行'};
    // At the exact deadline, do not allow pause to suppress the alarm.
    const remainingMs=timerRemainingMs(timer,now);
    if(remainingMs<=0){
      timer={...timer,status:'expired',endAt:null,remainingMs:0};
      await chrome.storage.local.set({nr_timer:timer});
      await scheduleTimer(timer);
      await notifyExpired(taskId);
      return {ok:true};
    }
    timer={...timer,status:'paused',endAt:null,remainingMs};
  } else if(action==='resume'){
    if(timer?.taskId!==taskId||timer.status!=='paused')return {ok:false,error:'任务未暂停'};
    timer={...timer,status:'running',endAt:now+timer.remainingMs};
  } else if(action==='extend'){
    if(timer?.taskId!==taskId || !['running','paused','expired'].includes(timer.status))return {ok:false,error:'请先开始任务'};
    const minutes=normalizeMinutes(message.minutes,5);
    const remainingMs=timerRemainingMs(timer,now)+minutes*60000;
    timer={...timer,status:'running',remainingMs,endAt:now+remainingMs};
  } else if(action==='finish'){
    if(timer?.taskId===taskId)timer=null;
    else return {ok:true};
  } else return {ok:false,error:'未知计时操作'};

  await chrome.storage.local.set({nr_timer:timer});
  await scheduleTimer(timer);
  return {ok:true};
}

chrome.runtime.onInstalled.addListener(()=>{
  void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
  void queue(reconcile);
});
chrome.runtime.onStartup.addListener(()=>{void queue(reconcile);});
void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
void queue(reconcile);

chrome.alarms.onAlarm.addListener(alarm=>{
  if(alarm.name===BADGE_ALARM)void queue(async()=>{await updateBadge(await expireIfNeeded());});
  if(alarm.name===TIMER_ALARM)void queue(async()=>{
    const timer=await expireIfNeeded();
    if(timer?.status==='running')await scheduleTimer(timer);
  });
});
chrome.notifications.onClicked.addListener(id=>{
  if(id===TIMER_NOTIFICATION || id==='nr-test-notification'){
    void chrome.tabs.create({url:chrome.runtime.getURL('sidepanel.html')});
    void chrome.notifications.clear(id);
  }
});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==='NR_TEST_NOTIFICATION'){
    chrome.notifications.create('nr-test-notification',{
      type:'basic',iconUrl:'icons/icon128.png',title:'Niche Radar · 计时提醒测试',
      message:'测试成功。开始任务后，到了该项任务的设定分钟数会收到提醒。',priority:1
    }).then(()=>sendResponse({ok:true})).catch(error=>sendResponse({ok:false,error:String(error)}));
    return true;
  }
  if(['NR_TIMER_ACTION','NR_SET_DURATION','NR_RESET_DURATIONS'].includes(message?.type)){
    queue(()=>act(message)).then(sendResponse).catch(error=>sendResponse({ok:false,error:String(error)}));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(info=>{
  if(info.menuItemId!==TIMER_MENU)return;
  void queue(async()=>{
    const timer=await expireIfNeeded();
    if(!timer||!['running','paused'].includes(timer.status))return;
    await act({type:'NR_TIMER_ACTION',taskId:timer.taskId,action:timer.status==='paused'?'resume':'pause'});
  });
});
