

## Plan : Corriger Engagement, auto-DM depuis les idees, page Prospection

### 1. Corriger la page Engagement

**Probleme** : La page charge la config avec `maybeSingle()` — si aucune ligne n'existe pour l'utilisateur, `config` est `null` et rien ne fonctionne (toggles inactifs, sauvegarde impossible).

**Solution** : Ajouter un `upsert` automatique a l'ouverture. Si aucune config n'existe, en creer une avec les valeurs par defaut. Aussi filtrer par `user_id` (actuellement la requete ne filtre pas par utilisateur).

| Fichier | Action |
|---------|--------|
| `src/pages/EngagementPage.tsx` | Ajouter filtre `user_id`, upsert auto si config absente, corriger les queries DM rules pour filtrer par user |

### 2. Auto-creation de regles DM depuis la Boite a idees

Quand l'autopilote genere un post a partir d'une idee qui contient une `image_url` ou un lien dans le texte :

**Dans `autopilot-run/index.ts`** :
- Apres insertion du post genere depuis une idee, detecter si l'idee contient un lien (URL dans `idea_text` ou `image_url` comme ressource)
- Si oui, creer automatiquement une entree dans `post_dm_rules` avec :
  - `trigger_keyword` : mot-cle extrait du contenu (ex: "guide", "lien", "ressource") ou un CTA genere
  - `dm_message` : message automatique incluant le lien
  - `resource_url` : le lien detecte
- Ajouter un CTA dans le post genere (ex: "Commente GUIDE pour recevoir le lien")

**Dans `IdeasPage.tsx`** :
- Ajouter un champ optionnel "Lien/Ressource a partager" (separe de l'image) pour faciliter la saisie

**Migration DB** : Ajouter colonne `resource_url` a `content_ideas`.

### 3. Page Prospection (`/prospection`)

Nouvelle page accessible depuis la sidebar (sous Engagement) avec :

**Section haute — Lancement de campagne** :
- Champ de recherche pour trouver des profils LinkedIn (via edge function `search-profiles` existant)
- Filtres : mots-cles, industrie
- Selection des profils a prospecter
- Zone de message personnalise avec variables (`{name}`, `{headline}`)
- Bouton "Lancer la prospection"

**Section basse — Statistiques** :
- Nombre total de prospects contactes
- Taux de reponse
- Taux de connexion acceptee
- Historique des messages envoyes avec statut

**Migration DB** : Creer table `prospection_campaigns` et `prospection_messages` pour stocker l'historique.

**Edge function** : `prospect-outreach/index.ts` — envoie des messages/invitations via Unipile.

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | `resource_url` sur `content_ideas`, tables `prospection_campaigns` + `prospection_messages` |
| `src/pages/EngagementPage.tsx` | Fix config upsert + filtre user_id |
| `src/pages/IdeasPage.tsx` | Ajouter champ resource_url |
| `src/pages/ProspectionPage.tsx` | Nouvelle page prospection |
| `src/components/layout/AppSidebar.tsx` | Ajouter entree Prospection |
| `src/App.tsx` | Ajouter route `/prospection` |
| `supabase/functions/autopilot-run/index.ts` | Auto-creer DM rules depuis idees avec liens |
| `supabase/functions/prospect-outreach/index.ts` | Envoi de messages de prospection via Unipile |

