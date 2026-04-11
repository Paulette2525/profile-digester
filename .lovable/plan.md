

## Plan : Actualisation en temps reel de la page Performance

### Probleme

La page Performance ne se met a jour que lors du chargement initial ou quand on clique manuellement sur "Actualiser". Les commentaires, likes et autres donnees ne se rafraichissent pas automatiquement.

### Solution

1. **Migration SQL** : Activer le realtime sur les tables `suggested_posts` et `account_stats_history`
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE suggested_posts;
   ALTER PUBLICATION supabase_realtime ADD TABLE account_stats_history;
   ```

2. **`src/pages/AnalyserPage.tsx`** : Ajouter des abonnements realtime Supabase qui invalident les queries React Query quand les donnees changent
   - Ecouter les changements sur `suggested_posts` (filtre `user_id`) pour rafraichir les stats de performance (likes, commentaires, partages, impressions)
   - Ecouter les changements sur `account_stats_history` pour rafraichir le graphique de croissance
   - Nettoyage des channels au unmount du composant

### Section technique

- Utilisation de `supabase.channel()` avec `postgres_changes` event `*` sur chaque table
- Dans le callback, appel de `queryClient.invalidateQueries()` sur les query keys correspondantes (`published-posts-analysis`, `account-stats-history`, `account-stats`)
- Import de `useQueryClient` depuis `@tanstack/react-query`
- Ajout d'un `useEffect` avec cleanup pour les subscriptions

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter realtime sur 2 tables |
| `src/pages/AnalyserPage.tsx` | Ajouter subscriptions realtime + useQueryClient |

