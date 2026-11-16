import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

export const config = { path: "/api/torneio" };

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });

// A senha do admin vem da variável de ambiente ADMIN_PASSWORD (configurada no painel do Netlify).
function senhaCorreta(tentativa) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || typeof tentativa !== "string") return false;
  const a = Buffer.from(tentativa);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  const store = getStore("torneio");

  // Qualquer pessoa pode ver o torneio.
  if (req.method === "GET") {
    return json((await store.get("estado", { type: "json" })) || {});
  }

  // Só o admin (com a senha) pode salvar.
  if (req.method === "POST") {
    let corpo;
    try { corpo = await req.json(); } catch { return json({ erro: "JSON inválido" }, 400); }
    if (!senhaCorreta(corpo.senha)) return json({ erro: "Senha inválida" }, 401);
    if (corpo.estado === undefined) return json({ ok: true }); // apenas validação do login

    const e = corpo.estado;
    if (!e || !Array.isArray(e.players) || !Array.isArray(e.matches) || JSON.stringify(e).length > 300000) {
      return json({ erro: "Estado inválido" }, 400);
    }
    await store.setJSON("estado", {
      players: e.players, matches: e.matches, champion: e.champion || null, started: !!e.started,
    });
    return json({ ok: true });
  }

  return json({ erro: "Método não permitido" }, 405);
};
