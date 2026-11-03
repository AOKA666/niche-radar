import {weeklyPlan} from './core.mjs';
import {TASKS, DAY_NAMES, NEW_SOURCES,OLD_SOURCES,SOURCE_OPTIONS,DEFAULT_SETTINGS,localDayKey,dayLabel,normalizeRecord,recordsToCSV,clampProgress,safeExternalUrl,normalizeSettings,normalizeTimer,timerRemainingMs,formatCountdown,totalPlannedMinutes} from './core.mjs';

const $=sel=>document.querySelector(sel);
const main=$('#main');
let view='today';
let entries=[];
let progress={};
let settings=normalizeSettings();
let timer=null;
let timeHistory=[];
let filter={query:'',type:'全部',grade:'全部'};
let editor={open:false,id:null,prefill:{}};
let expandedTask=null;
let toastTimer;

function h(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function weekdaysText(){return DAY_NAMES[new Date().getDay()];}
function todayCompleted(){return progress[localDayKey()]||[];}
function todayEntries(){return entries.filter(r=>r.date===localDayKey());}
function gradeMarkup(g){return `<span class="grade grade-${h(g)}">${h(g)}</span>`;}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function openUrl(url){const safe=safeExternalUrl(url);if(safe)void chrome.tabs.create({url:safe});else toast('此链接不安全或无效');}
function show(v){view=v;document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.nav===v;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});render();window.scrollTo(0,0);}
async function saveEntries(){await chrome.storage.local.set({nr_records:entries});}
async function saveProgress(){await chrome.storage.local.set({nr_progress:progress});}
function button(txt,action,other=''){return `<button type="button" class="btn ${other}" data-action="${action}">${txt}</button>`;}
function taskSource(id){
 const day=new Date().getDay();
 const s=id==='discovery'?NEW_SOURCES[day]:id==='products'?OLD_SOURCES[day]:null;
 if(!s)return null;
 if(id==='discovery' && s.source==='GitHub'){
   const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
   return {...s,url:'https://github.com/search?q='+encodeURIComponent('agent created:>'+localDayKey(cutoff)+' stars:>20')+'&type=repositories'};
 }
 return s;
}
function taskSourceButtons(task){const sources=[...task.links];const chosen=taskSource(task.id);if(chosen)sources.unshift([chosen.label,chosen.url]);if(task.id==='products'&&new Date().getDay()===3)sources.push(['Shopify App Store','https://apps.shopify.com/'],['WordPress Plugins','https://wordpress.org/plugins/']);return sources.map(([label,url])=>`<button class="resource-link" data-open-url="${h(url)}">${h(label)} ↗</button>`).join('');}
function taskTimerMarkup(task){
 const active=timer?.taskId===task.id;
 const mins=settings.taskMinutes[task.id];
 const status=active?timer.status:'idle';
 let controls='';
 if(status==='running') controls=`${button('⏸ 暂停','timer-pause-'+task.id,'secondary small')}${button('↺ 重置','timer-reset-'+task.id,'ghost small')}`;
 else if(status==='paused') controls=`${button('▶ 继续','timer-resume-'+task.id,'small')}${button('↺ 重置','timer-reset-'+task.id,'secondary small')}`;
 else if(status==='expired') controls=`${button('自定义延长','timer-extend-'+task.id,'small')}${button('↺ 重来','timer-reset-'+task.id,'secondary small')}`;
 else controls=button('▶ 开始计时','timer-start-'+task.id,'small');
 if(active)controls+=button('✓ 完成','timer-complete-'+task.id,'secondary small');
 const last=timeHistory.filter(r=>r.taskId===task.id&&r.dayKey===localDayKey()).at(-1);
 const remaining=active?formatCountdown(timerRemainingMs(timer)):formatCountdown(mins*60000);
 const stateLabel=active?({running:'计时中',paused:'已暂停',expired:'时间已到'}[status]):'待开始';
 return `<div class="task-timer ${active?'timer-active':''} ${status==='expired'?'timer-expired':''}">
 <label class="minute-editor" for="task-min-${task.id}">计划 <input id="task-min-${task.id}" class="minute-input" data-minute-id="${task.id}" type="number" min="1" max="240" step="1" value="${mins}" aria-label="${h(task.title)}计划时长（分钟）"> 分钟</label>
 <div class="timer-time"><span class="timer-readout" data-timer-readout="${task.id}">${remaining}</span><span class="timer-state">${stateLabel}</span></div>
 <div class="timer-controls">${controls}</div>${last?`<p class="hint">预计 ${formatCountdown(last.plannedMs)} · 实际 ${formatCountdown(last.actualMs)} · 完成于 ${h(new Date(last.completedAt).toLocaleTimeString())}</p>`:''}
 </div>`;
}
function renderToday(){
 const plan=weeklyPlan();
 const todayTasks=TASKS.filter(t=>plan.ids.includes(t.id)||timer?.taskId===t.id);
 const done=todayCompleted(),count=todayTasks.filter(t=>done.includes(t.id)).length,todays=todayEntries(),planned=todayTasks.reduce((n,t)=>n+settings.taskMinutes[t.id],0);
 const minutes=todayTasks.filter(t=>done.includes(t.id)).reduce((a,t)=>a+settings.taskMinutes[t.id],0);
 const sections=[['新词阶段','新词'],['老词阶段','老词'],['统一验证','验证'],['归档','归档']];
 const stats={new:todays.filter(r=>r.type==='新词').length,old:todays.filter(r=>r.type==='老词').length};
 const blocks=sections.filter(([,phase])=>todayTasks.some(t=>t.phase===phase)).map(([title,phase])=>{
 const phaseMinutes=todayTasks.filter(t=>t.phase===phase).reduce((n,t)=>n+settings.taskMinutes[t.id],0);
 return `<div class="section-head"><h3>${title} · ${phaseMinutes} 分钟</h3><small>${phase==='新词'?'趋势 + 新技术':phase==='老词'?'盈利小产品 + 工具目录':phase==='验证'?'用证据排除伪需求':'留下下一步行动'}</small></div>`+
 todayTasks.filter(t=>t.phase===phase).map(t=>{
 const complete=done.includes(t.id),isOpen=expandedTask===t.id,source=taskSource(t.id);
 return `<article class="task-card ${complete?'complete':''} ${timer?.taskId===t.id?'timer-current':''}">
 <div class="task-primary"><input type="checkbox" class="task-check" data-task="${t.id}" ${complete?'checked':''} aria-label="完成：${h(t.title)}" />
 <div class="task-body"><div class="task-name">${h(t.title)}</div><div class="task-meta"><span>默认 ${t.minutes} 分钟</span>${source?`<span>· 今天：${h(source.label)}</span>`:''}</div></div>
 <button class="small-link" data-expand="${t.id}" aria-expanded="${isOpen}">${isOpen?'收起 ↑':'步骤 ↓'}</button></div>
 ${taskTimerMarkup(t)}
 ${isOpen?`<div class="task-expanded"><p>${h(t.tip)}</p><ol class="instruction-list">${t.steps.map(s=>`<li>${h(s)}</li>`).join('')}</ol><div class="resource-bar">${taskSourceButtons(t)}</div><div class="more-actions">${button('＋ 记录本阶段线索','add-from-'+t.id,'secondary small')}</div></div>`:''}</article>`;
 }).join('');
 }).join('');
 const activeTask=timer&&TASKS.find(t=>t.id===timer.taskId);
 const activeLine=activeTask?`<div class="active-timer-summary"><div><div class="active-timer-label">${timer.status==='expired'?'⏰ 时间已到':timer.status==='paused'?'⏸ 已暂停':'⏱ 当前计时'} · ${h(activeTask.title)}</div><strong data-active-countdown>${formatCountdown(timerRemainingMs(timer))}</strong></div>${timer.status==='running'?button('暂停','timer-pause-'+timer.taskId,'secondary small'):timer.status==='paused'?button('继续','timer-resume-'+timer.taskId,'small'):button('自定义延长','timer-extend-'+timer.taskId,'small')}</div>`:
 '<div class="active-timer-intro">点击下方任一任务的「开始计时」，才会启动倒计时；不会每天固定时间提醒。</div>';
 return `<div class="page-header"><div><div class="eyebrow">DAILY RESEARCH</div><h1 class="page-title">今天挖什么？</h1><p class="page-sub">${h(dayLabel())} · 每项任务独立计时，时间可修改</p></div></div>
 <section class="hero"><div class="micro">TODAY'S RESEARCH ROUTINE</div><h2>${minutes}<span>/ ${planned} 分钟计划</span></h2><p>新词看趋势，老词看真实产品。任务计时到点会弹出提醒。</p><div class="hero-progress"><div style="width:${Math.round(count/todayTasks.length*100)}%"></div></div><div class="hero-foot"><span>已完成 ${count} / ${todayTasks.length} 项</span><span>${Math.round(count/todayTasks.length*100)}%</span></div></section>
 <div class="live-timer-panel">${activeLine}</div>
 <div class="metric-row"><div class="metric"><strong>${stats.new}</strong><span>今日新词线索</span></div><div class="metric"><strong>${stats.old}</strong><span>今日老词线索</span></div><div class="metric"><strong>${todays.filter(r=>r.grade==='A').length}</strong><span>今日 A 级机会</span></div></div>
 <div class="notice">⏱ 修改任一任务的分钟数后会自动保存。任务到点后提醒一次，你可以标记完成、自定义延长或提前完成。</div>
 ${blocks}<div class="button-row spaced">${button('＋ 记录一条线索','add-record')}${button('查看线索库','go-records','secondary')}</div>`;
}
function renderRecords(){
 const q=filter.query.trim().toLocaleLowerCase();
 const filtered=entries.filter(r=>(filter.type==='全部'||r.type===filter.type)&&(filter.grade==='全部'||r.grade===filter.grade)&&(!q||[r.keyword,r.source,r.userNeed,r.notes].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
 return `<div class="page-header"><div><div class="eyebrow">OPPORTUNITY LIBRARY</div><h1 class="page-title">线索库 <span style="color:#96a7ab">${entries.length}</span></h1><p class="page-sub">记录关键词、产品、搜索信号与验证结论</p></div></div>
 <div class="button-row">${button('＋ 新建线索','add-record')}${button('导出 CSV','export-csv','secondary small')}${button('导出 JSON','export-json','secondary small')}</div>
 ${editor.open?renderEditor():''}
 <div class="filter-row"><input class="filter-input" data-filter="query" aria-label="搜索关键词" placeholder="搜索关键词 / 用户场景…" value="${h(filter.query)}" />
 <select data-filter="type" aria-label="筛选类型">${['全部','新词','老词'].map(x=>`<option ${filter.type===x?'selected':''}>${x}</option>`).join('')}</select>
 <select data-filter="grade" aria-label="筛选评级">${['全部','A','B','C','待定'].map(x=>`<option ${filter.grade===x?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="records-head"><div class="hint">共 ${filtered.length} 条符合条件 · A：${entries.filter(x=>x.grade==='A').length} / B：${entries.filter(x=>x.grade==='B').length}</div></div>
 <div class="records-list">${filtered.length?filtered.map(renderRecord).join(''):`<div class="empty"><div class="empty-icon">◌</div>还没有符合条件的线索。<br/>从今天的清单打开网站，发现机会后记录在这里。</div>`}</div>`;
}
function renderRecord(r){return `<article class="record-card"><div class="record-top"><strong>${h(r.keyword)}</strong>${gradeMarkup(r.grade)}<span class="mini-tag">${h(r.type)}</span></div>
 <div class="record-meta"><span>${h(r.date)}</span><span>· ${h(r.source)}</span>${r.reviewDate?`<span>· 复查：${h(r.reviewDate)}</span>`:''}</div>
 ${r.userNeed?`<div class="record-text"><strong>需求：</strong>${h(r.userNeed)}</div>`:''}
 ${r.searchEvidence?`<div class="record-text"><strong>搜索证据：</strong>${h(r.searchEvidence)}</div>`:''}
 <div class="record-actions"><button data-edit="${h(r.id)}">编辑</button>${r.url?`<button data-open-url="${h(r.url)}">查看来源 ↗</button>`:''}<button data-delete="${h(r.id)}" class="right" style="color:#ac5961">删除</button></div></article>`;}
function selectField(name,options,selected){return `<select name="${name}">${options.map(x=>`<option value="${h(x)}" ${x===selected?'selected':''}>${h(x)}</option>`).join('')}</select>`;}
function renderEditor(){
 const rec=entries.find(x=>x.id===editor.id)||editor.prefill||{};
 return `<section class="card spaced" id="editor-card"><div class="records-head"><h3 class="card-heading">${editor.id?'编辑线索':'新建线索'}</h3><button class="small-link" data-action="close-editor">关闭 ×</button></div>
 <form id="record-form">
 <div class="field"><label>关键词 / 产品名称 <span class="required">*</span></label><input name="keyword" placeholder="例：某项具体任务 / 工具名称" value="${h(rec.keyword)}" maxlength="240" required autofocus /></div>
 <div class="field-row"><div class="field"><label>类型</label>${selectField('type',['新词','老词'],rec.type||'新词')}</div><div class="field"><label>来源</label>${selectField('source',SOURCE_OPTIONS,rec.source||'Google Trends')}</div></div>
 <div class="field"><label>原始来源链接</label><input name="url" type="url" placeholder="https://…" value="${h(rec.url)}" /></div>
 <div class="field"><label>目标用户 / 具体任务</label><textarea name="userNeed" placeholder="谁在什么场景，要完成什么工作？">${h(rec.userNeed)}</textarea></div>
 ${[['product','对标产品（名称，网址填写来源 URL）'],['targetUser','目标用户'],['demandStrength','需求强度（频率 / 重要性）']].map(([name,label])=>`<div class="field"><label>${label}</label><input name="${name}" value="${h(rec[name])}" /></div>`).join('')}
 <div class="field"><label>真实搜索信号</label><textarea name="searchEvidence" placeholder="Trends 增长、自动补全、Search Console 曝光等；没证据就写“待验证”">${h(rec.searchEvidence)}</textarea></div>
 <div class="field"><label>Google SERP / 竞争切口</label><textarea name="competition" placeholder="前 10 名有什么专用工具？是否有可进入的细分场景？">${h(rec.competition)}</textarea></div>
 <div class="field"><label>付费证据</label><textarea name="payment" placeholder="竞品价格、营收指标的口径、付费试点等">${h(rec.payment)}</textarea></div>
 <div class="field"><label>开发成本和风险</label><textarea name="risk" placeholder="API 成本、数据依赖、平台审核、SEO 难度…">${h(rec.risk)}</textarea></div>
 <div class="field-row"><div class="field"><label>结论（A 继续 / B 待观察 / C 放弃）</label>${selectField('grade',['待定','A','B','C'],rec.grade||'待定')}</div><div class="field"><label>复查日期（可选）</label><input type="date" name="reviewDate" value="${h(rec.reviewDate)}" /></div></div>
 <div class="field"><label>备注</label><textarea name="notes" placeholder="下一步要验证什么？">${h(rec.notes)}</textarea></div>
 <div class="button-row"><button class="btn" type="submit">${editor.id?'保存修改':'保存线索'}</button>${button('取消','close-editor','secondary')}</div>
 </form></section>`;
}
function recentDates(num){const days=[];for(let i=0;i<num;i++){const d=new Date();d.setDate(d.getDate()-i);days.push(localDayKey(d));}return days;}
function renderInsights(){
 const dates=recentDates(7),inWeek=entries.filter(x=>dates.includes(x.date));
 const doneDays=dates.filter(d=>weeklyPlan(new Date(d+'T12:00:00')).ids.every(id=>(progress[d]||[]).includes(id))).length;
 const sources=[...new Set(entries.map(x=>x.source))].map(s=>[s,entries.filter(x=>x.source===s).length]).sort((a,b)=>b[1]-a[1]).slice(0,7);
 const toReview=entries.filter(x=>x.grade==='B'&&x.reviewDate&&x.reviewDate<=localDayKey()).sort((a,b)=>a.reviewDate.localeCompare(b.reviewDate));
 return `<div class="page-header"><div><div class="eyebrow">WEEKLY PULSE</div><h1 class="page-title">数据概览</h1><p class="page-sub">看哪些来源真正产出机会，而不是只看关键词数量</p></div></div>
 <div class="summary-grid"><div class="metric"><strong>${inWeek.length}</strong><span>近 7 天新增线索</span></div><div class="metric"><strong>${doneDays}/7</strong><span>近 7 天完整执行天数</span></div><div class="metric"><strong>${inWeek.filter(x=>x.type==='新词').length}</strong><span>近 7 天新词</span></div><div class="metric"><strong>${inWeek.filter(x=>x.type==='老词').length}</strong><span>近 7 天老词</span></div></div>
 <div class="card"><h3 class="card-heading">全部线索 · 验证分级</h3>
 ${['A','B','C','待定'].map(g=>bar(g,entries.filter(x=>x.grade===g).length,Math.max(1,entries.length))).join('')}
 <p class="hint">A = 值得深入验证；B = 证据不足，需复查；C = 淘汰。分级由你根据证据手动决定。</p></div>
 <div class="card"><h3 class="card-heading">来源分布</h3>${sources.length?sources.map(([label,value])=>bar(label,value,Math.max(...sources.map(x=>x[1])))).join(''):'<div class="hint">还没有数据。记录线索后会在这里看到不同渠道的产出。</div>'}</div>
 <div class="card"><h3 class="card-heading">到期复查 (${toReview.length})</h3>${toReview.length?toReview.slice(0,10).map(x=>`<div class="schedule-row"><div><strong>${h(x.keyword)}</strong><div class="hint">复查于 ${h(x.reviewDate)}</div></div><button class="btn secondary small" data-edit="${h(x.id)}">打开</button></div>`).join(''):'<div class="hint">当前没有到期的 B 类候选。</div>'}</div>
 <div class="notice">💡 每周日重点检查：新词和老词分别留下多少个 A 级机会？哪个来源产出最多？那些毫无产出的渠道可以减少时间。</div>`;
}
function bar(label,value,max){return `<div class="chartbar"><label title="${h(label)}">${h(label)}</label><div class="track"><div class="fill" style="width:${Math.min(100,Math.round(value/max*100))}%"></div></div><div class="value">${value}</div></div>`;}
function renderSettings(){
 const minutes=totalPlannedMinutes(settings);
 return `<div class="page-header"><div><div class="eyebrow">PREFERENCES & BACKUP</div><h1 class="page-title">设置</h1><p class="page-sub">每项任务计时 · 本机保存 · 导出备份</p></div></div>
 <div class="card"><h3 class="card-heading">⏱ 任务计划时间</h3>
 <p class="hint">每个任务独立设置 1—240 分钟。修改后立即保存；如果该任务正在计时，会按时长变化相应延长或缩短剩余时间。</p>
 <div class="settings-durations">${TASKS.map(t=>`<div class="duration-row"><div><strong>${h(t.title)}</strong><div class="hint">默认 ${t.minutes} 分钟 · ${h(t.phase)}</div></div><label><input class="minute-input" data-minute-id="${t.id}" type="number" min="1" max="240" step="1" value="${settings.taskMinutes[t.id]}" aria-label="${h(t.title)}计划时长" /> 分钟</label></div>`).join('')}</div>
 <div class="schedule-row"><strong>当前计划总时长</strong><strong>${minutes} 分钟</strong></div>
 <div class="button-row spaced">${button('恢复原始 90 分钟方案','reset-durations','secondary small')}${button('测试到点通知','test-notification','secondary small')}</div>
 <p class="hint spaced">不是每天固定时间提醒：只有你点击任务「开始计时」后才会设置提醒。关掉侧边栏，计时也会继续；Chrome / 电脑关闭或休眠时，系统通知可能延迟。</p></div>
 <div class="card"><h3 class="card-heading">Supabase 云端保存</h3><p class="hint">登录后手动上传或恢复线索、进度和任务时长。</p>${button('配置 / 打开云端保存','open-cloud','secondary')}</div>
 <div class="card"><h3 class="card-heading">📦 数据导出与恢复</h3><p class="hint">数据存于 Chrome 扩展本机存储。JSON 会保存线索、完成进度和每项任务的计划时长，但不会在另一台设备自动续接运行中的倒计时。</p><div class="button-row spaced">${button('导出 CSV 表格','export-csv','secondary')}${button('备份 JSON','export-json','secondary')}${button('恢复 JSON','import-json','secondary')}</div></div>
 <div class="card"><h3 class="card-heading">使用说明</h3><p class="hint">先设定时长，再在「今日清单」开始任务。暂停会冻结剩余时间，继续会从暂停处接上；重置重新按照计划分钟数开始。任务结束时手动勾选完成，不会自动切到下一项。</p></div>`;
}
function render(){main.innerHTML=view==='today'?renderToday():view==='records'?renderRecords():view==='insights'?renderInsights():renderSettings();}
function openEditor(id=null,prefill={}){editor={open:true,id,prefill};show('records');setTimeout(()=>$('#record-form input[name="keyword"]')?.focus(),30);}
function formValue(fd,name){return String(fd.get(name)||'').trim();}
async function saveRecord(form){const fd=new FormData(form);const old=entries.find(x=>x.id===editor.id);const now=new Date().toISOString();
 const raw={...old,id:old?.id||(typeof crypto.randomUUID==='function'?crypto.randomUUID():`nr-${Date.now()}-${Math.random().toString(16).slice(2)}`),date:old?.date||localDayKey(),keyword:formValue(fd,'keyword'),type:formValue(fd,'type'),source:formValue(fd,'source'),url:formValue(fd,'url'),product:formValue(fd,'product'),targetUser:formValue(fd,'targetUser'),demandStrength:formValue(fd,'demandStrength'),userNeed:formValue(fd,'userNeed'),searchEvidence:formValue(fd,'searchEvidence'),competition:formValue(fd,'competition'),payment:formValue(fd,'payment'),risk:formValue(fd,'risk'),grade:formValue(fd,'grade'),reviewDate:formValue(fd,'reviewDate'),notes:formValue(fd,'notes'),createdAt:old?.createdAt||now,updatedAt:now};
 const rec=normalizeRecord(raw);if(!rec.keyword){toast('请输入关键词或产品名称');return;}
 if(raw.url&&!rec.url){toast('来源 URL 无效，只允许 http/https');return;}
 const dup=entries.some(x=>x.id!==rec.id&&x.keyword.toLowerCase()===rec.keyword.toLowerCase()&&x.type===rec.type);
 if(dup&&!confirm('同类关键词已经存在，仍然保存一条新记录吗？'))return;
 if(old){entries=entries.map(x=>x.id===rec.id?rec:x);}else{entries.unshift(rec);}
 await saveEntries();editor={open:false,id:null,prefill:{}};toast(old?'修改已保存':'线索已保存');render();
}
function download(name,text,mime){const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportCsv(){download('niche-radar-'+localDayKey()+'.csv',recordsToCSV(entries),'text/csv;charset=utf-8');toast('CSV 已导出');}
function exportJson(){const obj={format:'niche-radar-backup',schemaVersion:2,exportedAt:new Date().toISOString(),records:entries,progress,settings};download('niche-radar-backup-'+localDayKey()+'.json',JSON.stringify(obj,null,2),'application/json');toast('JSON 备份已导出');}
async function restoreJson(file){
 if(!file)return;
 if(file.size>8*1024*1024){toast('文件过大，最多支持 8MB');return;}
 try{
 const data=JSON.parse(await file.text());
 if(data?.format!=='niche-radar-backup'||!Array.isArray(data.records)||data.records.length>20000){throw Error('不是有效的 Niche Radar 备份');}
 if(!confirm(`将用备份中的 ${data.records.length} 条线索替换本机现有的 ${entries.length} 条线索、进度和任务时长，并结束当前倒计时。是否继续？`))return;
 entries=data.records.map(normalizeRecord).filter(x=>x.keyword);
 progress=clampProgress(data.progress);
 settings=normalizeSettings(data.settings);
 if(timer)await chrome.runtime.sendMessage({type:'NR_TIMER_ACTION',action:'finish',taskId:timer.taskId});
 await chrome.storage.local.set({nr_records:entries,nr_progress:progress,nr_settings:settings});editor={open:false,id:null,prefill:{}};toast(`已恢复 ${entries.length} 条线索`);render();
 }catch(e){console.error(e);toast('导入失败：不是有效的备份 JSON');}
}

document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-nav]');if(nav){show(nav.dataset.nav);return;}
 const source=e.target.closest('[data-open-url]');if(source){openUrl(source.dataset.openUrl);return;}
 const expand=e.target.closest('[data-expand]');if(expand){expandedTask=expandedTask===expand.dataset.expand?null:expand.dataset.expand;render();return;}
 const edit=e.target.closest('[data-edit]');if(edit){openEditor(edit.dataset.edit);return;}
 const del=e.target.closest('[data-delete]');if(del){const rec=entries.find(x=>x.id===del.dataset.delete);if(rec&&confirm(`确定删除“${rec.keyword}”吗？该操作不可撤销。`)){entries=entries.filter(x=>x.id!==rec.id);await saveEntries();toast('已删除线索');render();}return;}
 const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(action==='open-cloud'){await chrome.tabs.create({url:chrome.runtime.getURL('cloud.html')});return;}
 if(action==='add-record'){openEditor();return;}
 if(action.startsWith('add-from-')){const task=TASKS.find(t=>t.id===action.replace('add-from-',''));const src=taskSource(task?.id);openEditor(null,{type:task?.phase==='老词'?'老词':'新词',source:src?.source|| (task?.id==='trends'?'Trends Bar':task?.id==='suggest'?'Google 自动补全':'Google SERP')});return;}
 if(action==='close-editor'){editor={open:false,id:null,prefill:{}};render();return;}
 if(action==='go-records'){show('records');return;}
 if(action==='export-csv'){exportCsv();return;}
 if(action==='export-json'){exportJson();return;}
 if(action==='import-json'){$('#import-input').click();return;}
 if(action==='reset-durations'){
   if(!confirm('恢复七项任务的原始 90 分钟计划吗？当前计时不会中断。'))return;
   const res=await chrome.runtime.sendMessage({type:'NR_RESET_DURATIONS'});
   toast(res?.ok?'已恢复原始计划':'恢复失败');return;
 }
 if(action.startsWith('timer-')){
   const [,cmd,...parts]=action.split('-');const taskId=parts.join('-');
   if(!TASKS.some(t=>t.id===taskId))return;
   if((cmd==='start'||cmd==='reset')&&timer&&timer.taskId!==taskId&&
      !confirm('另一项任务正在计时或尚未结束。开始此任务会替换原计时，继续吗？'))return;
   let minutes=5;
   if(cmd==='extend'){const value=prompt('延长多少分钟？（1—240）','5');if(value===null)return;minutes=Number(value);if(!Number.isInteger(minutes)||minutes<1||minutes>240){toast('请输入 1—240 的整数');return;}}
   const res=await chrome.runtime.sendMessage({type:'NR_TIMER_ACTION',action:cmd,taskId,minutes});
   if(!res?.ok)toast(res?.error||'计时操作失败');
   else if(cmd==='start')toast('已开始计时，到点后将弹出提醒');
   else if(cmd==='extend')toast('已延长 '+minutes+' 分钟');
   return;
 }
 if(action==='test-notification'){try{const res=await chrome.runtime.sendMessage({type:'NR_TEST_NOTIFICATION'});toast(res?.ok?'已请求显示系统通知':'通知发送失败，检查系统通知权限');}catch{toast('通知测试失败');}return;}
});

document.addEventListener('change',async e=>{
 if(e.target.matches('input[data-task]')){
 const id=e.target.dataset.task;const day=localDayKey();const tasks=new Set(progress[day]||[]);
 if(e.target.checked)tasks.add(id);else tasks.delete(id);
 progress[day]=[...tasks];
 if(e.target.checked&&timer?.taskId===id){
   await chrome.runtime.sendMessage({type:'NR_TIMER_ACTION',action:'complete',taskId:id});
 }
 await saveProgress();render();
 }
 if(e.target.matches('input[data-minute-id]')){
   const taskId=e.target.dataset.minuteId;
   const minutes=Number(e.target.value);
   if(!Number.isInteger(minutes)||minutes<1||minutes>240){toast('计划时间须为 1—240 分钟');e.target.value=settings.taskMinutes[taskId];return;}
   const res=await chrome.runtime.sendMessage({type:'NR_SET_DURATION',taskId,minutes});
   if(!res?.ok){toast(res?.error||'设置失败');e.target.value=settings.taskMinutes[taskId];}
   else toast(`已保存 ${minutes} 分钟`);
   return;
 }
 if(e.target.matches('select[data-filter]')){filter[e.target.dataset.filter]=e.target.value;render();}
});
document.addEventListener('input',e=>{
 if(e.target.matches('input[data-filter="query"]')){
 filter.query=e.target.value;
 // Preserve input focus and cursor when filtering.
 const pos=e.target.selectionStart;
 render();const input=$('input[data-filter="query"]');input?.focus();input?.setSelectionRange(pos,pos);
 }
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='record-form'){e.preventDefault();await saveRecord(e.target);return;}

});
$('#open-tab').addEventListener('click',()=>{void chrome.tabs.create({url:chrome.runtime.getURL('sidepanel.html')});});
$('#import-input').addEventListener('change',async e=>{await restoreJson(e.target.files?.[0]);e.target.value='';});

async function init(){
 try{
 const data=await chrome.storage.local.get(['nr_records','nr_progress','nr_settings','nr_timer','nr_time_history']);
 entries=Array.isArray(data.nr_records)?data.nr_records.map(normalizeRecord).filter(x=>x.keyword):[];
 progress=clampProgress(data.nr_progress);
 settings=normalizeSettings(data.nr_settings);
 timer=normalizeTimer(data.nr_timer);
 timeHistory=Array.isArray(data.nr_time_history)?data.nr_time_history:[];
 render();
 }catch(err){main.innerHTML='<div class="empty">读取本地数据失败。请刷新扩展页面，或重新加载扩展。<br/>如果问题持续，请查看扩展 Service Worker 控制台。</div>';console.error(err);}
}
chrome.storage.onChanged.addListener((changes,area)=>{
 if(area!=='local')return;
 if(changes.nr_records)entries=Array.isArray(changes.nr_records.newValue)?changes.nr_records.newValue:[];
 if(changes.nr_progress)progress=clampProgress(changes.nr_progress.newValue);
 if(changes.nr_settings)settings=normalizeSettings(changes.nr_settings.newValue);
 if(changes.nr_time_history)timeHistory=changes.nr_time_history.newValue||[];
 if(changes.nr_timer)timer=normalizeTimer(changes.nr_timer.newValue);
 // Avoid replacing a form while the user is typing.
 if(!editor.open)render();
});
void init();

function refreshCountdownLabels(){
 if(!timer)return;
 const value=formatCountdown(timerRemainingMs(timer));
 document.querySelectorAll(`[data-timer-readout="${timer.taskId}"]`).forEach(el=>{el.textContent=value;});
 const current=$('[data-active-countdown]');if(current)current.textContent=value;
}
setInterval(refreshCountdownLabels,1000);
