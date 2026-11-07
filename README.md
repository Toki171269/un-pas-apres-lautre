# Un pas après l'autre — plateforme anonyme d'écoute et de soutien

*One step at a time · Paso a paso* — français, anglais, espagnol.

Un espace sans inscription pour parler, être écouté, lire les histoires des autres, aider, et trouver des ressources quand on traverse une épreuve.

- Site : https://toki171269.github.io/un-pas-apres-lautre/
- Modération : https://toki171269.github.io/un-pas-apres-lautre/#/admin

## Fonctionnalités (version 1 du cahier des charges)

| Domaine | Ce qui existe |
|---|---|
| Accueil | Message d'accueil, mission, choix facultatif de situation (13 dont « Je ne sais pas »), « Aide-moi à traverser cette journée », mots réconfortants, espaces |
| Navigation | Accueil · Parler avec l'IA · Communauté · Déposer son histoire · Histoires d'espoir · Aider quelqu'un · Ressources, + bouton « J'ai besoin d'aide maintenant » et bandeau d'urgence permanents, « Quitter vite » (ou Échap ×3) |
| Communauté | Fil avec modes (récentes, sans réponse, avec réponses, espoir) et filtre par situation ; 5 espaces thématiques + histoires d'espoir ; réponses sur 2 niveaux ; 5 réactions de soutien (jamais utilisées pour classer) ; bougies dans l'espace Deuil |
| Publication | Titre, texte, situation, espace, pseudonyme aléatoire, réponses autorisées ou non ; histoires d'espoir structurées avec consentement ; **code de gestion secret** pour modifier/supprimer (seule son empreinte SHA-256 est stockée) |
| Encouragements | Mur, message mis en avant aléatoire, bouton « J'avais besoin de lire cela aujourd'hui » |
| Compagnon IA « Lueur » | Claude via l'API Anthropic, en streaming, sans compte ni mémoire (onglet seulement), suggestions, copier/effacer/recommencer, détection de crise (règles + IA) avec panneau d'urgence indépendant de l'IA, suggestions d'espaces/exercices/ressources |
| Ressources | 11 guides, respiration guidée, ancrage 5-4-3-2-1, lettre jamais envoyée avec aide de l'IA, préparation de consultation (téléchargeable), annuaire par pays (sélecteur manuel, sans géolocalisation) |
| Sécurité | Modération hybride (règles + IA, mise en attente des contenus douteux, priorité 0–3), signalements avec 9 motifs et priorité, retrait automatique après signalements, anti-spam par empreinte d'IP salée (effacée après 24 h), plafond quotidien de messages IA |
| Administration | Connexion Supabase Auth, file « À traiter » par priorité, signalements, publications par statut, journal de modération, statistiques anonymes |

## Architecture

- **Frontend** : React + Vite + Tailwind CSS (`src/`), publié sur GitHub Pages par `.github/workflows/deploy.yml` à chaque `git push`.
- **Base** : Supabase PostgreSQL (`supabase/schema.sql`). Le public ne peut que **lire** les contenus visibles (RLS + colonnes autorisées).
- **API** : Edge Function Supabase `api` (`supabase/functions/api/index.ts`). Toutes les écritures publiques y passent : modération, anti-spam, codes secrets, signalements, IA.
- **IA** : SDK `@anthropic-ai/sdk`, modèle `claude-haiku-5-5` par défaut (secret `CLAUDE_MODEL` pour changer).

## Installation (une seule fois)

1. **Base** — Supabase > SQL Editor : exécuter `supabase/reset_v1.sql` (une seule fois, retire les tables vides de la v1), puis `supabase/schema.sql`.
2. **Edge Function** — Supabase > Edge Functions > *Deploy a new function* > nom `api`, coller `supabase/functions/api/index.ts`.
3. **Clé Claude** — créer une clé sur https://console.anthropic.com (et fixer une limite de dépense), puis Supabase > Edge Functions > *Secrets* : `ANTHROPIC_API_KEY`. Facultatif : `CLAUDE_MODEL`, `CHAT_DAILY_LIMIT` (défaut 2000/jour), `IP_SALT` (une phrase aléatoire).
4. **Compte de modération** — Supabase > Authentication > Users > *Add user* (ton email + mot de passe fort), puis dans le SQL Editor :
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'ton@email';
   ```
   Désactive les inscriptions publiques : Authentication > Sign In / Providers > *Allow new users to sign up* = off.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173/un-pas-apres-lautre/
npm run build
```

## Contenu à faire vérifier avant de faire connaître le site

- Les **numéros d'écoute** (`src/lib/data.js`, date `HELP_UPDATED`) : à confirmer sur les sites officiels de chaque pays.
- Les **guides** (`src/i18n/*.js` > `res.guides`) : relecture par un·e professionnel·le de santé mentale recommandée.
- Les **traductions** anglaise et espagnole : relecture par des locuteurs natifs.
- Les **consignes de l'IA** (`supabase/functions/api/index.ts` > `companionPrompt`) : à tester avec des scénarios variés, y compris de crise.

## Limites connues

- La détection automatique des crises est imparfaite : les ressources d'urgence restent toujours visibles, indépendamment de l'IA.
- Aucune surveillance humaine permanente : la modération dépend de la disponibilité de l'équipe.
- Supabase gratuit met le projet en pause après ~7 jours sans activité.
- Version 2 (non incluse) : mise en relation avec des écoutants bénévoles, groupes de soutien, bibliothèque audio.
