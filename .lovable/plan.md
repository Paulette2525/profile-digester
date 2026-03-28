

## Plan : Fix generation de posts + visuels + optimisation globale

### Problemes identifies

1. **generate-posts** : insere les posts SANS `user_id` → RLS bloque la lecture cote frontend (retourne `[]`). Utilise aussi OpenRouter au lieu de Lovable AI.

2. **generate-visual** : le parsing de la reponse image echoue ("No image data in AI response"). Le format `message.images[0].image_url.url` ne correspond pas a la structure reelle de la reponse Gemini image.

3. **Frontend** : genere les visuels sequentiellement pour CHAQUE post (boucle for), ce qui bloque l'UI pendant plusieurs minutes.

### Solution

#### 1. Refonte `generate-posts/index.ts`

- Remplacer OpenRouter par Lovable AI (`google/gemini-3-flash-preview`)
- Extraire `user_id` du JWT et l'ajouter a chaque post insere
- Ajouter retry (502/503) avec delai
- Filtrer `user_memory`, `user_photos`, `content_ideas` par `user_id`

#### 2. Fix `generate-visual/index.ts`

- Logger la structure complete de la reponse AI pour diagnostiquer
- Parser correctement : verifier `message.content` pour les data URIs inline (format courant de Gemini image), puis fallback sur `message.images`
- Ajouter retry sur 502/503

#### 3. Frontend `SuggestedPostsPage.tsx`

- Supprimer la boucle de generation automatique de visuels (trop lent, bloque l'UI)
- L'utilisateur genere les visuels manuellement via le bouton existant
- Ajouter un bouton "Generer tous les visuels" qui lance les appels en parallele (Promise.allSettled) avec un compteur de progression

### Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/generate-posts/index.ts` | Lovable AI + user_id + retry + filtres user |
| `supabase/functions/generate-visual/index.ts` | Fix parsing reponse image + retry |
| `src/pages/SuggestedPostsPage.tsx` | Supprimer auto-visual, ajouter bouton batch |

### Details techniques

- `generate-posts` : extraction JWT identique a `analyze-virality` (`req.headers.get("Authorization")` → `supabase.auth.getUser(token)`)
- `generate-visual` : le modele `google/gemini-3.1-flash-image-preview` avec `modalities: ["image", "text"]` retourne l'image dans `message.content` sous forme de parts multimodales ou dans un champ `inline_data`. Le fix consiste a parcourir toutes les structures possibles : `message.images`, `message.content` (si tableau de parts), et `message.content` (si string avec data URI)
- Frontend : `Promise.allSettled` pour generer les visuels en parallele par lots de 3

