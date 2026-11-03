/** Shared pure helpers: usable in Chrome and Node tests. */
export const VERSION = 2;

export const TASKS = [
  { id: 'trends', phase: '新词', minutes: 12, title: 'Trends Bar · 批量看趋势', icon: 'trend',
    tip: '按种子词组轮换，用 Trends Bar 批量比较美国市场近 30 / 90 天趋势；从 Related queries → Rising 留下有工具意图的词。',
    steps: ['选择今天的一组种子词', '批量查看趋势与 Rising 相关查询', '记录最多 3 个真实搜索信号'],
    links: [ ['打开 Google Trends', 'https://trends.google.com/trends/explore?geo=US'], ['Trends Bar 官方入口', 'https://trendsbar.net/zh'] ] },
  { id: 'discovery', phase: '新词', minutes: 8, title: '增长词证据整理', icon: 'spark',
    tip: '从 Trends 的增长查询提取具体任务词，记录首次发现日期与趋势链接。',
    steps: ['整理增长查询', '排除新闻事件与无工具意图的词', '保存趋势证据，缺证据则待观察'], links: [] },
  { id: 'suggest', phase: '新词', minutes: 5, title: 'Google 补全验证', icon: 'search',
    tip: '从本日候选选最多 2 个，在英文 Google 输入名称和 integration / API / converter / alternative 等组合，观察补全；记录首次观察日期。',
    steps: ['验证不超过 2 个名词', '记下出现的补全和相关词', '不出现时标记待复查，不硬造需求'],
    links: [ ['Google 英文搜索', 'https://www.google.com/?hl=en'] ] },
  { id: 'products', phase: '老词', minutes: 20, title: '从真实小产品发现需求', icon: 'target',
    tip: '按本周执行卡使用 TrustMRR、Product Hunt 历史榜、AlternativeTo；GitHub / AppSumo 按周轮换。扫描限制在 30—60 分钟。',
    steps: ['打开今日轮值目录', '浏览 8—12 个，深看最多 2 个', '记录目标用户、核心任务、价格或收入证据'], links: [] },
  { id: 'reverse', phase: '老词', minutes: 15, title: '竞品 → 非品牌关键词', icon: 'layers',
    tip: '从产品主页的 H1、功能页、FAQ 和价格页提取真实用语，去掉品牌，寻找用户会搜索的具体任务词。不要强行套 checker / generator。',
    steps: ['挑最多 2 个产品', '按人群、地区、功能、格式四个方向细分', '搜索 Google 并记录最多 2 个长尾词'],
    links: [ ['打开 Google', 'https://www.google.com/?hl=en'] ] },
  { id: 'validate', phase: '验证', minutes: 20, title: 'SERP 与商业可行性', icon: 'check',
    tip: '最多查看 3 个候选：检查搜索意图、Google 前十是否有切口、付费证据、API/维护成本。没有证据就留 B，不要为了数量硬给 A。',
    steps: ['选不超过 3 条候选', '查看搜索结果和专门竞品', '补齐搜索 / 付费证据，定 A / B / C'],
    links: [ ['Google 搜索', 'https://www.google.com/?hl=en'] ] },
  { id: 'record', phase: '归档', minutes: 10, title: '去重、分级与复查', icon: 'archive',
    tip: '统一存到线索库，一条需求一条记录。A 值得验证，B 缺证据待复查，C 淘汰。给 B 类设置复查日期。',
    steps: ['去重并完善来源链接', '设定 A / B / C 结论', '给 B 类设置复查日期'], links: [] }
];

export const DAY_NAMES = ['周日','周一','周二','周三','周四','周五','周六'];
export const NEW_SOURCES = Array.from({length:7},()=>({label:'Google Trends · 增长搜索需求',url:'https://trends.google.com/trends/explore?geo=US',source:'Google Trends'}));
export const OLD_SOURCES = Array.from({length:7},(_,day)=>day===3?{label:'AlternativeTo · 细分替代品',url:'https://alternativeto.net/browse/',source:'AlternativeTo'}:{label:'TrustMRR · 收入证据',url:'https://trustmrr.com/',source:'TrustMRR'});
export function weeklyPlan(date=new Date()){
 const week=Math.floor((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(2024,0,1))/604800000);
 const alternate=week%2===0?['GitHub Topics','https://github.com/topics','README + Issues，记录 2 个具体痛点；没有真实用户场景就结束']:['AppSumo','https://appsumo.com/','阅读购买评价，记录 2 个具体痛点'];
 const history=`https://www.producthunt.com/leaderboard/monthly/${date.getFullYear()-3}/${date.getMonth()+1}`;
 const plan = [
 {title:'周末 · MVP 与首次推广',ids:['record'],goal:'最多两天完成 MVP、部署、埋点和首次推广；证据不足允许本周不上线。',channels:[]},
 {title:'周一 · 新词发现',ids:['trends','discovery','suggest','record'],goal:'Google Trends + Trends Bar，收集 10 个有增长证据的候选；数量是上限目标，不凑数。',channels:[['Google Trends','https://trends.google.com/trends/explore','比较近期增长与历史趋势']]},
 {title:'周二 · 老词发现',ids:['products','reverse','record'],goal:'TrustMRR 找 3 个收入证据产品，Product Hunt 历史榜找 3 个任务词。',channels:[['TrustMRR','https://trustmrr.com/','15 分钟；区分总收入与订阅收入，记录用户、收费、功能和获客渠道'],['Product Hunt 历史榜',history,'15 分钟；翻 2—4 年前的产品，跳过大平台，核实今天是否仍有同类需求']]},
 {title:'周三 · 老词补充',ids:['products','reverse','record'],goal:'AlternativeTo 找 2 个细分机会，GitHub / AppSumo 按周轮换找 2 个痛点。',channels:[['AlternativeTo','https://alternativeto.net/browse/','15 分钟；从成熟产品寻找更简单、单任务、特定平台的替代品'],alternate,['Capterra','https://www.capterra.com/','按需：垂直行业与用户差评'],['Toolify','https://www.toolify.ai/','辅助：AI 工具分类，不作为唯一证据']]},
 {title:'周四 · 竞争验证',ids:['suggest','validate','record'],goal:'选 3 个候选：Google 前十、搜索需求、竞品、技术和获客难度；老词查看过去 5 年趋势。',channels:[['Google','https://www.google.com/?hl=en','查看专业工具和可进入的切口'],['Google Trends','https://trends.google.com/trends/explore','检查长期需求；低搜索量但有 B2B 付费证据可考虑直接获客']]},
 {title:'周五 · 付费与最终选题',ids:['validate','record'],goal:'深入研究 1—2 个方向，至少核实 1 个收费证据，最终选 0—1 个可开发机会。',channels:[]},
 {title:'周末 · MVP 与首次推广',ids:['record'],goal:'最多两天完成 MVP、部署、埋点和首次推广；证据不足允许本周不上线。',channels:[]}
 ][date.getDay()];
 return {...plan,
   ids:[...new Set(['trends','discovery','suggest',...plan.ids])],
   goal:'每天先看新词：Google Trends / Trends Bar 扫描增长趋势，整理证据并检查搜索补全；没有可靠候选就不凑数。'+plan.goal
 };
}
export const SOURCE_OPTIONS = ['AlternativeTo','AppSumo','Capterra','Trends Bar','Google Trends','Google 自动补全','GitHub','Hacker News','Product Hunt','TrustMRR','Toolify','Chrome Web Store','Shopify App Store','WordPress','Google SERP','其他'];
export const MIN_TASK_MINUTES = 1;
export const MAX_TASK_MINUTES = 240;
export const DEFAULT_MINUTES = Object.fromEntries(TASKS.map(t=>[t.id,t.minutes]));
export const DEFAULT_SETTINGS = { taskMinutes: {...DEFAULT_MINUTES} };
export const TIMER_STATUSES = ['running','paused','expired'];

export function normalizeMinutes(raw, fallback=10) {
  const n=Number(raw);
  return Number.isInteger(n)&&n>=MIN_TASK_MINUTES&&n<=MAX_TASK_MINUTES ? n : fallback;
}
export function normalizeSettings(raw={}) {
  const minutes=raw && typeof raw==='object' && raw.taskMinutes && typeof raw.taskMinutes==='object' ? raw.taskMinutes : {};
  return {taskMinutes:Object.fromEntries(TASKS.map(t=>[t.id,normalizeMinutes(minutes[t.id],t.minutes)]))};
}
export function totalPlannedMinutes(settings) {
  return TASKS.reduce((n,t)=>n+normalizeMinutes(settings?.taskMinutes?.[t.id],t.minutes),0);
}
export function normalizeTimer(raw) {
  if(!raw || typeof raw!=='object' || !TASKS.some(t=>t.id===raw.taskId) || !TIMER_STATUSES.includes(raw.status))return null;
  const endAt=Number(raw.endAt);
  const remainingMs=Number(raw.remainingMs);
  if(!Number.isFinite(remainingMs) || remainingMs<0 || remainingMs>24*60*60000)return null;
  if(raw.status==='running' && (!Number.isFinite(endAt)||endAt<=0))return null;
  return {
    startedAt:Number(raw.startedAt)||null,
    elapsedMs:Math.max(0,Number(raw.elapsedMs)||0),
    segmentAt:Number(raw.segmentAt)||null,
    plannedMs:Math.max(0,Number(raw.plannedMs)||remainingMs),
    taskId:raw.taskId,
    status:raw.status,
    endAt:raw.status==='running'?endAt:null,
    remainingMs:raw.status==='expired'?0:remainingMs,
    dayKey: /^\d{4}-\d{2}-\d{2}$/.test(raw.dayKey)?raw.dayKey:localDayKey()
  };
}
export function timerRemainingMs(timer, now=Date.now()) {
  if(!timer)return 0;
  if(timer.status==='running')return Math.max(0,timer.endAt-now);
  return timer.status==='paused'?Math.max(0,timer.remainingMs):0;
}
export function formatCountdown(ms) {
  const total=Math.ceil(Math.max(0,ms)/1000);
  const m=Math.floor(total/60);
  const s=total%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}


export function localDayKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth()+1).padStart(2,'0');
  const dd = String(date.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
export function dayLabel(date = new Date()) {
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 · ${DAY_NAMES[date.getDay()]}`;
}
export function nextDailyTimestamp(hhmm, from = new Date()) {
  const [h,m] = parseTime(hhmm);
  const d = new Date(from);
  d.setHours(h,m,0,0);
  if(d.getTime() <= from.getTime()+500) d.setDate(d.getDate()+1);
  return d.getTime();
}
export function nextWeeklyTimestamp(day,hhmm,from=new Date()) {
  const [h,m]=parseTime(hhmm);
  const d=new Date(from);
  d.setHours(h,m,0,0);
  d.setDate(d.getDate()+((Number(day)-d.getDay()+7)%7));
  if(d.getTime()<=from.getTime()+500) d.setDate(d.getDate()+7);
  return d.getTime();
}
export function parseTime(hhmm) {
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(hhmm))) return [9,0];
  return String(hhmm).split(':').map(Number);
}
export function safeExternalUrl(value) {
  if(!value) return '';
  try {
    const url = new URL(value);
    return ['https:','http:'].includes(url.protocol) ? url.href : '';
  } catch {return '';}
}
export function normalizeRecord(raw={}) {
  const text = (v,max=3000) => typeof v==='string' ? v.slice(0,max) : '';
  const type = raw.type==='老词'?'老词':'新词';
  const grade = ['A','B','C','待定'].includes(raw.grade) ? raw.grade : '待定';
  const maybeDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v):'';
  return {
    id: text(raw.id,100) || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: maybeDate(raw.date) || localDayKey(),
    keyword: text(raw.keyword,240).trim(),
    type,
    source: text(raw.source,100) || '其他',
    url: safeExternalUrl(raw.url),
    product: text(raw.product),
    targetUser: text(raw.targetUser),
    demandStrength: text(raw.demandStrength),
    userNeed: text(raw.userNeed),
    searchEvidence: text(raw.searchEvidence),
    competition: text(raw.competition),
    payment: text(raw.payment),
    risk: text(raw.risk),
    grade,
    reviewDate: maybeDate(raw.reviewDate),
    notes: text(raw.notes),
    createdAt: text(raw.createdAt,50) || new Date().toISOString(),
    updatedAt: text(raw.updatedAt,50) || new Date().toISOString()
  };
}
export function csvCell(value) {
  let s = String(value??'');
  // Protect against spreadsheet formula injection from pasted external text.
  if(/^[\s]*[=+\-@]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
export const CSV_FIELDS = [
  ['date','发现日期'],['keyword','关键词/产品'],['type','新词/老词'],['source','来源'],['url','来源链接'],
  ['product','对标产品'],['targetUser','目标用户'],['demandStrength','需求强度'],['userNeed','用户与任务'],['searchEvidence','搜索证据'],['competition','SERP/竞争'],['payment','付费证据'],
  ['risk','成本和风险'],['grade','评级'],['reviewDate','复查日期'],['notes','备注'],['createdAt','创建时间']
];
export function recordsToCSV(records) {
  return '\uFEFF'+[CSV_FIELDS.map(x=>csvCell(x[1])).join(','), ...records.map(record=>CSV_FIELDS.map(x=>csvCell(record[x[0]])).join(','))].join('\r\n');
}
export function clampProgress(progress) {
  if(!progress || typeof progress!=='object' || Array.isArray(progress)) return {};
  const entries = Object.entries(progress).filter(([day,ids])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Array.isArray(ids));
  return Object.fromEntries(entries.map(([day,ids])=>[day, [...new Set(ids.filter(id=>TASKS.some(task=>task.id===id)))] ]));
}
