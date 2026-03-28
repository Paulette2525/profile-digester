

## Auto-Engagement LinkedIn : Reponses, Messages Prives, Likes

### Objectif
Ajouter 3 fonctionnalites d'engagement automatique sur les commentaires recus sur les posts LinkedIn publies, pilotees via Unipile + OpenRouter (Claude) pour la generation de reponses.

### Architecture

```text
┌─────────────────────────────────────────────┐
│           Page "Engagement"                  │
│  ┌───────────┬───────────┬────────────────┐  │
│  │ Auto-Reply│ Auto-DM   │ Auto-Like      │  │
│  │ ON/OFF    │ ON/OFF    │ ON/OFF         │  │
│  ├───────────┴───────────┴────────────────┤  │
│  │ Historique des actions automatiques     │  │
│  │ - Reponse a X sur post Y               │  │
│  │ - DM envoye a Z                        │  │
│  │ - Like sur commentaire de W            │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Etape 1 : Table `auto_engagement_config` + `auto_engagement_logs`

**Migration SQL :**
- `auto_engagement_config` : stocke les toggles (auto_reply, auto_dm, auto_like), le prompt personnalise pour les reponses, le template DM
- `auto_engagement_logs` : historique des actions (type, post_id, comment_id, author, texte envoye, statut, timestamp)

### Etape 2 : Edge Function `auto-engage-comments`

Logique :
1. Recupere les commentaires recents non traites via Unipile (`GET /api/v1/posts/{id}/comments`)
2. Pour chaque commentaire non encore dans `auto_engagement_logs` :
   - **Auto-like** : `POST /api/v1/posts/comments/{comment_id}/reactions` via Unipile
   - **Auto-reply** : Genere une reponse contextuelle via OpenRouter (Claude) puis `POST /api/v1/posts/{post_id}/comments` via Unipile
   - **Auto-DM** : Envoie un message prive via `POST /api/v1/chats` (creation de chat) puis `POST /api/v1/chats/{chat_id}/messages` via Unipile
3. Log chaque action dans `auto_engagement_logs`

### Etape 3 : Page UI `/engagement`

- 3 toggles (auto-reply, auto-dm, auto-like) avec switch ON/OFF
- Champ textarea pour le prompt de reponse et le template DM
- Tableau/liste des actions recentes avec statut (succes/erreur)
- Bouton "Executer maintenant" pour declencher manuellement

### Etape 4 : Navigation

- Ajouter "Engagement" dans le groupe "Automation" de la sidebar (nouvelle section)
- Route `/engagement` dans App.tsx avec lazy loading

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer 2 tables |
| `supabase/functions/auto-engage-comments/index.ts` | Creer |
| `src/pages/EngagementPage.tsx` | Creer |
| `src/App.tsx` | Ajouter route |
| `src/components/layout/AppSidebar.tsx` | Ajouter section "Automation" |

### Ce qui ne change pas
- Les edge functions existantes (sync, publish, analyze, generate)
- Les pages existantes
- La base de donnees existante

