/* Teacher assignments that a server-verified lesson pass completes.
   The study screen records the result with dersTestSonucKaydet and no longer calls the old
   browser hook that used to mark lesson homework done, so the server does it (20 Oct 2026). */
const norm = v => String(v ?? '').trim().toLocaleLowerCase('tr');

/* Same ownership rule as odevlerim / odevTamamla: class, optional branch, own teacher or an admin's. */
export function assignmentBelongs(o, s, adminIds) {
  return Number(o.class_no) === Number(s.class_no)
    && (!o.branch || norm(o.branch) === norm(s.branch))
    && (!o.teacher_id || adminIds.has(o.teacher_id) || o.teacher_id === s.teacher_id);
}

export function lessonAssignmentMatches(o, level, category, topic) {
  const p = o?.payload || {};
  return o?.kind === 'ders' && String(p.konu || '') === String(topic)
    && (!p.seviye || String(p.seviye).toUpperCase() === String(level).toUpperCase())
    && (!p.kategori || String(p.kategori) === String(category));
}

/* Returns the ids that were marked done. Never throws: a failed homework mark must not
   undo or hide a lesson pass that is already saved. */
export async function completeLessonAssignments(db, s, level, category, topic, adminIds) {
  try {
    if (!s?.id || !Number(s.class_no)) return [];
    const { data, error } = await db.from('assignments').select('id,kind,payload,class_no,branch,teacher_id')
      .eq('active', true).eq('kind', 'ders').eq('class_no', Number(s.class_no)).limit(100);
    if (error) return [];
    const ids = (data || []).filter(o => assignmentBelongs(o, s, adminIds) && lessonAssignmentMatches(o, level, category, topic)).map(o => o.id);
    if (!ids.length) return [];
    const { error: upsertError } = await db.from('assignment_status').upsert(
      ids.map(id => ({ assignment_id: id, student_id: s.id, score: null, stars: null })),
      { onConflict: 'assignment_id,student_id', ignoreDuplicates: true });
    return upsertError ? [] : ids;
  } catch { return []; }
}
