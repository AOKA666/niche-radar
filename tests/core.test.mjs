import test from 'node:test';
import assert from 'node:assert/strict';
import {TASKS,nextDailyTimestamp,nextWeeklyTimestamp,localDayKey,recordsToCSV,normalizeRecord,safeExternalUrl,clampProgress} from '../core.mjs';

test('seven tasks sum to 90 minutes',()=>{
 assert.equal(TASKS.length,7);
 assert.equal(TASKS.reduce((a,t)=>a+t.minutes,0),90);
 assert.equal(TASKS.filter(x=>x.phase==='新词').reduce((a,t)=>a+t.minutes,0),25);
 assert.equal(TASKS.filter(x=>x.phase==='老词').reduce((a,t)=>a+t.minutes,0),35);
});
test('next daily schedule moves to next day after time passes',()=>{
 const reference=new Date(2026,10,1,10,31);
 const result=new Date(nextDailyTimestamp('09:00',reference));
 assert.equal(localDayKey(result),'2026-11-02');
 assert.equal(result.getHours(),9);
});
test('next weekly schedule chooses requested weekday',()=>{
 const reference=new Date(2026,10,1,10,31); // sunday
 const next=new Date(nextWeeklyTimestamp(0,'20:00',reference));
 assert.equal(next.getDay(),0);
 assert.equal(next.getDate(),1);
 assert.equal(next.getHours(),20);
 const another=new Date(nextWeeklyTimestamp(0,'09:00',reference));
 assert.equal(another.getDate(),8);
});
test('record sanitizes URLs and grading',()=>{
 const record=normalizeRecord({keyword:'   test  ',url:'javascript:alert(1)',grade:'Z',type:'invalid'});
 assert.equal(record.url,'');assert.equal(record.keyword,'test');assert.equal(record.grade,'待定');assert.equal(record.type,'新词');
 assert.ok(safeExternalUrl('https://example.com/a'));
 assert.equal(safeExternalUrl('file:///etc/passwd'),'');
});
test('CSV prevents formula injection and quotes fields',()=>{
 const csv=recordsToCSV([{date:'2026-11-01',keyword:'=SUM(1,1)',source:'source,with comma',notes:'hello "world"'}]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('"\'=SUM(1,1)"'));
 assert.ok(csv.includes('"source,with comma"'));
 assert.ok(csv.includes('"hello ""world"""'));
});
test('progress only accepts known task ids',()=>{
 const p=clampProgress({'2026-11-01':['trends','trends','evil'],'../hack':['record']});
 assert.deepEqual(p,{'2026-11-01':['trends']});
});
