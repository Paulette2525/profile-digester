

## Plan : Page "Strategie" — Strategie de contenu intelligente

### Objectif
Nouvelle page entre "Traitement" et "Posts Suggeres" qui genere et affiche une strategie de contenu personnalisee basee sur : la memoire utilisateur (objectifs, audience, ton), les analyses de viralite, et les performances des posts publies. La strategie s'adapte automatiquement quand de nouvelles donnees arrivent.

### Architecture

```text
┌──────────────────────────────────────────────┐
│              Page "Strategie"                │
├──────────────────────────────────────────────┤
│  [Generer/Actualiser strategie]              │
│                                              │
│  ┌─ Resume strategique ──────────────────┐   │
│  │ Vision globale + positionnement       │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Piliers de contenu recommandes ──────┐   │
│  │ 3-5 piliers avec % repartition        │   │
│  │ Ex: 40% Expertise, 30% Storytelling   │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Calendrier type (semaine) ───────────┐   │
│  │ Lundi: Post expertise technique       │   │
│  │ Mercredi: Storytelling personnel      │   │
│  │ Vendredi: Carousel resultats          │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Formats gagnants ───────────────────┐    │
│  │ Basé sur performances reelles         │   │
│  │ "Les posts storytelling ont +45%      │   │
│  │  d'engagement vs moyenne"             │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Themes a exploiter ─────────────────┐    │
│  │ Sujets chauds + recyclage des posts   │   │
│  │ qui ont cartonne sous nouvelle forme   │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Fonctionnement
1. L'edge function `generate-strategy` collecte : memoire utilisateur, toutes les analyses de viralite, et les performances des posts publies (likes, comments, shares)
2. Elle envoie tout a OpenRouter (Claude) avec un prompt strategique qui demande une strategie structuree en JSON
3. Le resultat est stocke dans une nouvelle table `content_strategy` pour ne pas regenerer a chaque visite
4. Quand de nouveaux posts sont publies ou analyses, un bouton "Actualiser" regenere la strategie avec les nouvelles donnees
5. Les posts qui ont bien performe sont identifies et proposes sous de nouvelles formes (recyclage)

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Table `content_strategy` (id, user_id, strategy_json, created_at, updated_at) |
| `supabase/functions/generate-strategy/index.ts` | Edge function qui genere la strategie via OpenRouter |
| `src/pages/StrategiePage.tsx` | Page complete avec affichage de la strategie |
| `src/App.tsx` | Ajouter route `/strategie` entre traitement et posts-suggeres |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien "Strategie" dans le workflow, entre Traitement et Posts Suggeres |

### Structure de la strategie generee (JSON)

```text
{
  "summary": "Vision strategique globale...",
  "positioning": "Comment se positionner...",
  "content_pillars": [
    { "name": "Expertise technique", "percentage": 40, "description": "..." },
    { "name": "Storytelling", "percentage": 30, "description": "..." },
    ...
  ],
  "weekly_calendar": [
    { "day": "Lundi", "type": "Expertise", "suggestion": "..." },
    ...
  ],
  "winning_formats": [
    { "format": "Storytelling personnel", "avg_engagement": 245, "recommendation": "..." }
  ],
  "themes_to_explore": ["...", "..."],
  "recycling_opportunities": [
    { "original_post_excerpt": "...", "new_angle": "...", "why": "..." }
  ]
}
```

### Section technique

- La table `content_strategy` a RLS `auth.uid() = user_id`
- L'edge function collecte les top 10 posts publies par engagement (likes+comments+shares) pour identifier les patterns gagnants
- Le prompt demande explicitement de recycler les posts performants sous de nouvelles formes
- `staleTime: 10min` sur la query frontend pour eviter les appels inutiles
- Le bouton dans la sidebar utilise l'icone `Lightbulb` de lucide-react

