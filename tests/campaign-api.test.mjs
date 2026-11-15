import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignAPI } from "../supabase/functions/diji-api/campaign-api.mjs";
function fixture() {
  const calls = [];
  return {
    calls,
    api: campaignAPI(
      {
        rpc: async (name, args) => {
          calls.push({ name, args });
          return { data: { ok: true }, error: null };
        },
      },
      (body, status = 200) => ({ body, status }),
    ),
  };
}
test("server resolves identity, denies anonymous/classroom and cross-role requests", async () => {
  const { calls, api } = fixture();
  assert.equal(
    (await api.handle("campaignStatus", {}, null, "POST")).status,
    401,
  );
  assert.equal(
    (
      await api.handle(
        "campaignStatus",
        {},
        { role: "student", student_id: "p", teacher_portal_access_id: "class" },
        "POST",
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await api.handle(
        "campaignApprove",
        {},
        { role: "student", student_id: "p", yonetici: true },
        "POST",
      )
    ).status,
    403,
  );
  await api.handle(
    "campaignStatus",
    { student_id: "victim", kp: 999 },
    { role: "student", student_id: "self" },
    "POST",
  );
  assert.deepEqual(calls, [
    {
      name: "dm_campaign_status",
      args: { actor: "self", account_role: "student" },
    },
  ]);
});
test("only administrator can prepare or approve rewards, only POST is allowed", async () => {
  const { calls, api } = fixture();
  assert.equal(
    (
      await api.handle(
        "campaignReview",
        {},
        { role: "teacher", teacher_id: "teacher" },
        "POST",
      )
    ).status,
    403,
  );
  assert.equal(
    (await api.handle("campaignStatus", {}, { role: "student" }, "GET")).status,
    405,
  );
  await api.handle(
    "campaignApprove",
    { admin_actor: "spoofed" },
    { role: "teacher", teacher_id: "owner", yonetici: true },
    "POST",
  );
  assert.deepEqual(calls, [
    { name: "dm_campaign_approve", args: { admin_actor: "owner" } },
  ]);
});
test("join ignores supplied student identity and requires an opaque invitation", async () => {
  const { calls, api } = fixture(),
    a = { role: "student", student_id: "self" };
  assert.equal(
    (await api.handle("campaignJoin", { code: "123456" }, a, "POST")).status,
    400,
  );
  const code = crypto.randomUUID();
  await api.handle("campaignJoin", { code, student_id: "victim" }, a, "POST");
  assert.deepEqual(calls, [
    { name: "dm_campaign_join", args: { actor: "self", code } },
  ]);
});
