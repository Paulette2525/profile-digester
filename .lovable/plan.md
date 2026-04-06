

## Plan : Engagement avec delais configurables + Prospection optimisee

### Problemes identifies

1. **Engagement** : Aucun controle sur les delais entre actions (likes, replies, DMs). L'utilisateur veut definir combien de temps l'IA attend entre chaque like, chaque reponse, et chaque DM.
2. **Engagement** : Pas de creation automatique de regles DM quand un post contient une ressource gratuite.
3. **Prospection** : La page fonctionne deja mais manque de flexibilite (pas de limite "illimitee") et le suivi des campagnes pourrait etre ameliore (detail des messages par campagne, relance).

### Solutions

**1. Ajout de colonnes de delai dans `auto_engagement_config`**

Migration SQL pour ajouter 3 colonnes :
- `like_delay_seconds` integer default 5
- `reply_delay_seconds` integer default 10
- `dm_delay_seconds` integer default 15

**2. UI Engagement : sliders de delai par action**

Sous chaque toggle (Auto-Like, Auto-Reply, Auto-DM), ajouter un slider permettant de definir le delai en secondes (1-60s) entre chaque action de ce type. Sauvegarder dans `auto_engagement_config`.

**3. Edge Function `auto-engage-comments` : utiliser les delais**

Lire `like_delay_seconds`, `reply_delay_seconds`, `dm_delay_seconds` depuis la config et appliquer le `setTimeout` correspondant apres chaque action.

**4. Creation automatique de regles DM pour posts avec ressource**

Dans `autopilot-run` (ou `generate-posts`), quand un post de type qui contient une `resource_url` (via `content_ideas`) est cree, inserer automatiquement une entree dans `post_dm_rules` avec :
- `trigger_keyword` : "moi", "interesse", "je veux"
- `dm_message` : message personnalise avec le lien
- `resource_url` : l'URL de la ressource

**5. Prospection : enlever la limite max du slider**

Permettre jusqu'a 500 contacts/jour (au lieu de 100). Ajouter un bouton "Voir details" sur chaque campagne pour afficher les messages individuels avec leur statut.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `like_delay_seconds`, `reply_delay_seconds`, `dm_delay_seconds` a `auto_engagement_config` |
| `src/pages/EngagementPage.tsx` | Ajouter sliders de delai sous chaque toggle |
| `supabase/functions/auto-engage-comments/index.ts` | Lire et appliquer les delais depuis la config |
| `supabase/functions/autopilot-run/index.ts` | Auto-creer regles DM quand un post a une resource_url |
| `src/pages/ProspectionPage.tsx` | Augmenter limite slider, ajouter detail campagne expandable |

### Section technique

- Les sliders de delai utilisent le composant `Slider` deja importe dans les deux pages
- Les delais sont appliques via `await new Promise(r => setTimeout(r, delay * 1000))` dans la boucle de la Edge Function
- Pour l'auto-creation de regles DM : apres insertion du post dans `suggested_posts`, verifier si l'idee source avait une `resource_url` et inserer dans `post_dm_rules`
- Le detail campagne utilise un state `expandedCampaignId` qui affiche les messages filtres par `campaign_id`

