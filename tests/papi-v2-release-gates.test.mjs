import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('Papi map remains preview-only and uses native 80-chapter route',()=>{
 const html=read('ingilizce/papi-v2-map-preview.html');
 assert.match(html,/papi-v2-route\.mjs/);
 assert.match(html,/getOrderedChapterIds\(level\)/);
 assert.match(html,/aria-disabled/);
 assert.match(html,/Önizleme/);
 assert.doesNotMatch(html,/storyAdvance|storyOpen|dm_story_apply/);
});
test('Preview does not award rewards or call Supabase',()=>{
 const html=read('ingilizce/papi-v2-preview.html');
 assert.match(html,/papi-v2-activity-engine\.mjs/);
 assert.match(html,/completed=true/);
 assert.doesNotMatch(html,/storyAdvance|storyOpen|dm_story_apply|\.rpc\(/);
});
test('Migration requires locked coordinated production release',()=>{
 const sql=read('supabase/papi-v2-coordinated-rollout.sql');
 assert.match(sql,/chapter between 0 and 79/i);
 assert.match(sql,/chapter_no not between 0 and 79/);
 const preflight=read('supabase/papi-v2-readonly-progress-fingerprint.sql');
 assert.doesNotMatch(preflight,/\b(update|delete|insert|alter|drop|truncate)\s+(table|into|public\.)/i);
});
