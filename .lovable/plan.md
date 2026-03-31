

## Plan : Mode Autopilote avec Veille Temps Reel

### Vision

Transformer la plateforme d'un outil manuel (5 etapes avec validation) en un agent autonome qui tourne quotidiennement : veille tendances → analyse → generation → planification → publication. L'utilisateur ne fait que configurer et valider occasionnellement.

### Architecture du mode Autopilote

```text
CRON quotidien (06:00 UTC)
    │
    ├─ 1. Veille tendances (Perplexity API)
    │     → Recherche les sujets trending dans l'industrie de l'utilisateur
    │     → Analyse les meilleurs posts LinkedIn du moment
    │
    ├─ 2. Contexte enrichi
    │     → Lecture complete de la Memoire (instructions, histoire, ton)
    │     → Posts performants des profils suivis (contenu complet)
    │     → Historique des posts deja generes (eviter les doublons)
    │     → Performances des posts publies (apprendre ce qui marche)
    │
    ├─ 3. Generation intelligente
    │     → Prompt restructure avec TOUTES les donnees
    │     → Continuite logique entre posts (fil narratif)
    │     → Mix de longueurs, ton humain, style des profils suivis
    │
    ├─ 4. Planification auto
    │     → Attribution des creneaux selon le calendrier configure
    │     → Status = "scheduled" directement (pas de brouillon)
    │
    └─ 5. Publication auto (cron existant toutes les 15 min)
          → Publie les posts dont l'heure est arrivee
```

### API recommandee : Perplexity

Perplexity est disponible comme connecteur et offre une recherche web en temps reel avec des reponses contextualisees. Ideal pour :
- Trouver les tendances du moment dans un domaine (IA, tech, business...)
- Analyser ce qui buzz sur LinkedIn, Reddit, Twitter
- Obtenir des donnees factuelles fraiches pour enrichir les posts

### Modifications

**1. Connecter Perplexity** — Lier le connecteur au projet pour la veille temps reel

**2. Nouvelle Edge Function `autopilot-run/index.ts`** — Le coeur du systeme :
- Appelle Perplexity pour chercher les tendances du jour dans l'industrie de l'utilisateur
- Charge TOUTE la memoire, les profils suivis, les posts performants, l'historique des posts generes
- Charge les performances des posts publies pour apprendre
- Genere N posts/jour selon la config autopilote
- Prompt completement restructure : instructions de redaction en priorite absolue, tendances du jour, style des profils suivis, continuite avec les posts precedents
- Planifie automatiquement aux creneaux configures
- Stocke les tendances utilisees dans une nouvelle table pour eviter les repetitions

**3. Nouvelle table `autopilot_config`** — Configuration du mode automatique :
- `enabled` (boolean) — activer/desactiver
- `posts_per_day` (integer) — nombre de posts par jour
- `active_days` (text[]) — jours actifs (lundi-dimanche)
- `posting_hours` (integer[]) — heures de publication (ex: [9, 12, 17])
- `industries_to_watch` (text[]) — sujets a surveiller
- `approval_mode` (text) — "auto" (publie directement) ou "review" (status draft pour validation)
- `last_run_at` (timestamp)

**4. Nouvelle table `trend_insights`** — Stocker les tendances detectees :
- `topic`, `source`, `summary`, `used` (boolean), `created_at`

**5. Nouvelle page `AutopilotPage.tsx`** — Interface de configuration :
- Toggle ON/OFF pour le mode autopilote
- Configuration des jours, heures, frequence
- Sujets/industries a surveiller
- Mode approbation (auto vs review)
- Historique des executions avec statut
- Apercu des tendances detectees

**6. Cron job pour l'autopilote** — Declenchement quotidien a 06:00 UTC via pg_cron

**7. Restructuration du prompt dans `generate-posts`** — Ameliorations majeures :
- Injecter les tendances du jour de Perplexity
- Ajouter le contexte des 10 derniers posts generes pour assurer la continuite logique
- Ajouter les performances reelles des posts publies (quels sujets/styles ont le mieux marche)
- Renforcer encore les instructions de redaction comme priorite absolue
- Demander explicitement un fil narratif entre les posts

**8. Sidebar** — Ajouter "Autopilote" dans la section Automation

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Tables `autopilot_config` et `trend_insights` |
| `supabase/functions/autopilot-run/index.ts` | Nouveau — moteur principal du mode automatique |
| `src/pages/AutopilotPage.tsx` | Nouveau — page de configuration autopilote |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien Autopilote |
| `src/App.tsx` | Ajouter route /autopilote |
| `supabase/functions/generate-posts/index.ts` | Accepter les tendances en param, ameliorer continuite |
| Cron SQL (insert direct) | Planifier l'execution quotidienne |

### Flux utilisateur simplifie

1. L'utilisateur remplit sa Memoire (une seule fois)
2. Il ajoute des profils a suivre (une seule fois)
3. Il active l'Autopilote et configure ses preferences
4. La plateforme fait tout le reste : veille → generation → planification → publication
5. L'utilisateur peut consulter les posts generes et ajuster si besoin

