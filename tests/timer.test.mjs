import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings,normalizeTimer,timerRemainingMs,formatCountdown,totalPlannedMinutes,TASKS} from '../core.mjs';

test('task plan minutes default to 90, validate bounds, preserve valid changes',()=>{
  const s=normalizeSettings({taskMinutes:{trends:25,discovery:0,suggest:999}});
  assert.equal(s.taskMinutes.trends,25);
  assert.equal(s.taskMinutes.discovery,8);
  assert.equal(s.taskMinutes.suggest,5);
  assert.equal(totalPlannedMinutes(s),103);
  assert.equal(TASKS.length,7);
});
test('countdown format, pause and stored timer normalization',()=>{
  assert.equal(formatCountdown(1500000),'25:00');
  assert.equal(formatCountdown(1499050),'25:00');
  assert.equal(formatCountdown(0),'00:00');
  const paused=normalizeTimer({taskId:'products',status:'paused',remainingMs:54000,endAt:null,dayKey:'2026-11-01'});
  assert.equal(timerRemainingMs(paused,800000),54000);
  const running=normalizeTimer({taskId:'products',status:'running',endAt:250000,remainingMs:60000,dayKey:'2026-11-01'});
  assert.equal(timerRemainingMs(running,220000),30000);
  assert.equal(timerRemainingMs(running,260000),0);
  assert.equal(normalizeTimer({taskId:'fake',status:'running',endAt:10000,remainingMs:10000}),null);
});

test('background schedules, pauses, resumes, adjusts duration and alerts on completion',async()=>{
  const realNow=Date.now;
  let time=1000000;
  Date.now=()=>time;
  const saved={};
  const alarms=new Map();
  const notifications=[];
  const windows=[];
  let badge="";
  let menu;
  const listeners={onMenuClicked:[],onMessage:[],onAlarm:[],onInstalled:[],onStartup:[],onClicked:[]};
  const event=name=>({addListener(fn){listeners[name].push(fn);}});
  globalThis.chrome={
    storage:{local:{async get(keys){const names=Array.isArray(keys)?keys:[keys];return Object.fromEntries(names.map(k=>[k,saved[k]]));},async set(obj){Object.assign(saved,obj);}},onChanged:event('onStartup')},
    contextMenus:{async update(id,props){if(!menu)throw Error('missing');Object.assign(menu,props);},create(props,callback){menu=props;callback();},onClicked:event('onMenuClicked')},
    sidePanel:{async setPanelBehavior(){}},
    alarms:{async clear(n){return alarms.delete(n);},async create(n,info){alarms.set(n,info);},async get(n){return alarms.get(n);},onAlarm:event('onAlarm')},
    notifications:{async create(id,data){notifications.push({id,data});return id;},async clear(){},onClicked:event('onClicked')},
    runtime:{onInstalled:event('onInstalled'),onStartup:event('onStartup'),onMessage:event('onMessage'),getURL(p){return p;}},
    action:{async setBadgeText({text}){badge=text;},async setBadgeBackgroundColor(){},async setTitle(){}},
    windows:{async create(options){windows.push(options);}},
    tabs:{async create(){}},
  };
  try{
    await import('../background.js?timerTest='+time);
    // Give the service-worker bootstrap time to reconcile old alarms.
    await new Promise(resolve=>setImmediate(resolve));
    const send=(message)=>new Promise(resolve=>{
      assert.equal(listeners.onMessage[0](message,{},resolve),true);
    });
    assert.equal((await send({type:'NR_TIMER_ACTION',action:'start',taskId:'products'})).ok,true);
    assert.equal(badge, '20m');
    assert.equal(windows.length,0,'no window while counting down');
    assert.equal(saved.nr_timer.status,'running');
    assert.equal(alarms.get('nr-task-countdown').when,time+20*60000);
    time+=5*60000;
    assert.equal(menu.title,'暂停倒计时');
    listeners.onMenuClicked[0]({menuItemId:'nr-toggle-timer'});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(saved.nr_timer.status,'paused');
    assert.equal(menu.title,'继续倒计时');
    assert.equal(saved.nr_timer.remainingMs,15*60000);
    assert.equal(alarms.has('nr-task-countdown'),false);
    assert.equal((await send({type:'NR_SET_DURATION',taskId:'products',minutes:25})).ok,true);
    assert.equal(saved.nr_settings.taskMinutes.products,25);
    assert.equal(saved.nr_timer.remainingMs,20*60000);
    time+=60000;
    listeners.onMenuClicked[0]({menuItemId:'nr-toggle-timer'});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(saved.nr_timer.status,'running');
    assert.equal(menu.title,'暂停倒计时');
    assert.equal(alarms.get('nr-task-countdown').when,time+20*60000);
    time+=20*60000+1000;
    listeners.onAlarm[0]({name:'nr-task-countdown'});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(saved.nr_timer.status,'expired');
    assert.equal(badge,'到点');
    assert.equal(menu.enabled,false);
    assert.equal(windows.length,1);
    assert.equal(windows[0].focused,true);
    assert.equal(windows[0].type,'popup');
    assert.match(windows[0].url,/reminder.html\?task=products/);
    assert.equal(notifications.length,1);
    assert.match(notifications[0].data.message,/从真实小产品发现需求/);
    listeners.onAlarm[0]({name:'nr-task-countdown'});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(notifications.length,1,'no duplicate notifications after timer expires');
    assert.equal(windows.length,1,'no duplicate reminder window');
    assert.equal((await send({type:'NR_TIMER_ACTION',action:'extend',taskId:'products',minutes:5})).ok,true);
    assert.equal(saved.nr_timer.status,'running');
    assert.equal(alarms.get('nr-task-countdown').when,time+5*60000);
    await send({type:'NR_TIMER_ACTION',action:'finish',taskId:'products'});
    assert.equal(saved.nr_timer,null);
    assert.equal(menu.enabled,false);
    assert.equal(badge,'');
    assert.equal(alarms.has('nr-timer-badge'),false);
    assert.equal(alarms.has('nr-task-countdown'),false);
    await send({type:'NR_TIMER_ACTION',action:'start',taskId:'trends'});
    time+=60000;
    await send({type:'NR_TIMER_ACTION',action:'pause',taskId:'trends'});
    time+=120000;
    await send({type:'NR_TIMER_ACTION',action:'resume',taskId:'trends'});
    time+=30000;
    await send({type:'NR_TIMER_ACTION',action:'complete',taskId:'trends'});
    assert.equal(saved.nr_time_history.at(-1).actualMs,90000);
    assert.equal(saved.nr_time_history.at(-1).plannedMs,12*60000);
    assert.ok(saved.nr_progress[saved.nr_time_history.at(-1).dayKey].includes('trends'));
    assert.equal(saved.nr_timer,null);
  }finally{
    Date.now=realNow;
    delete globalThis.chrome;
  }
});
