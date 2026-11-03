import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyPlan,TASKS,normalizeRecord,recordsToCSV} from '../core.mjs';
test('weekly routing and alternating channels',()=>{
 for(let day=2;day<=8;day++){const p=weeklyPlan(new Date(2026,10,day));assert.ok(p.ids.every(id=>TASKS.some(t=>t.id===id)));}
 const tuesday=weeklyPlan(new Date(2026,10,3));assert.ok(tuesday.channels.some(c=>c[1].includes('/monthly/2023/11')));
 const a=weeklyPlan(new Date(2026,10,4)),b=weeklyPlan(new Date(2026,10,11));assert.notEqual(a.channels[1][0],b.channels[1][0]);
});
test('new evidence fields survive normalization and export',()=>{
 const record=normalizeRecord({keyword:'invoice',product:'Example',targetUser:'Tutors',demandStrength:'Weekly'});
 assert.equal(record.targetUser,'Tutors');assert.match(recordsToCSV([record]),/Weekly/);assert.equal(normalizeRecord({}).product,'');
});

test('new keyword research is daily including weekends without duplicate tasks',()=>{
 for(let day=2;day<=8;day++){
  const plan=weeklyPlan(new Date(2026,10,day));
  for(const id of ['trends','discovery','suggest'])assert.ok(plan.ids.includes(id));
  assert.equal(plan.ids.length,new Set(plan.ids).size);
 }
 assert.ok(weeklyPlan(new Date(2026,10,3)).ids.includes('products'));
 assert.ok(weeklyPlan(new Date(2026,10,5)).ids.includes('validate'));
});
