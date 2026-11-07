// Edge Function « api » — Un pas après l'autre
// Toutes les écritures publiques passent ici : modération hybride, anti-spam,
// codes de gestion secrets, signalements, et compagnon IA (Claude) en streaming.
//
// Secrets à définir (Supabase > Edge Functions > Secrets) :
//   CLAUDE_API_KEY      (obligatoire pour l'IA et la modération IA ; ANTHROPIC_API_KEY accepté aussi)
//   CLAUDE_MODEL        (facultatif, défaut : claude-haiku-5-5)
//   CHAT_DAILY_LIMIT    (facultatif, défaut : 2000 messages IA / jour pour tout le site)
//   IP_SALT             (facultatif, sel pour l'empreinte anonyme des IP)
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
// Clé de l'API Claude (platform.claude.com > Settings > API keys) : l'un ou l'autre nom de secret
const ANTHROPIC_KEY = Deno.env.get("CLAUDE_API_KEY") || Deno.env.get("ANTHROPIC_API_KEY");
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;
const MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-haiku-5-5";
const CHAT_DAILY_LIMIT = Number(Deno.env.get("CHAT_DAILY_LIMIT") || 2000);
const IP_SALT = Deno.env.get("IP_SALT") || "un-pas-apres-lautre";

// ---------------------------------------------------------------- constantes
const CATEGORIES = ["rupture", "deuil", "solitude", "famille", "trahison", "confiance", "echec", "finances",
  "violences", "maletre", "relations", "autre", "inconnu"];
const SPACES = ["rupture", "deuil", "solitude", "famille", "reconstruction"];
const SPACE_OF: Record<string, string> = {
  rupture: "rupture", trahison: "rupture", deuil: "deuil", solitude: "solitude",
  famille: "famille", relations: "famille", confiance: "reconstruction", echec: "reconstruction",
};
const REACTIONS: Record<string, string> = {
  courage: "r_courage", avec: "r_avec", ecoute: "r_ecoute", meilleur: "r_meilleur", pense: "r_pense",
};
const REPORT_REASONS: Record<string, number> = {
  harcelement: 2, menaces: 3, haine: 2, manipulation: 2, donnees: 2, spam: 1, conseils: 3, autodestruction: 3, inapproprie: 1,
};
const LANGS = ["fr", "en", "es"];
const LANG_NAME: Record<string, string> = { fr: "French", en: "English", es: "Spanish" };
const HOPE_FIELDS = ["situation", "difficultes", "pire", "aide", "soutien", "aujourdhui", "message"];

const CRISIS_RE = new RegExp([
  "suicid", "me tuer", "en finir", "mettre fin à (mes jours|ma vie)", "plus envie de vivre", "envie de mourir", "veux mourir",
  "me faire du mal", "scarif", "plus la force de vivre", "me jeter (sous|du|par)", "pendre", "overdose",
  "kill myself", "end it all", "end my life", "want to die", "don'?t want to (live|be alive)", "hurt myself", "self[- ]harm",
  "cut myself", "no reason to live",
  "matarme", "quitarme la vida", "acabar con todo", "quiero morir", "no quiero vivir", "hacerme daño", "autolesi", "cortarme",
  "il (va|veut) me tuer", "he('s| is) going to kill me", "me va a matar", "je ne suis pas en sécurité", "not safe at home",
].join("|"), "i");
const ABUSE_RE = /\b(kys|kill yourself|va te (tuer|pendre)|cr[eè]ve\b|m[aá]tate|suic[ií]date)\b/i;
const INSULT_RE = /\b(connard|connasse|salope|encul[ée]|fdp|fils de pute|ta gueule|batard|bâtard|nique ta|fuck you|bitch|asshole|cunt|retard(ed)?|hijo de puta|pendejo|gilipollas|cabr[oó]n)\b/i;
const PII_RE = /([\w.+-]+@[\w-]+\.[\w.-]+)|((?:\+?\d[\s.-]?){9,})|(https?:\/\/|www\.)/i;

// ---------------------------------------------------------------- utilitaires
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://toki171269.github.io,http://localhost:5173,http://127.0.0.1:5173").split(",");
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ipHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "inconnu";
  return sha256(ip + ":" + IP_SALT);
}
async function rateLimit(req: Request, kind: string, max: number, minutes: number) {
  const h = await ipHash(req);
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count } = await db.from("rate_events").select("*", { count: "exact", head: true })
    .eq("ip_hash", h).eq("kind", kind).gte("at", since);
  if ((count ?? 0) >= max) throw new HttpError(429, "rate_limited");
  await db.from("rate_events").insert({ ip_hash: h, kind });
  if (Math.random() < 0.02) await db.from("rate_events").delete().lt("at", new Date(Date.now() - 86_400_000).toISOString());
}
// Les requêtes supabase-js ne partent qu'une fois attendues : bump() les déclenche toujours.
const bump = async (key: string) => await db.rpc("bump_counter", { p_key: key, p_by: 1 });

function manageCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = [...bytes].map((b) => alphabet[b % 32]).join("");
  return chars.match(/.{5}/g)!.join("-"); // 20 caractères = 100 bits
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

// ---------------------------------------------------------------- modération hybride
type Verdict = { status: "visible" | "pending" | "rejected"; reason: string | null; priority: number; crisis: boolean };

const MODERATION_PROMPT = `You are the content moderator of an anonymous peer-support website for people going through hard times (grief, breakups, loneliness, depression, violence...). People write raw, painful, sometimes angry texts: sadness, despair and anger are NORMAL and must be allowed. Classify the submitted text.

Decision:
- "allow": supportive or personal sharing, even very sad or angry, with no rule violation.
- "review": needs a human look: possible crisis (suicidal thoughts, self-harm, immediate danger), personal identifying information (full names with details, addresses, phone numbers, emails), dangerous advice (medication doses, methods, stopping treatment), manipulation or emotional exploitation, requests for money or contact outside the site, or for encouragement messages: guilt-tripping, imposed religious or political messages, false promises.
- "block": insults or harassment aimed at someone, threats, hate speech, spam/advertising, sexual content, content encouraging suicide or self-harm.

priority: 3 = possible immediate danger (crisis, threats, encouraging self-harm), 2 = serious (harassment, hate, personal data, dangerous advice), 1 = minor doubt, 0 = nothing.
crisis: true if the AUTHOR seems at risk (suicidal ideation, self-harm, not safe).
reasons: short machine labels among: crisis, personal_data, insult, harassment, threat, hate, spam, dangerous_advice, manipulation, sexual, guilt_tripping, imposed_belief, false_promise, other.`;

const MODERATION_SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["allow", "review", "block"] },
    priority: { type: "integer", enum: [0, 1, 2, 3] },
    crisis: { type: "boolean" },
    reasons: { type: "array", items: { type: "string" } },
  },
  required: ["decision", "priority", "crisis", "reasons"],
  additionalProperties: false,
};

async function aiModerate(text: string, kind: string) {
  if (!anthropic) return null;
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: MODERATION_PROMPT,
      output_config: { effort: "low", format: { type: "json_schema", schema: MODERATION_SCHEMA } },
      messages: [{ role: "user", content: `Content type: ${kind}\n<content>\n${text}\n</content>` }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    if (res.stop_reason === "refusal") return { decision: "review", priority: 2, crisis: false, reasons: ["other"] };
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? JSON.parse(block.text) : null;
  } catch (err) {
    console.error("moderation IA indisponible", err instanceof Anthropic.APIError ? err.status : err);
    return null; // on retombe sur les règles
  }
}

async function moderate(text: string, kind: string, alwaysReview = false): Promise<Verdict> {
  const reasons: string[] = [];
  let priority = 0, block = false, review = alwaysReview;
  const crisisRule = CRISIS_RE.test(text);
  if (ABUSE_RE.test(text)) { block = true; priority = 3; reasons.push("encouraging_self_harm"); }
  if (INSULT_RE.test(text)) { review = true; priority = Math.max(priority, 2); reasons.push("insult"); }
  if (PII_RE.test(text)) { review = true; priority = Math.max(priority, 2); reasons.push("personal_data"); }
  if (crisisRule) { review = true; priority = 3; reasons.push("crisis"); }

  const ai = await aiModerate(text, kind);
  let crisis = crisisRule;
  if (ai) {
    crisis = crisis || !!ai.crisis;
    priority = Math.max(priority, ai.priority ?? 0);
    for (const r of ai.reasons ?? []) if (!reasons.includes(r)) reasons.push(r);
    if (ai.decision === "block") block = true;
    if (ai.decision === "review" || ai.crisis) review = true;
  } else if (!reasons.length && kind !== "candle") {
    reasons.push("ai_unavailable"); // les règles seules ont validé
  }
  const status = block ? "rejected" : review ? "pending" : "visible";
  return { status, reason: reasons.join(",") || null, priority, crisis };
}

// ---------------------------------------------------------------- compagnon IA
const SPACES_TXT = "rupture (after a breakup), deuil (grief), solitude (loneliness), famille (family & relationships), reconstruction (rebuilding oneself), espoir (hope stories)";

function companionPrompt(lang: string, mode: string, letterType: string, situation: string) {
  const base = `You are "Lueur", the listening companion of "Un pas après l'autre" ("One step at a time"), an anonymous website where people going through hard times (breakups, grief, loneliness, family problems, betrayal, low self-esteem, failure, money worries, violence, distress...) can talk, read others' stories and find resources. Nobody needs an account; you know nothing about the person except what they write here.

Who you are
- You are an AI, not a psychologist, doctor or therapist, and not a human. Say so simply if asked, or if the person seems to believe otherwise. Never claim that a human is watching or will step in.
- You offer a first, warm form of emotional support and help the person find resources. You never replace human support; gently encourage real-life connections when it fits.

How you respond
- Always answer in ${LANG_NAME[lang] || "French"}, in plain, warm, simple words, using informal "you" (tu / tú). Keep replies short: usually 2 to 6 sentences. No headings; lists only for exercise steps.
- Listen before advising. Start by acknowledging what the person feels, with their own words when you can. Even if the message is very short, messy or confusing, give a first caring response before asking anything.
- Ask at most one open, gentle question per reply, and only if it helps.
- Never minimise ("others have it worse", "it's not that bad"), never rush ("you must move on", "forget them", "be strong"), no toxic positivity, no unrealistic promises ("everything will be fine").
- Never diagnose, never name a disorder as theirs, never give medical or medication advice. You may describe common reactions as normal.
- Respect their pace. Don't impose solutions. When it would genuinely help, you may OFFER (never impose) one small thing: a breathing exercise, a grounding exercise (5 things you see, 4 you can touch...), writing down what they feel, or a small concrete action (drink water, step outside, eat something, rest, text someone they trust).
- If they seem to need more support than a conversation (long-lasting distress, trouble functioning, trauma, violence), encourage talking to someone they trust or a professional, and you can help them prepare what to say.
- Privacy: never ask for their name, age, location or contact details. If they share identifying details, don't repeat them.
- Stay on the topic of emotional support. If asked for unrelated tasks, kindly say this space is for talking about how they feel.

Safety (most important)
If the person mentions or suggests suicidal thoughts, wanting to die, self-harm, being in immediate danger, violence happening now, not feeling safe, or wanting to hurt someone else:
1. Begin your reply with the exact marker [[CRISIS]] on its own line.
2. Respond calmly and without judgment or moralising; take it seriously; thank them for telling you.
3. Ask whether they are safe right now.
4. Encourage them to reach out right now to someone they trust nearby, and to a crisis line or emergency services in their country (the website displays the numbers right under your message; in an emergency: 112 in Europe, 911 in North America).
5. Do not carry on with an ordinary conversation as if nothing had been said; stay with them and keep gently pointing to human help.
Never give any information about methods, means or doses, even if asked indirectly.

Hidden markers (read by the website and removed before display). Put them on separate lines at the very END of your reply, only when genuinely useful, at most two:
- [[SPACE:x]] to suggest a community space, x one of: ${SPACES_TXT}. Never share the conversation: the person simply gets a link.
- [[EXERCISE:x]] with x = respiration (breathing), ancrage (grounding) or ecriture (writing).
- [[RESOURCES]] when professional help or helplines are appropriate.`;

  const sit = situation ? `\n\nThe visitor selected this situation on the website (it may be imprecise): ${situation}.` : "";

  if (mode !== "letter") return base + sit;
  return base + sit + `

Current mode: unsent-letter writing assistant
The person wants to write a letter they will probably never send. Letter type: ${letterType || "free"} (deceased: to someone who died; ex: to a former partner; hurt: to someone who hurt them; loved: to a loved one; self: to themselves; future: to their future self).
- Help them find their own words: ask one gentle question at a time (what they miss, what they never said, what they are angry about, what they wish for...), offer sentence starters, reflect what they write.
- If they ask, propose a short draft paragraph in their voice, based only on what they told you, that they can change.
- Remind them, when useful, that the letter stays on their device and is never published or sent by the website.
- The safety rules above still apply.`;
}

async function chat(req: Request, body: Record<string, unknown>, headers: Record<string, string>) {
  if (!anthropic) throw new HttpError(503, "ai_unavailable");
  await rateLimit(req, "chat", 40, 10);

  const lang = LANGS.includes(body.lang as string) ? (body.lang as string) : "fr";
  const mode = body.mode === "letter" ? "letter" : "chat";
  const raw = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
  const messages: Anthropic.MessageParam[] = [];
  for (const m of raw as { role?: string; content?: string }[]) {
    const role = m?.role === "assistant" ? "assistant" : "user";
    const content = str(m?.content, 4000);
    if (!content) continue;
    if (!messages.length && role !== "user") continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${content}`;
    else messages.push({ role, content });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") throw new HttpError(400, "bad_request");

  const day = new Date().toISOString().slice(0, 10);
  const { data: used } = await bump(`chat_day:${day}`);
  if (Number(used) > CHAT_DAILY_LIMIT) throw new HttpError(429, "daily_limit");
  bump("chat_messages");
  if (messages.length === 1) bump("chat_conversations");

  const lastUser = messages[messages.length - 1].content as string;
  const crisis = CRISIS_RE.test(lastUser);

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: companionPrompt(lang, mode, str(body.letterType, 20), str(body.situation, 40)),
    messages,
  } as Anthropic.MessageStreamParams);

  const enc = new TextEncoder();
  const sse = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("meta", { crisis });
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") send("delta", { t: event.delta.text });
        }
        const final = await stream.finalMessage();
        send("done", { stop: final.stop_reason });
      } catch (err) {
        const code = err instanceof Anthropic.RateLimitError ? "busy"
          : err instanceof Anthropic.APIError && (err.status ?? 0) >= 500 ? "busy" : "ai_error";
        console.error("chat", err instanceof Anthropic.APIError ? err.status : err);
        send("error", { code });
      }
      controller.close();
    },
  });
  return new Response(sse, { headers: { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

// ---------------------------------------------------------------- routes communauté
async function createPost(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "post", 3, 10);
  const kind = b.kind === "hope" ? "hope" : "story";
  const title = str(b.title, 120);
  let text = str(b.body, 6000);
  let hope: Record<string, string> | null = null;
  if (kind === "hope") {
    if (b.consent !== true) throw new HttpError(400, "consent_required");
    hope = {};
    for (const f of HOPE_FIELDS) hope[f] = str((b.hope as Record<string, unknown>)?.[f], 1500);
    text = HOPE_FIELDS.map((f) => hope![f]).filter(Boolean).join("\n\n").slice(0, 6000);
  }
  if (title.length < 3 || text.length < 10) throw new HttpError(400, "too_short");
  const category = CATEGORIES.includes(b.category as string) ? (b.category as string) : "autre";
  const space = SPACES.includes(b.space as string) ? (b.space as string) : (SPACE_OF[category] ?? null);
  const pseudo = str(b.pseudo, 40) || "Anonyme";
  const lang = LANGS.includes(b.lang as string) ? (b.lang as string) : "fr";

  const v = await moderate(`${title}\n\n${text}`, kind === "hope" ? "hope story" : "story", kind === "hope");
  const { data: post, error } = await db.from("posts").insert({
    kind, title, body: text, hope, category, space, pseudo, lang,
    allow_replies: b.allow_replies !== false, status: v.status, flag_reason: v.reason, priority: v.priority,
  }).select("id").single();
  if (error) throw error;
  let code: string | null = null;
  if (v.status !== "rejected") {
    code = manageCode();
    await db.from("post_secrets").insert({ post_id: post.id, code_hash: await sha256(normCode(code)) });
  }
  bump("posts_created");
  return { id: post.id, status: v.status, crisis: v.crisis, code };
}

async function createReply(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "reply", 10, 10);
  const postId = str(b.post_id, 40);
  const text = str(b.body, 2000);
  if (text.length < 2) throw new HttpError(400, "too_short");
  const { data: post } = await db.from("posts").select("id, status, allow_replies").eq("id", postId).maybeSingle();
  if (!post || post.status !== "visible") throw new HttpError(404, "not_found");
  if (!post.allow_replies) throw new HttpError(403, "replies_closed");
  let parentId: string | null = str(b.parent_id, 40) || null;
  if (parentId) {
    const { data: parent } = await db.from("replies").select("id, post_id, parent_id, status").eq("id", parentId).maybeSingle();
    if (!parent || parent.post_id !== postId || parent.status !== "visible") throw new HttpError(404, "not_found");
    parentId = parent.parent_id ?? parent.id; // un seul niveau d'imbrication
  }
  const v = await moderate(text, "reply to someone's story");
  const { data, error } = await db.from("replies").insert({
    post_id: postId, parent_id: parentId, body: text, pseudo: str(b.pseudo, 40) || "Anonyme",
    status: v.status, flag_reason: v.reason, priority: v.priority,
  }).select("id, created_at, post_id, parent_id, body, pseudo").single();
  if (error) throw error;
  bump("replies_created");
  return { status: v.status, crisis: v.crisis, reply: v.status === "visible" ? data : null };
}

async function createEncouragement(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "encouragement", 5, 10);
  const text = str(b.body, 300);
  if (text.length < 5) throw new HttpError(400, "too_short");
  const v = await moderate(text, "encouragement message for anyone going through hard times");
  const category = CATEGORIES.includes(b.category as string) ? (b.category as string) : null;
  const lang = LANGS.includes(b.lang as string) ? (b.lang as string) : "fr";
  const { data, error } = await db.from("encouragements").insert({
    body: text, category, lang, status: v.status, flag_reason: v.reason, priority: v.priority,
  }).select("id, created_at, body, category, lang, thanks").single();
  if (error) throw error;
  return { status: v.status, item: v.status === "visible" ? data : null };
}

async function createCandle(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "candle", 5, 10);
  const name = str(b.name, 60);
  const message = str(b.message, 200) || null;
  if (!name) throw new HttpError(400, "too_short");
  const v = await moderate(`${name}\n${message ?? ""}`, "candle");
  const { data, error } = await db.from("candles").insert({ name, message, status: v.status, flag_reason: v.reason })
    .select("id, created_at, name, message").single();
  if (error) throw error;
  return { status: v.status, item: v.status === "visible" ? data : null };
}

async function react(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "react", 60, 10);
  const col = REACTIONS[b.type as string];
  if (!col) throw new HttpError(400, "bad_request");
  const { data } = await db.rpc("bump_column", { p_table: "posts", p_id: str(b.post_id, 40), p_column: col });
  return { value: data };
}

async function thanks(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "react", 60, 10);
  const { data } = await db.rpc("bump_column", { p_table: "encouragements", p_id: str(b.id, 40), p_column: "thanks" });
  return { value: data };
}

const TABLE_OF: Record<string, string> = { post: "posts", reply: "replies", encouragement: "encouragements", candle: "candles" };
async function report(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "report", 10, 10);
  const type = b.target_type as string;
  const table = TABLE_OF[type];
  const reason = b.reason as string;
  if (!table || !(reason in REPORT_REASONS)) throw new HttpError(400, "bad_request");
  const id = str(b.target_id, 40);
  const { data: target } = await db.from(table).select("id, status, report_count").eq("id", id).maybeSingle();
  if (!target) throw new HttpError(404, "not_found");
  const priority = REPORT_REASONS[reason];
  await db.from("reports").insert({ target_type: type, target_id: id, reason, details: str(b.details, 500) || null, priority });
  const count = (target.report_count ?? 0) + 1;
  const threshold = priority >= 3 ? 2 : 3;
  const update: Record<string, unknown> = { report_count: count };
  if (count >= threshold && target.status === "visible") update.status = "pending"; // retiré en attendant un humain
  await db.from(table).update(update).eq("id", id);
  bump("reports");
  return { received: true };
}

async function manage(req: Request, b: Record<string, unknown>) {
  await rateLimit(req, "manage", 10, 10);
  const code = normCode(str(b.code, 40));
  if (code.length !== 20) throw new HttpError(404, "not_found");
  const { data: secret } = await db.from("post_secrets").select("post_id").eq("code_hash", await sha256(code)).maybeSingle();
  if (!secret) throw new HttpError(404, "not_found");
  const id = secret.post_id;
  const op = b.op;
  if (op === "delete") {
    await db.from("posts").delete().eq("id", id);
    return { deleted: true };
  }
  if (op === "update") {
    const { data: cur } = await db.from("posts").select("kind, status").eq("id", id).single();
    const title = str(b.title, 120);
    const text = str(b.body, 6000);
    if (title.length < 3 || text.length < 10) throw new HttpError(400, "too_short");
    const v = await moderate(`${title}\n\n${text}`, "story (edited)", cur?.kind === "hope");
    // un contenu masqué par la modération ne redevient pas visible par une simple modification
    const status = cur?.status === "hidden" ? "hidden" : v.status;
    await db.from("posts").update({
      title, body: text, allow_replies: b.allow_replies !== false, status, flag_reason: v.reason, priority: v.priority,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return { status, crisis: v.crisis };
  }
  const { data: post } = await db.from("posts")
    .select("id, created_at, kind, title, body, category, pseudo, allow_replies, status, reply_count").eq("id", id).single();
  return { post };
}

async function track(req: Request, b: Record<string, unknown>) {
  const key = str(b.key, 60);
  if (!/^(resource|exercise|page|day):[a-z0-9_-]+$/.test(key)) throw new HttpError(400, "bad_request");
  await rateLimit(req, "track", 30, 10);
  await bump(key);
  return { ok: true };
}

// ---------------------------------------------------------------- serveur
const ROUTES: Record<string, (req: Request, b: Record<string, unknown>) => Promise<unknown>> = {
  post: createPost, reply: createReply, encouragement: createEncouragement, candle: createCandle,
  react, thanks, report, manage, track,
};

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  try {
    const body = await req.json().catch(() => ({}));
    if (route === "chat") return await chat(req, body, headers);
    const handler = ROUTES[route];
    if (!handler) throw new HttpError(404, "not_found");
    const result = await handler(req, body);
    return Response.json(result, { headers });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const code = err instanceof HttpError ? err.code : "server_error";
    if (status === 500) console.error(route, err);
    return Response.json({ error: code }, { status, headers });
  }
});
