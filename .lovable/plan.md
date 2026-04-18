

The user wants a new "Engagé" feature that:
1. Lets them add target LinkedIn profiles to follow
2. Automatically likes and comments on every new post from those profiles
3. Shows statistics of interactions performed

Let me check existing patterns to design this properly. I already know:
- `tracked_profiles` exists for profile tracking via Unipile
- `auto_engagement_logs` exists for logging actions
- `auto_engagement_config` for global engagement settings
- Unipile API is used (DSN api36.unipile.com:16657)
- Cron jobs run via pg_cron + pg_net
- Lovable AI for comment generation

The new feature is distinct from current `auto_engagement` (which targets *commenters on my own posts*). This new one targets *posts of selected profiles*.

Plan:

## Plan : Module "Engagé" — Auto-engagement sur profils cibles

### Concept
Vous sélectionnez une liste de profils LinkedIn. Toutes les heures, le système détecte leurs nouvelles publications et y réagit automatiquement (like + commentaire IA personnalisé). Une page de stats centralise toutes les interactions effectuées.

### 1. Base de données (nouvelle migration)

**Table `engaged_profiles`** — profils cibles sur lesquels engager
- `id`, `user_id`, `linkedin_url`, `name`, `avatar_url`, `headline`, `unipile_provider_id`
- `auto_like` bool (défaut true), `auto_comment` bool (défaut true)
- `comment_tone` text (`professionnel` | `amical` | `expert` | `enthousiaste`)
- `is_active` bool, `last_checked_at`, `created_at`
- RLS : `auth.uid() = user_id`

**Table `engaged_interactions`** — log de chaque interaction
- `id`, `user_id`, `engaged_profile_id`, `linkedin_post_id` (id Unipile du post cible)
- `post_content_preview` text, `post_url` text
- `action_type` (`like` | `comment`), `comment_text` text
- `status` (`success` | `error`), `error_message`
- `created_at`
- Index unique sur (`user_id`, `linkedin_post_id`, `action_type`) pour éviter les doublons
- RLS : `auth.uid() = user_id`

**Table `engaged_config`** — réglages globaux
- `id`, `user_id` unique
- `enabled` bool, `check_frequency_minutes` int (défaut 60)
- `comment_prompt` text (template système IA)
- `daily_comment_limit` int (défaut 30, sécurité anti-blocage LinkedIn)
- `delay_between_actions_seconds` int (défaut 30)

### 2. Edge Functions

**`engaged-search-profile`** — recherche un profil LinkedIn par URL via Unipile pour récupérer name/avatar/headline/provider_id avant insertion.

**`engaged-run`** — boucle principale (déclenchée par cron + bouton "Lancer maintenant") :
1. Charge `engaged_config` (skip si disabled)
2. Pour chaque profil actif, récupère les posts récents via Unipile (`/api/v1/users/{provider_id}/posts?limit=5`)
3. Filtre les posts non encore traités (LEFT JOIN `engaged_interactions`)
4. Si `auto_like` : POST `/api/v1/posts/{post_id}/reactions` `{type: "LIKE"}`, log dans `engaged_interactions`
5. Si `auto_comment` : appel Lovable AI (`google/gemini-3-flash-preview`) avec contexte (contenu post + ton + prompt) pour générer un commentaire pertinent (1-2 phrases naturelles), puis POST `/api/v1/posts/{post_id}/comments`
6. Respecte `delay_between_actions_seconds` entre actions, stoppe si `daily_comment_limit` atteint
7. Catch erreurs Unipile 503/504 → log + continue (pattern résilience existant)

### 3. Cron job
`select cron.schedule('engaged-run-hourly', '0 * * * *', ...)` qui appelle `engaged-run` toutes les heures.

### 4. Frontend — `/engage`

Nouvelle page `EngagePage.tsx` ajoutée au sidebar (icône Heart/Sparkles) sous "Engagement". Structure en 3 onglets :

**Onglet 1 — Profils**
- Bouton "Ajouter un profil" → dialog avec input URL LinkedIn + recherche → preview (avatar/nom/headline) → toggle auto_like + auto_comment + sélecteur ton → confirmer
- Liste cards : avatar, nom, headline, switches actifs, dropdown actions (éditer / désactiver / supprimer)
- Compteur "X profils suivis"

**Onglet 2 — Statistiques**
- 4 KPI cards : Total interactions / Likes effectués / Commentaires postés / Taux de succès
- Graph "Interactions / jour" (recharts LineChart, 30 derniers jours)
- Top 5 profils les plus engagés (table)
- Liste des 50 dernières interactions avec aperçu post + commentaire envoyé + statut

**Onglet 3 — Réglages**
- Switch "Activer Engagé"
- Slider fréquence (15/30/60/120 min)
- Slider limite quotidienne commentaires (5-100)
- Slider délai entre actions (10-120s)
- Textarea prompt système commentaire
- Bouton "Lancer maintenant" qui invoke `engaged-run` manuellement

### 5. Navigation
- Ajout entrée "Engagé" dans `AppSidebar.tsx` (icône `Heart`)
- Ajout route `/engage` dans `App.tsx` sous `ProtectedLayout`
- Mise à jour mémoire `mem://style/navigation` (passage à 11 piliers)

### Stack technique
- Réutilise UNIPILE_API_KEY + UNIPILE_DSN existants
- Réutilise LOVABLE_API_KEY (Lovable AI) — pas de nouveau secret
- Pattern résilience 503/504 → 200 OK degraded (cf mémoire)
- Index `engaged_interactions(user_id, linkedin_post_id, action_type)` UNIQUE pour idempotence

### Sécurité
- RLS strict sur les 3 tables
- Edge function `engaged-run` valide JWT et ne traite que les profils du user
- Limite quotidienne configurable pour éviter le shadowban LinkedIn
- Prompt IA cadré pour éviter spam/promotion

