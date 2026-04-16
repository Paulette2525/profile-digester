

## Plan : Nouvelles fonctionnalités de prospection avancée

### Vue d'ensemble

Trois nouvelles capacités exploitant les endpoints Unipile non encore utilisés :

1. **Warm-up automatisé** — Visite de profil + like de posts avant l'invitation
2. **Extraction de leads depuis les commentaires** — Récupérer les personnes qui commentent un post donné
3. **Recherche d'entreprises** — Trouver des sociétés puis extraire les décideurs

---

### 1. Warm-up automatisé

**Principe** : Avant d'envoyer l'invitation/message, le système visite le profil du prospect et like 1-2 de ses posts récents. Cela déclenche une notification LinkedIn et augmente le taux d'acceptation.

**Edge Function — `prospect-warmup/index.ts`** (nouvelle)
- Reçoit une liste de `prospect_ids` (provider IDs Unipile)
- Pour chaque prospect :
  - `GET /api/v1/users/{id}` (visite de profil, déclenche la notification)
  - `GET /api/v1/users/{id}/posts` (récupère les 2 derniers posts)
  - `POST /api/v1/posts/{post_id}/reactions` avec `{ type: "LIKE" }` sur 1-2 posts
  - Délai configurable entre chaque action (5-10s)
- Retourne le résultat par prospect

**Modification de `prospect-outreach/index.ts`**
- Ajouter un flag `warmup_enabled` dans le body de la requête
- Si activé, appeler `prospect-warmup` pour chaque batch avant l'envoi des messages
- Ajouter un délai configurable entre le warm-up et l'envoi (ex: 30min-24h)

**Base de données** — Migration
- Ajouter `warmup_enabled boolean DEFAULT false` et `warmup_delay_hours integer DEFAULT 2` à `prospection_campaigns`
- Ajouter `warmup_status text DEFAULT null` à `prospection_messages` (valeurs: `null`, `warming`, `warmed`, `warmup_error`)

**Frontend — `ProspectionPage.tsx`**
- Toggle "Warm-up avant contact" dans les paramètres avancés de la campagne
- Slider "Délai après warm-up" (1h-24h)
- Badge de statut warm-up dans l'historique des messages

---

### 2. Extraction de leads depuis les commentaires

**Edge Function — `extract-commenters/index.ts`** (nouvelle)
- Reçoit un `post_url` ou `post_id` LinkedIn
- `GET /api/v1/posts/{id}/comments` — récupère tous les commentaires (pagination par curseur)
- `GET /api/v1/posts/{id}/reactions` — récupère les réactions
- Déduplique les auteurs, enrichit avec `GET /api/v1/users/{id}` si nécessaire
- Retourne une liste de profils au format `SearchResult`

**Frontend — `ProspectionPage.tsx`**
- Nouveau mode de recherche : onglet "Commentaires d'un post" à côté de "Rechercher des profils"
- Champ URL de post LinkedIn
- Affiche les résultats dans le même format que la recherche classique
- Les profils extraits sont sélectionnables pour créer une campagne

---

### 3. Recherche d'entreprises + extraction décideurs

**Edge Function — `search-companies/index.ts`** (nouvelle)
- Utilise `POST /api/v1/linkedin/search` avec `category: "companies"`
- Paramètres : mots-clés, industrie, taille
- Retourne les entreprises trouvées

**Edge Function — Modification de `search-profiles/index.ts`**
- Ajouter un paramètre optionnel `company_id` pour filtrer les personnes par entreprise
- Permet d'extraire les décideurs d'une entreprise spécifique

**Frontend — `ProspectionPage.tsx`**
- Nouveau mode : onglet "Entreprises" 
- Recherche d'entreprises avec résultats affichés (nom, secteur, taille, logo)
- Bouton "Extraire les décideurs" sur chaque entreprise → lance une recherche de profils filtrée
- Les profils extraits rejoignent la sélection de prospects existante

---

### Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `supabase/functions/prospect-warmup/index.ts` | Créer — visite profil + likes |
| `supabase/functions/extract-commenters/index.ts` | Créer — extraction leads commentaires |
| `supabase/functions/search-companies/index.ts` | Créer — recherche entreprises |
| `supabase/functions/prospect-outreach/index.ts` | Modifier — intégrer warm-up |
| `supabase/functions/search-profiles/index.ts` | Modifier — filtre company_id |
| `src/pages/ProspectionPage.tsx` | Modifier — 3 onglets, warm-up toggle, UI entreprises |
| Migration SQL | 2 colonnes sur `prospection_campaigns`, 1 sur `prospection_messages` |

### Section technique

- Les endpoints Unipile utilisés sont documentés et disponibles : `/users/{id}`, `/users/{id}/posts`, `/posts/{id}/reactions`, `/posts/{id}/comments`, `/linkedin/search` avec `category: "companies"`
- Le warm-up est découplé dans une edge function séparée pour pouvoir être appelé indépendamment (ex: cron pour warm-up la veille)
- Le délai entre warm-up et envoi peut être géré via `warmup_delay_hours` : le message reste en statut `warming` jusqu'à ce que le délai soit écoulé, puis `prospect-outreach` l'envoie
- Rate limiting : 5-10s entre chaque action Unipile pour éviter les restrictions LinkedIn
- L'extraction de commentaires utilise la pagination par curseur pour gérer les posts à forte audience

