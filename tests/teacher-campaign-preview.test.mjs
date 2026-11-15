import { test } from "node:test";
import assert from "node:assert/strict";
import { previewHandler } from "../supabase/functions/teacher-campaign-preview/handler.mjs";
const token = "preview-test-token-never-a-real-session";
function fixture(opts = {}) {
  const calls = [],
    s = {
      role: "teacher",
      teacher_id: "owner",
      expires_at: "2026-12-31T00:00:00Z",
      ...opts.session,
    },
    teacher = {
      id: "owner",
      username: "teacher",
      is_admin: true,
      active: true,
      frozen_at: null,
      ...opts.teacher,
    };
  return {
    calls,
    handle: previewHandler({
      hash: async () => "hash",
      now: () => new Date("2026-11-15T09:00:00Z"),
      read: async (path) => {
        calls.push(path);
        if (path.startsWith("portal_sessions?")) return opts.missing ? [] : [s];
        if (path.startsWith("teachers?")) return [teacher];
        if (path.startsWith("teacher_portal_access?"))
          return [
            {
              teacher_id: "owner",
              state: "approved",
              version: 1,
              ...opts.grant,
            },
          ];
        if (path.startsWith("students?"))
          return [
            {
              status: "approved",
              email_verified_at: "2026-01-01",
              ...opts.student,
            },
          ];
        throw Error(path);
      },
    }),
  };
}
const req = (body = { op: "status", view: "teacher", t: token }) =>
  new Request("https://preview.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("only the exact active teacher owner can read preview data", async () => {
  for (const opts of [
    { missing: true },
    { session: { role: "student", student_id: "p" } },
    { teacher: { username: "another-admin" } },
    { teacher: { is_admin: false } },
    { teacher: { active: false } },
    { teacher: { frozen_at: "2026-01-01" } },
    { session: { expires_at: "2026-11-01" } },
    { session: { expires_at: "invalid" } },
  ]) {
    const f = fixture(opts),
      r = await f.handle(
        req({ ...{ op: "status", view: "teacher", t: token }, isAdmin: true }),
      );
    assert.equal(r.status, 403);
    assert.equal((await r.json()).preview, undefined);
  }
});
test("teacher grants must still be approved, current and tied to the owner", async () => {
  for (const grant of [
    { state: "revoked" },
    { version: 2 },
    { teacher_id: "other" },
  ]) {
    const f = fixture({
      session: { teacher_portal_access_id: "grant", teacher_portal_version: 1 },
      grant,
    });
    assert.equal((await f.handle(req())).status, 403);
  }
  const f = fixture({
    session: { teacher_portal_access_id: "grant", teacher_portal_version: 1 },
  });
  assert.equal((await f.handle(req())).status, 200);
});
test("teacher/student/result views contain examples and no write or award endpoint exists", async () => {
  const f = fixture();
  for (const view of ["teacher", "student", "results"]) {
    const r = await f.handle(req({ op: "status", view, t: token }));
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.preview, true);
    assert.equal(d.publicEnabled, false);
    assert.equal(d.teacher, view !== "student");
    assert.equal(d.remaining["word-goal"], 5);
    assert.equal(d.remaining["word-match"], 5);
    if (view === "results") assert.equal(d.rewards.length, 6);
    assert.match(d.top5[0].alias, /Örnek/);
  }
  for (const op of [
    "campaignJoin",
    "campaignApprove",
    "start",
    "finish",
    "approve",
  ])
    assert.equal((await f.handle(req({ op, t: token }))).status, 400);
  assert.ok(
    f.calls.every((x) => !x.includes("rpc/") && !x.includes("dm_campaign")),
  );
});
test("anonymous and non-POST calls are rejected without reading any database record", async () => {
  const f = fixture();
  assert.equal((await f.handle(req({ op: "status", t: "" }))).status, 401);
  assert.equal(
    (await f.handle(new Request("https://preview.test"))).status,
    405,
  );
  assert.equal(f.calls.length, 0);
});
