// Clé "anon" publique : la sécurité est assurée par les règles RLS et l'Edge Function.
// Ne JAMAIS mettre ici la clé service_role.
export const SUPABASE_URL = "https://msxtbnvtvdvxvkndkmok.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeHRibnZ0dmR2eHZrbmRrbW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNzEyMjMsImV4cCI6MjEwOTY0NzIyM30.r2bQRSXK6UBnFI73yuh9pIAo3NNaGeNIGAhxTvRKCmg";
export const API_URL = `${SUPABASE_URL}/functions/v1/api`;
