

## Plan : Fix extraction timeout sur fetch-profile-posts

### Probleme identifie

L'edge function `fetch-profile-posts` timeout (erreur "connection closed before message completed"). La fonction essaie de :
1. Recuperer jusqu'a 5 pages de 100 posts
2. Pour CHAQUE post, faire une requete supplementaire pour les commentaires
3. Pour chaque commentaire, faire un upsert individuel

Avec des centaines de posts, ca fait des centaines de requetes HTTP sequentielles — bien au-dela du timeout de 60s des edge functions.

### Solution

**Reduire le travail par appel et supprimer le fetch des commentaires du flux principal :**

1. **Limiter a 1-2 pages max par defaut** au lieu de 5, et ne PAS fetcher les commentaires dans le meme appel
2. **Batching des inserts** : utiliser `upsert` en batch au lieu d'un insert/update par post
3. **Ajouter le user_id** aux posts inseres (actuellement manquant — les posts inseres n'ont pas de `user_id`, donc RLS les bloquera en lecture)
4. **Timeout protection** : ajouter un AbortController avec timeout de 50s sur les appels Unipile

### Fichier a modifier

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/fetch-profile-posts/index.ts` | Supprimer le fetch des commentaires, batching upsert, ajouter user_id, limiter pages, timeout protection |

### Section technique

- Remplacer la boucle insert/update individuelle par `supabase.from("linkedin_posts").upsert(batch, { onConflict: "unipile_post_id,profile_id" })` — necessite un index unique sur `(unipile_post_id, profile_id)`
- Migration SQL : `CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_posts_unipile ON linkedin_posts(unipile_post_id, profile_id)`
- Ajouter `user_id` au postData en le recuperant depuis le profile
- Reduire `max_pages` default de 5 a 2
- Supprimer entierement la section fetch commentaires (lignes 183-221) — les commentaires pourront etre charges a la demande plus tard
- Ajouter `AbortSignal.timeout(25000)` sur chaque fetch Unipile pour eviter les blocages

