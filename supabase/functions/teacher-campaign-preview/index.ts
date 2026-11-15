import { previewHandler } from "./handler.mjs";
const url = Deno.env.get("SUPABASE_URL") || "";
const key =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
  "";
Deno.serve(
  previewHandler({
    async read(path: string) {
      if (!url || !key) throw Error("configuration");
      const r = await fetch(url + "/rest/v1/" + path, {
        method: "GET",
        headers: { apikey: key, Authorization: "Bearer " + key },
        cache: "no-store",
      });
      if (!r.ok) throw Error("verification");
      return await r.json();
    },
    async hash(token: string) {
      return [
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(token),
          ),
        ),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    },
  }),
);
