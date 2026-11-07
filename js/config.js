// Configuration de la base Supabase.
// Supabase > ton projet > Project Settings > API Keys > Legacy : clé "anon public".
// La clé "anon" est faite pour être publique : la sécurité est assurée par les règles RLS (supabase/schema.sql).
// NE JAMAIS mettre ici la clé "service_role".
// Laisse supabaseAnonKey vide pour utiliser le mode démo (données stockées seulement dans ton navigateur).
window.LUEUR_CONFIG = {
  supabaseUrl: "https://msxtbnvtvdvxvkndkmok.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeHRibnZ0dmR2eHZrbmRrbW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNzEyMjMsImV4cCI6MjEwOTY0NzIyM30.r2bQRSXK6UBnFI73yuh9pIAo3NNaGeNIGAhxTvRKCmg"
};
