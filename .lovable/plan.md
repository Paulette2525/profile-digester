

## Plan : Optimisation Performance + Fix Stats Abonnés/Connexions

### Probleme identifie : Stats Abonnés/Connexions
L'edge function `fetch-account-stats` appelle `GET /api/v1/users/me` sur Unipile mais reçoit des erreurs 504 (timeout). Il faut :
- Ajouter un mecanisme de retry (comme deja fait dans `check-linkedin-connection`)
- Utiliser le bon endpoint Unipile : d'abord lister les comptes (`/api/v1/accounts`) pour trouver le compte LinkedIn, puis recuperer les stats de ce compte specifique via `/api/v1/accounts/{account_id}`
- Retourner des valeurs par defaut en cas d'echec au lieu de crasher la page

### Optimisations Performance (toutes les pages)

**1. Caching agressif avec staleTime**
Ajouter `staleTime: 5-10 min` sur toutes les queries qui n'en ont pas encore :
- `EngagementPage` : config, logs, published posts, DM rules
- `PlanifierPage` : planned-posts
- `SuggestedPostsPage` : virality-analyses, suggested-posts
- `TraitementPage` : virality-analyses
- `MemoirePage` : user-memory, photos, ideas

**2. Limiter les requetes initiales**
- Ajouter `.limit()` sur les queries qui chargent tout (ex: `suggested_posts` dans SuggestedPostsPage charge tous les posts sans limit)
- Ajouter des `.limit(50)` raisonnables partout

**3. Gestion d'erreur gracieuse sur fetch-account-stats**
- Le frontend (`AnalyserPage`) gere deja le cas d'erreur en retournant `{ followers: 0, connections: 0 }` — c'est correct
- Mais l'edge function renvoie un status 500, ce qui affiche des erreurs dans la console. Il faut que la function retourne un fallback 200 avec des valeurs a 0 en cas d'echec Unipile

### Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/fetch-account-stats/index.ts` | Retry + bon endpoint Unipile + fallback gracieux |
| `src/pages/EngagementPage.tsx` | Ajouter staleTime sur toutes les queries |
| `src/pages/PlanifierPage.tsx` | Ajouter staleTime |
| `src/pages/SuggestedPostsPage.tsx` | Ajouter staleTime + limit sur suggested-posts |
| `src/pages/TraitementPage.tsx` | Ajouter staleTime |
| `src/pages/MemoirePage.tsx` | Ajouter staleTime |

### Detail technique : fix fetch-account-stats

```typescript
// 1. Lister les comptes pour trouver le LinkedIn account_id
const accountsRes = await fetchWithRetry(`/api/v1/accounts`, ...);
const linkedin = items.find(a => a.type === "LINKEDIN");

// 2. Recuperer les stats du compte specifique
// Utiliser les champs disponibles dans la reponse accounts
// (followers_count, connections_count sont dans l'objet account)

// 3. En cas d'echec total, retourner 200 avec valeurs a 0
// au lieu de 500 pour ne pas bloquer la page
```

