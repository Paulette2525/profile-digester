

## Extraction des anciennes publications d'un profil

### Probleme
Actuellement, le sync global (`sync-linkedin`) recupere les 20 derniers posts de tous les profils. Il n'y a pas de moyen d'extraire en profondeur les anciennes publications d'un profil specifique.

### Solution
Ajouter une nouvelle edge function `fetch-profile-posts` qui recupere les publications d'un profil individuel avec pagination (curseur Unipile), et un bouton "Extraire les publications" sur la page de detail du profil.

### Plan

**1. Nouvelle Edge Function `fetch-profile-posts`**
- Recoit `profile_id` en parametre
- Recupere le profil depuis la DB, extrait l'identifiant LinkedIn
- Appelle Unipile `GET /api/v1/posts` avec `author_id` et `limit=100`
- Supporte la pagination via le curseur Unipile (`cursor`) pour parcourir toutes les pages
- Parametre optionnel `max_pages` (defaut: 5, soit ~500 posts max) pour limiter la duree
- Upsert chaque post dans `linkedin_posts` (evite les doublons via `unipile_post_id`)
- Recupere aussi les commentaires de chaque post
- Retourne le nombre total de posts extraits

**2. Mise a jour de `ProfileDetail.tsx`**
- Ajouter un bouton "Extraire les publications" a cote du bouton LinkedIn
- Appelle `fetch-profile-posts` via `supabase.functions.invoke()`
- Affiche un spinner pendant l'extraction et un toast avec le resultat
- Rafraichit automatiquement la liste des posts apres extraction

### Fichiers concernes
- `supabase/functions/fetch-profile-posts/index.ts` (nouveau)
- `src/pages/ProfileDetail.tsx` (modifie)

