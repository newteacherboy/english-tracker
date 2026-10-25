// Classroom participants have game history, never learner membership or personal login.
export const isClassroomGuest=s=>s?.profile?.teacher_portal_guest===true||/ · (?:Misafir|Öğretmen Denemesi) [a-f0-9]{8}$/.test(String(s?.username||s?.ogrenci||''));
export const memberStudents=query=>query.or('profile->>teacher_portal_guest.is.null,profile->>teacher_portal_guest.neq.true');
