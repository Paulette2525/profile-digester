

## Plan : Fix affichage des analyses de viralite

### Probleme

L'edge function `analyze-virality` insere dans `virality_analyses` sans `user_id` (ligne 33). La politique RLS exige `auth.uid() = user_id` pour lire les donnees. Resultat : l'analyse est bien creee en base mais le frontend ne peut pas la lire → affichage vide.

Meme probleme pour la query `user_memory` (ligne 38) qui ne filtre pas par user.

### Solution

Extraire le `user_id` depuis le token JWT de la requete et l'utiliser pour :
1. L'insert dans `virality_analyses` (ligne 33)
2. Le filtre sur `user_memory` (ligne 38)
3. Le filtre sur `tracked_profiles` (ligne 23)
4. Le filtre sur `linkedin_posts` (lignes 46, 56)

### Fichier a modifier

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/analyze-virality/index.ts` | Extraire user_id du JWT, ajouter aux inserts et filtres |

### Changement concret

Apres la creation du client supabase (ligne 19), ajouter :
```typescript
const authHeader = req.headers.get("Authorization") || "";
const token = authHeader.replace("Bearer ", "");
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) throw new Error("Not authenticated");
const userId = user.id;
```

Puis :
- Ligne 33 : `insert({ status: "pending", analysis_json: {}, user_id: userId })`
- Ligne 23 : ajouter `.eq("user_id", userId)` sur tracked_profiles
- Ligne 38 : ajouter `.eq("user_id", userId)` sur user_memory
- Lignes 46/56 : ajouter `.eq("user_id", userId)` sur linkedin_posts

