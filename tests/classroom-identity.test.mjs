import {test} from 'node:test';import assert from 'node:assert/strict';
import {isClassroomGuest,memberStudents} from '../supabase/functions/diji-api/classroom-identity.mjs';
test('technical guest identities never become member accounts; ordinary similar names remain members',()=>{
 assert(isClassroomGuest({profile:{teacher_portal_guest:true}}));assert(isClassroomGuest({username:'Ali · Misafir a1b2c3d4'}));assert(isClassroomGuest({username:'Önizleme · Öğretmen Denemesi a1b2c3d4'}));assert(!isClassroomGuest({username:'Ali',profile:{}}));assert(!isClassroomGuest({username:'Misafir Ali'}));
});
test('member query includes null/ordinary profiles and excludes the exact persisted guest marker',()=>{
 let filter;const q={or:s=>{filter=s;return q}};assert.equal(memberStudents(q),q);assert.equal(filter,'profile->>teacher_portal_guest.is.null,profile->>teacher_portal_guest.neq.true');
});
