

## Plan : Diversité garantie des types de posts + Page Engagement fonctionnelle

### Problème 1 : L'Autopilot génère des doublons de type

**Cause racine** : La logique de distribution des slots (lignes 101-114 de `autopilot-run`) utilise `Math.round` sur les pourcentages du content mix, ce qui produit des doublons. Par exemple, avec 4 posts et un mix 30/25/25/20, on obtient news×1, tutorial×1, viral×1, storytelling×1 — mais si le mix est 50/20/20/10, on peut avoir news×2, tutorial×1, viral×1.

**Fix** : Remplacer la logique de distribution par une règle simple : chaque type actif dans le mix (pourcentage > 0) reçoit exactement 1 slot, puis les slots restants sont distribués aux types avec le plus gros pourcentage, sans jamais dépasser 1 de plus que les autres. Si `posts_per_day = 4` et 4 types actifs → 1 de chaque. Si `posts_per_day = 2` et 4 types actifs → prendre les 2 types avec le plus gros pourcentage.

De plus, renforcer le prompt IA pour exiger une créativité maximale et des posts radicalement différents les uns des autres.

### Problème 2 : La page Engagement ne fonctionne pas

**Cause** : La page Engagement (`EngagementPage.tsx`) est la page d'auto-engagement (likes/DM automatiques). Ce n'est pas la page qui affiche les statistiques de performance des posts. Les stats de performance (likes, commentaires, impressions) sont gérées par `fetch-post-stats` qui écrit dans `post_performance` sur `suggested_posts`. 

Le problème est que `fetch-post-stats` n'est probablement jamais appelé automatiquement, et la réconciliation textuelle (match par les 80 premiers caractères) peut échouer si le contenu est légèrement modifié lors de la publication.

**Fix** : 
1. Stocker le `unipile_post_id` retourné par Unipile lors de la publication dans `publish-scheduled-post` → le sauvegarder dans `suggested_posts` (ajouter la colonne si absente)
2. Dans `fetch-post-stats`, matcher d'abord par `unipile_post_id` (exact), puis par contenu en fallback
3. Appeler `fetch-post-stats` automatiquement via le cron existant ou un nouveau cron dédié

### Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/autopilot-run/index.ts` | Nouvelle logique de slots : 1 type unique par slot, prompt créativité renforcé |
| `supabase/functions/fetch-post-stats/index.ts` | Matcher par `unipile_post_id` d'abord, filtrer par `user_id` |
| `supabase/functions/publish-scheduled-post/index.ts` | Sauvegarder le `unipile_post_id` retourné dans `suggested_posts` |
| Migration SQL | Ajouter colonne `unipile_post_id` à `suggested_posts` si absente + cron pour fetch-post-stats |

### Section technique

- Distribution des slots : trier les types actifs par poids décroissant, assigner round-robin jusqu'à remplir `posts_per_day`, chaque type ne peut apparaître qu'une seule fois tant que tous les types n'ont pas eu leur slot
- Le prompt IA recevra une instruction explicite : "Chaque post DOIT être radicalement différent — sujet différent, angle différent, structure différente, ton différent"
- `fetch-post-stats` sera appelé toutes les 30 minutes par un cron `pg_cron` pour synchroniser les stats en continu

