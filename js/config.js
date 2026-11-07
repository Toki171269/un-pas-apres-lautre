// Configuration de la base Supabase.
// Supabase > ton projet > Project Settings > API : copie "Project URL" et la clé "anon public".
// La clé "anon" est faite pour être publique : la sécurité est assurée par les règles RLS (supabase/schema.sql).
// Laisse vide pour utiliser le mode démo (données stockées seulement dans ton navigateur).
window.LUEUR_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
