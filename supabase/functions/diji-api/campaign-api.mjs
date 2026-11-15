// The custom portal auth in index.ts supplies a verified identity. No student,
// teacher, score, subscription or timestamp is accepted from the request body.
const ops = new Set([
  "campaignStatus",
  "campaignJoin",
  "campaignReview",
  "campaignApprove",
]);
export function campaignAPI(db, json) {
  return {
    async handle(op, b, a, method) {
      if (!ops.has(op)) return null;
      if (method !== "POST")
        return json({ ok: false, mesaj: "POST gerekli." }, 405);
      if (
        !a ||
        !["teacher", "student"].includes(a.role) ||
        (a.role === "student" && a.teacher_portal_access_id)
      )
        return json({ ok: false, mesaj: "Kişisel hesabınla giriş yap." }, 401);
      let name, args;
      if (op === "campaignJoin") {
        if (a.role !== "student")
          return json({ ok: false, mesaj: "Öğrenci hesabı gerekli." }, 403);
        if (!/^[a-f0-9-]{36}$/.test(String(b.code || "")))
          return json({ ok: false, mesaj: "Geçersiz davet bağlantısı." }, 400);
        name = "dm_campaign_join";
        args = { actor: a.student_id, code: b.code };
      } else if (op === "campaignStatus") {
        name = "dm_campaign_status";
        args = {
          actor: a.role === "teacher" ? a.teacher_id : a.student_id,
          account_role: a.role,
        };
      } else {
        if (a.role !== "teacher" || !a.yonetici)
          return json({ ok: false, mesaj: "Yönetici gerekli." }, 403);
        name =
          op === "campaignReview"
            ? "dm_campaign_finalize"
            : "dm_campaign_approve";
        args = op === "campaignApprove" ? { admin_actor: a.teacher_id } : {};
      }
      const r = await db.rpc(name, args);
      if (r.error) {
        console.error("[campaign]", r.error.code);
        return json(
          { ok: false, mesaj: "Yarışma işlemi kaydedilemedi. Yeniden dene." },
          503,
        );
      }
      return json(
        op === "campaignStatus"
          ? { ...r.data, isAdmin: a.role === "teacher" && a.yonetici === true }
          : r.data,
      );
    },
  };
}
