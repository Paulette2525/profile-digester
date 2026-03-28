

## Corriger l'extraction des compteurs d'engagement (likes, commentaires, partages)

### Probleme
Tous les posts ont `likes_count: 0`, `comments_count: 0`, `shares_count: 0` en base. Le mapping actuel utilise `||` (OR logique) qui en JavaScript traite `0` comme falsy -- donc si Unipile renvoie `0` pour un champ, il passe au suivant et finit a `0`. De plus, les noms de champs Unipile sont probablement differents de ceux testes.

### Solution

**1. Ajouter un log diagnostic dans `fetch-profile-posts`**
- Logger le premier post brut recu d'Unipile (`console.log(JSON.stringify(items[0]))`) pour identifier les vrais noms de champs des compteurs
- Deployer et invoquer pour un profil, puis lire les logs

**2. Corriger le mapping des compteurs dans les deux edge functions**
- Remplacer les `||` par des verifications explicites avec `??` (nullish coalescing) et `typeof` pour ne pas ignorer la valeur `0`
- Ajouter les champs Unipile courants: `social_counts.num_likes`, `social_counts.num_comments`, `social_counts.num_shares`, `reactions.total_count`, `engagement.likes`
- Pattern corrige :
```typescript
likes_count: post.social_counts?.num_likes 
  ?? post.likes_count ?? post.reactions_count ?? post.num_likes ?? 0,
```

**3. Ajouter une colonne `impressions_count` a la table `linkedin_posts`**
- Migration SQL pour ajouter `impressions_count integer DEFAULT 0`
- Mapper depuis `post.views_count`, `post.impressions`, `post.social_counts?.num_impressions`

**4. Mettre a jour le PostCard pour afficher les impressions**
- Ajouter une icone Eye avec le compteur d'impressions

### Fichiers concernes
- `supabase/functions/fetch-profile-posts/index.ts` (log + fix mapping)
- `supabase/functions/sync-linkedin/index.ts` (fix mapping)
- Migration SQL (ajout `impressions_count`)
- `src/components/dashboard/PostCard.tsx` (afficher impressions)
- `src/components/dashboard/StatsCards.tsx` (ajout stat impressions)

### Approche
Etape 1 : deployer avec le log diagnostic, invoquer, lire les logs pour confirmer les noms de champs. Etape 2 : corriger le mapping et re-extraire les posts.

