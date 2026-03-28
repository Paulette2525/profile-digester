

## Ajout de 5 onglets : Dashboard, Traitement, Posts Suggeres, Planifier, Analyser

### Architecture

On ajoute une barre de navigation par onglets en haut du dashboard (sous le header). Chaque onglet correspond a une page/route distincte. Le systeme utilise Lovable AI pour l'analyse de viralite et la generation de posts.

```text
[Dashboard] [Traitement] [Posts Suggeres] [Planifier] [Analyser]
     |            |              |              |           |
  Actuel    Analyse IA      Generation IA   Calendrier   Stats post-pub
```

### Nouvelles tables (migrations)

1. **`virality_analyses`** : stocke les resultats d'analyse de viralite
   - `id`, `created_at`, `profile_id` (nullable, null = global), `analysis_json` (jsonb contenant facteurs, scores, exemples), `status` (pending/done/error)

2. **`suggested_posts`** : posts generes par l'IA
   - `id`, `created_at`, `content` (texte du post), `topic`, `virality_score` (integer), `source_analysis_id` (ref virality_analyses), `status` (draft/scheduled/published), `scheduled_at` (timestamp nullable), `published_at` (timestamp nullable), `post_performance` (jsonb nullable pour stocker les stats apres publication)

### Nouvelles edge functions

1. **`analyze-virality`** : recoit `{ profile_ids?: string[] }`, recupere les 10 meilleurs posts (par engagement) de chaque profil depuis la base, les envoie a Lovable AI (gemini-3-flash-preview) avec un prompt d'analyse de viralite, stocke le resultat dans `virality_analyses`

2. **`generate-posts`** : recoit `{ analysis_id: string, count?: number }`, lit l'analyse de viralite, envoie a Lovable AI pour generer des posts originaux inspires des facteurs identifies, stocke dans `suggested_posts`

3. **`schedule-posts`** : recoit `{ post_ids: string[], schedule: { post_id, scheduled_at }[] }`, met a jour `suggested_posts` avec les dates de planification et le status "scheduled"

4. **`publish-scheduled-post`** : publie un post sur LinkedIn via l'API Unipile (`POST /api/v1/posts`), met a jour le status en "published"

### Nouvelles pages

1. **`/traitement`** - `TraitementPage.tsx`
   - Bouton "Lancer l'analyse" qui appelle `analyze-virality`
   - Affiche les facteurs de viralite en cards (hooks, structure, CTA, longueur, type de media)
   - Graphiques : bar chart des facteurs les plus correles a l'engagement, radar chart du profil de viralite
   - Liste des posts exemples avec leur score

2. **`/posts-suggeres`** - `SuggestedPostsPage.tsx`
   - Bouton "Generer des posts" qui appelle `generate-posts`
   - Cards avec chaque post suggere : contenu complet, score de viralite estime, topic
   - Boutons par post : "Copier", "Modifier", "Planifier"
   - Champ d'edition inline pour ajuster le contenu avant planification

3. **`/planifier`** - `PlanifierPage.tsx`
   - Vue calendrier/timeline des posts planifies
   - Drag & drop ou selection de date/heure pour chaque post
   - Bouton "Publier maintenant" et "Planifier"
   - Statuts visuels : brouillon, planifie, publie

4. **`/analyser`** - `AnalyserPage.tsx`
   - Liste des posts publies avec leurs performances reelles (likes, commentaires, partages)
   - Comparaison score predit vs reel
   - Graphiques d'evolution des performances

### Modifications existantes

- **`AppLayout.tsx`** : ajouter les 5 onglets dans la navigation (icons : LayoutDashboard, Zap, PenLine, Calendar, BarChart3)
- **`App.tsx`** : ajouter les 4 nouvelles routes

### Cron pour publication automatique

- Ajouter un cron job toutes les 15 minutes qui appelle `publish-scheduled-post` pour publier les posts dont `scheduled_at <= now()` et `status = 'scheduled'`

### Fichiers concernes

- 2 migrations SQL (tables `virality_analyses`, `suggested_posts`)
- 4 edge functions (`analyze-virality`, `generate-posts`, `schedule-posts`, `publish-scheduled-post`)
- 4 pages (`TraitementPage`, `SuggestedPostsPage`, `PlanifierPage`, `AnalyserPage`)
- `AppLayout.tsx` (navigation)
- `App.tsx` (routes)

### Ordre d'implementation

1. Migrations DB
2. Edge functions (analyze-virality, generate-posts, schedule-posts, publish-scheduled-post)
3. Navigation + routes
4. Pages UI une par une
5. Cron publication auto

