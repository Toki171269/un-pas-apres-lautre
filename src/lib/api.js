import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, API_URL } from "../config.js";

// Lecture des contenus visibles (RLS) + connexion administrateur
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const POST_COLS = "id, created_at, updated_at, kind, title, body, hope, category, space, pseudo, lang, allow_replies, reply_count, r_courage, r_avec, r_ecoute, r_meilleur, r_pense";
export const REPLY_COLS = "id, created_at, post_id, parent_id, body, pseudo";

export class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

// Toutes les écritures publiques passent par l'Edge Function
export async function api(route, body) {
  let res;
  try {
    res = await fetch(`${API_URL}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "server_error", res.status);
  return data;
}

export const track = (key) => api("track", { key }).catch(() => {});

// Conversation IA en streaming (Server-Sent Events)
export async function streamChat(body, { onMeta, onDelta, signal }) {
  let res;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return { stop: "aborted" };
    throw new ApiError("network", 0);
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || "server_error", res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", result = { stop: null };
  for (;;) {
    let chunk;
    try { chunk = await reader.read(); } catch (err) { if (err.name === "AbortError") return { stop: "aborted" }; throw new ApiError("network", 0); }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.*)$/m.exec(raw)?.[1];
      const dataLine = /^data: (.*)$/m.exec(raw)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "meta") onMeta?.(data);
      else if (event === "delta") onDelta?.(data.t);
      else if (event === "done") result = data;
      else if (event === "error") throw new ApiError(data.code || "ai_error", 200);
    }
  }
  return result;
}

// Marqueurs cachés que l'IA place dans sa réponse ([[CRISIS]], [[SPACE:x]], [[EXERCISE:x]], [[RESOURCES]])
export function parseMarkers(text) {
  const markers = { crisis: false, spaces: [], exercises: [], resources: false };
  const clean = text
    .replace(/\[\[([A-Z]+)(?::([a-z]+))?\]\]/g, (_, name, arg) => {
      if (name === "CRISIS") markers.crisis = true;
      if (name === "SPACE" && arg) markers.spaces.push(arg);
      if (name === "EXERCISE" && arg) markers.exercises.push(arg);
      if (name === "RESOURCES") markers.resources = true;
      return "";
    })
    .replace(/\[\[[^\]]*$/, "") // marqueur incomplet en cours de streaming
    .trim();
  return { clean, markers };
}
