

## Plan : Refonte Settings + Fix Stats Abonnes/Connexions + Actualisation dynamique

### 1. Page Configuration : Connecter/Deconnecter LinkedIn + Nettoyage

**Modifications sur `SettingsPage.tsx` :**
- Supprimer entierement la carte "Cle API Unipile" et les references a Unipile dans les descriptions
- Quand le compte est connecte, ajouter un bouton "Deconnecter" qui appelle une nouvelle edge function `disconnect-linkedin`
- Simplifier les textes : "Connectez votre compte LinkedIn pour activer toutes les fonctionnalites"
- Apres connexion/deconnexion, invalider les queries React Query (`account-stats`, etc.) pour tout rafraichir

**Nouvelle edge function `disconnect-linkedin` :**
- Appelle `DELETE /api/v1/accounts/{accountId}` sur Unipile pour supprimer le compte LinkedIn connecte
- Retourne le statut de la deconnexion

### 2. Fix Stats Abonnes/Connexions (actuellement 0)

**Probleme identifie :** L'endpoint Unipile `GET /api/v1/accounts` retourne les comptes mais les champs `followers_count` / `connections_count` ne sont pas presents dans la reponse. Le resultat est toujours 0.

**Solution dans `fetch-account-stats` :**
- Apres avoir trouve le compte LinkedIn, appeler `GET /api/v1/users/{accountId}/profile` ou `GET /api/v1/accounts/{accountId}` (endpoint individuel) pour obtenir les stats detaillees
- Logger la reponse complete pour identifier les bons noms de champs
- Fallback : si les stats ne sont pas disponibles via l'API accounts, utiliser l'endpoint `/api/v1/users/me?account_id={id}` qui retourne le profil complet avec followers/connections

### 3. Actualisation dynamique des donnees

**React Query invalidation automatique :**
- Sur `MemoirePage` : apres sauvegarde, invalider `["account-stats"]`, `["content-strategy"]`
- Sur `Index` (dashboard) : apres sync, invalider `["account-stats"]`, `["published-posts-analysis"]`
- Reduire le `staleTime` de `account-stats` a 2 minutes au lieu de 10 pour un rafraichissement plus frequent
- Ajouter `refetchOnWindowFocus: true` sur les queries critiques (account-stats, published-posts)

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `src/pages/SettingsPage.tsx` | Supprimer carte API, ajouter bouton Deconnecter, nettoyer textes |
| `supabase/functions/disconnect-linkedin/index.ts` | Creer - supprime le compte LinkedIn via Unipile |
| `supabase/functions/fetch-account-stats/index.ts` | Modifier - utiliser endpoint profil pour obtenir les vrais stats |
| `src/pages/AnalyserPage.tsx` | Reduire staleTime, ajouter refetchOnWindowFocus |
| `src/pages/MemoirePage.tsx` | Invalider queries apres sauvegarde |
| `src/pages/Index.tsx` | Invalider queries apres sync |

### Section technique

- `disconnect-linkedin` appelle `DELETE https://{DSN}/api/v1/accounts/{accountId}` avec la cle API
- `fetch-account-stats` essaie d'abord `GET /api/v1/accounts/{id}` (endpoint individuel), puis fallback sur les champs de la liste
- On log `JSON.stringify(linkedin)` dans la console pour identifier les vrais noms de champs disponibles
- Les invalidations React Query utilisent `queryClient.invalidateQueries({ queryKey: [...] })`

