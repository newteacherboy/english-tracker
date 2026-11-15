// Read-only preview. No campaign, wallet, subscription or membership writes exist.
export function previewData(view = "teacher", now = new Date()) {
  const student = view === "student";
  return {
    ok: true,
    preview: true,
    publicEnabled: false,
    teacher: !student,
    isAdmin: false,
    joined: student,
    active: true,
    serverNow: now.toISOString(),
    startsAt: "2026-11-20T00:00:00+03:00",
    endsAt: "2026-12-11T00:00:00+03:00",
    resultsAt: "2026-12-11T00:00:00+03:00",
    invite: "preview-only",
    participants: 32,
    kp: 1500,
    groupScore: 6100,
    groupRank: 2,
    studentRank: 1,
    remaining: { "word-goal": 5, "word-match": 5 },
    top5: [1500, 1300, 1200, 1100, 1000].map((kp, i) => ({
      alias: "Örnek öğrenci " + (i + 1),
      kp,
      self: student && i === 0,
    })),
    board: [
      {
        rank: 1,
        label: "Örnek öğretmen grubu A",
        score: 6500,
        active: 12,
        eligible: true,
        self: false,
      },
      {
        rank: 2,
        label: "Örnek öğretmen grubu B",
        score: 6100,
        active: 8,
        eligible: true,
        self: true,
      },
      {
        rank: 3,
        label: "Örnek öğretmen grubu C",
        score: 5200,
        active: 6,
        eligible: true,
        self: false,
      },
      {
        rank: 4,
        label: "Örnek öğretmen grubu D",
        score: 2400,
        active: 3,
        eligible: false,
        self: false,
      },
    ],
    rewards:
      view === "results"
        ? [
            { alias: "Örnek şampiyon öğretmen", months: 3 },
            ...Array.from({ length: 5 }, (_, i) => ({
              alias: "Örnek öğrenci " + (i + 1),
              months: 1,
            })),
          ]
        : [],
  };
}
export function previewHandler({ read, hash, now = () => new Date() }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "content-type,authorization,apikey,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  return async (req) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (req.method !== "POST")
      return reply({ ok: false, mesaj: "POST gerekli." }, 405);
    try {
      const b = await req.json().catch(() => ({})),
        token = String(b.t || "");
      if (token.length < 20 || token.length > 400)
        return reply({ ok: false }, 401);
      const [s] = await read(
        "portal_sessions?token_hash=eq." +
          (await hash(token)) +
          "&select=role,student_id,teacher_id,expires_at,teacher_portal_access_id,teacher_portal_version&limit=1",
      );
      if (
        !s ||
        !Number.isFinite(Date.parse(s.expires_at)) ||
        Date.parse(s.expires_at) <= now().getTime() ||
        s.role !== "teacher" ||
        !s.teacher_id
      )
        return reply({ ok: false }, 403);
      const [teacher] = await read(
        "teachers?id=eq." +
          s.teacher_id +
          "&select=id,username,is_admin,active,frozen_at&limit=1",
      );
      if (
        !teacher ||
        teacher.username !== "teacher" ||
        teacher.is_admin !== true ||
        teacher.active !== true ||
        teacher.frozen_at
      )
        return reply({ ok: false }, 403);
      if (s.teacher_portal_access_id) {
        const [grant] = await read(
          "teacher_portal_access?id=eq." +
            s.teacher_portal_access_id +
            "&select=teacher_id,student_id,state,version&limit=1",
        );
        if (
          !grant ||
          grant.teacher_id !== teacher.id ||
          grant.state !== "approved" ||
          grant.version !== s.teacher_portal_version
        )
          return reply({ ok: false }, 403);
        if (grant.student_id) {
          const [owner] = await read(
            "students?id=eq." +
              grant.student_id +
              "&select=status,frozen_at,email_verified_at&limit=1",
          );
          if (
            !owner ||
            owner.status !== "approved" ||
            owner.frozen_at ||
            !owner.email_verified_at
          )
            return reply({ ok: false }, 403);
        }
      }
      // No approve/join/start operation is exposed, even for the owner.
      if (
        b.op !== "status" ||
        !["teacher", "student", "results"].includes(b.view || "teacher")
      )
        return reply(
          {
            ok: false,
            mesaj: "Önizlemede gerçek katılım, oyun ve ödül işlemleri kapalı.",
          },
          400,
        );
      return reply(previewData(b.view || "teacher", now()));
    } catch {
      return reply({ ok: false, mesaj: "Önizleme doğrulanamadı." }, 503);
    }
  };
}
