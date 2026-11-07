# Lueur — un refuge quand tout est sombre

Site web anonyme et bienveillant pour les personnes qui traversent une épreuve : deuil, cœur brisé, solitude, dépression, angoisse, maladie, violence, effondrement.

## Fonctionnalités

| Section | Description | Données |
|---|---|---|
| Bandeau d'urgence | 112 / 3114 toujours visibles | — |
| La lumière du jour | Un message d'espoir par jour | — |
| Ce que je traverse | 8 épreuves : mots de validation, « c'est normal », 3 petits pas à cocher, quand demander de l'aide | navigateur |
| Respirer | Cercle guidé (cohérence 5-5, respiration carrée) | — |
| Le mur des fardeaux | Messages anonymes, 🤍 de soutien, mots doux, signalement | **base** |
| Bougies | Allumer une bougie en mémoire de quelqu'un | **base** |
| Lettre jamais envoyée | Écrire puis « laisser partir » (rien n'est enregistré) | — |
| Lignes d'écoute | France, Belgique, Suisse, Canada + international | — |
| Sécurité | Bouton « Quitter vite » (ou Échap ×3), fenêtre de soutien si un message contient des mots de détresse | — |

Pile : HTML/CSS/JS sans build · base **Supabase** (PostgreSQL gratuit) · hébergement statique gratuit (Netlify, Vercel ou GitHub Pages).

Sans configuration, le site fonctionne en **mode démo** (données dans le navigateur uniquement).

## Tester en local

```bash
npx http-server -p 5173 -c-1 .
```
Puis ouvrir http://localhost:5173

## 1. Créer la base (Supabase, gratuit)

1. Crée un compte sur https://supabase.com → **New project** (région Europe, ex. Paris/Frankfurt).
2. Menu **SQL Editor** → **New query** → colle le contenu de [supabase/schema.sql](supabase/schema.sql) → **Run**.
3. Menu **Project Settings → API** : copie **Project URL** et la clé **anon public**.
4. Colle-les dans [js/config.js](js/config.js) :
   ```js
   window.LUEUR_CONFIG = {
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "eyJhbGciOi..."
   };
   ```
   La clé `anon` est publique par nature ; la sécurité vient des règles RLS du schéma (lecture des messages visibles, ajout seulement, aucune modification ni suppression publique, 5 publications / 10 min par IP, masquage auto à 3 signalements).
   **Ne mets jamais la clé `service_role` dans le site.**

> Le plan gratuit met le projet en pause après ~7 jours sans aucune visite ; il suffit de le relancer depuis le tableau de bord.

## 2. Mettre en ligne (gratuit)

**Option A — Netlify Drop (le plus simple, 1 minute)**
1. Va sur https://app.netlify.com/drop (compte gratuit).
2. Glisse-dépose le dossier `Projet` entier. C'est en ligne (`https://xxx.netlify.app`).
3. Pour mettre à jour : *Deploys* → glisse à nouveau le dossier.

**Option B — GitHub + Vercel/Netlify (mises à jour automatiques)**
1. Crée un dépôt GitHub et pousse ce dossier.
2. Sur https://vercel.com (ou Netlify) → *Add New Project* → importe le dépôt → Framework : **Other**, pas de commande de build → *Deploy*.
3. Chaque `git push` redéploie le site.

**Option C — GitHub Pages** : dépôt → *Settings → Pages* → Source `main` / racine.

## Modération

Dans Supabase → SQL Editor :
```sql
select * from posts where reports > 0 order by reports desc;      -- contenus signalés
update posts set hidden = false, reports = 0 where id = '...';    -- ré-afficher
delete from posts where id = '...';                               -- supprimer
```
Ou directement dans **Table Editor**.

## Personnaliser

Tous les textes (épreuves, messages d'espoir, numéros d'écoute, mots de détresse) sont dans [js/content.js](js/content.js). Pense à vérifier les numéros d'écoute régulièrement et à ajouter ceux de ton pays.
