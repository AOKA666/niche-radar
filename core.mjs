/** Shared pure helpers: usable in Chrome and Node tests. */
export const VERSION = 2;

export const TASKS = [
  { id: 'trends', phase: '新词', minutes: 12, title: 'Trends Bar · 批量看趋势', icon: 'trend',
    tip: '按种子词组轮换，用 Trends Bar 批量比较美国市场近 30 / 90 天趋势；从 Related queries → Rising 留下有工具意图的词。',
    steps: ['选择今天的一组种子词', '批量查看趋势与 Rising 相关查询', '记录最多 3 个真实搜索信号'],
    links: [ ['打开 Google Trends', 'https://trends.google.com/trends/explore?geo=US'], ['Trends Bar 官方入口', 'https://trendsbar.net/zh'] ] },
  { id: 'discovery', phase: '新词', minutes: 8, title: '发现新技术 / 新产品', icon: 'spark',
    tip: '每天只用一个来源。提取真正的新技术名称、格式、协议与工作流，不把 AI 随手编的组合词当需求。',
    steps: ['打开今日轮值平台', '浏览近期项目或讨论', '收录 1—2 个有出处的新名词'], links: [] },
  { id: 'suggest', phase: '新词', minutes: 5, title: 'Google 补全验证', icon: 'search',
    tip: '从本日候选选最多 2 个，在英文 Google 输入名称和 integration / API / converter / alternative 等组合，观察补全；记录首次观察日期。',
    steps: ['验证不超过 2 个名词', '记下出现的补全和相关词', '不出现时标记待复查，不硬造需求'],
    links: [ ['Google 英文搜索', 'https://www.google.com/?hl=en'] ] },
  { id: 'products', phase: '老词', minutes: 20, title: '从真实小产品发现需求', icon: 'target',
    tip: 'TrustMRR 看已经有收入的小产品；Toolify 看细分工具；插件生态看真实使用场景。每天固定轮换，最多深看 2 个。',
    steps: ['打开今日轮值目录', '浏览 8—12 个，深看最多 2 个', '记录目标用户、核心任务、价格或收入证据'], links: [] },
  { id: 'reverse', phase: '老词', minutes: 15, title: '竞品 → 非品牌关键词', icon: 'layers',
    tip: '从产品主页的 H1、功能页、FAQ 和价格页提取真实用语，去掉品牌，寻找用户会搜索的具体任务词。不要强行套 checker / generator。',
    steps: ['挑最多 2 个产品', '提取客户 × 任务 × 场景的用语', '搜索 Google 并记录最多 2 个长尾词'],
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
export const NEW_SOURCES = [
  {label:'本周新词复查',url:'https://trends.google.com/trends/explore?geo=US',source:'Google Trends'},
  {label:'GitHub · 最近新项目',url:'https://github.com/search?q=agent+created%3A%3E2026-10-01+stars%3A%3E20&type=repositories',source:'GitHub'},
  {label:'Hacker News · 近期讨论',url:'https://hn.algolia.com/?dateRange=pastWeek&sort=byDate',source:'Hacker News'},
  {label:'Product Hunt · 日榜',url:'https://www.producthunt.com/leaderboard',source:'Product Hunt'},
  {label:'GitHub · 新工具与协议',url:'https://github.com/search?type=repositories',source:'GitHub'},
  {label:'Hacker News · Show HN',url:'https://news.ycombinator.com/show',source:'Hacker News'},
  {label:'Product Hunt · 周末新品',url:'https://www.producthunt.com/leaderboard',source:'Product Hunt'}
];
export const OLD_SOURCES = [
  {label:'B 类候选复查',url:'https://www.google.com/?hl=en',source:'Google SERP'},
  {label:'TrustMRR · 盈利小产品',url:'https://trustmrr.com/',source:'TrustMRR'},
  {label:'Toolify · 细分类目',url:'https://www.toolify.ai/',source:'Toolify'},
  {label:'Chrome / Shopify / WordPress 插件',url:'https://chromewebstore.google.com/',source:'插件生态'},
  {label:'TrustMRR · 换个行业',url:'https://trustmrr.com/',source:'TrustMRR'},
  {label:'Toolify · 换个类别',url:'https://www.toolify.ai/new',source:'Toolify'},
  {label:'Google · 小站和替代品',url:'https://www.google.com/?hl=en',source:'Google SERP'}
];
export const SOURCE_OPTIONS = ['Trends Bar','Google Trends','Google 自动补全','GitHub','Hacker News','Product Hunt','TrustMRR','Toolify','Chrome Web Store','Shopify App Store','WordPress','Google SERP','其他'];
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
  ['userNeed','用户与任务'],['searchEvidence','搜索证据'],['competition','SERP/竞争'],['payment','付费证据'],
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
