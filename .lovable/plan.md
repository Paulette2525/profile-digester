

## Amelioration de l'extraction des publications LinkedIn

### Problemes identifies
1. **Contenu tronque** : Le PostCard tronque le contenu a 280 caracteres, et le contenu complet n'est pas accessible
2. **Medias manquants** : La table `linkedin_posts` n'a pas de colonne pour stocker les images/videos. Les edge functions n'extraient pas les medias des posts Unipile
3. **Interactions non extraites** : Les commentaires sont inseres sans deduplication (doublons a chaque sync), et les likes/reactions individuelles ne sont pas extraites
4. **Compteurs a zero** : Unipile renvoie les compteurs mais ils sont tous a 0 dans la DB, probablement car les champs Unipile ont des noms differents

### Plan

**1. Migration DB : ajouter colonnes medias aux posts**
- Ajouter `media_urls jsonb DEFAULT '[]'` a `linkedin_posts` pour stocker les URLs d'images/videos
- Ajouter `media_type text` (image, video, article, none)
- Ajouter un index unique `(unipile_post_id, post_id)` sur `post_interactions` pour eviter les doublons de commentaires
- Ajouter `unipile_comment_id text` a `post_interactions` pour la deduplication

**2. Edge functions : extraction complete des medias et interactions**
- `fetch-profile-posts/index.ts` et `sync-linkedin/index.ts` :
  - Extraire `post.images`, `post.media`, `post.attachments` depuis la reponse Unipile et stocker dans `media_urls`
  - Mieux mapper les compteurs : verifier `post.reactions_count`, `post.num_likes`, `post.social_counts`
  - Deduplication des commentaires via `unipile_comment_id` (upsert au lieu d'insert)
  - Extraire aussi les reactions/likes individuels si disponibles dans l'API Unipile

**3. PostCard : afficher le contenu complet et les medias**
- Remplacer la troncature par un systeme "Voir plus / Voir moins" avec toggle
- Afficher les images en galerie sous le texte
- Afficher les videos avec un player embed ou un lien
- Afficher les vrais compteurs de likes/commentaires/partages

**4. ProfileDetail : afficher les interactions completes**
- Lister les commentaires avec avatar, nom, texte complet
- Lister les reactions/likes avec le type de reaction

### Fichiers concernes
- Migration SQL (nouvelle)
- `supabase/functions/fetch-profile-posts/index.ts` (modifie)
- `supabase/functions/sync-linkedin/index.ts` (modifie)
- `src/components/dashboard/PostCard.tsx` (modifie)
- `src/pages/ProfileDetail.tsx` (modifie)

