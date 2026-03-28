

## Etat actuel de la plateforme et actions restantes

Apres analyse du code, voici un audit complet de ce qui est fait, ce qui fonctionne, et ce qu'il reste a faire pour finaliser.

### Ce qui est deja construit

| Module | Statut |
|--------|--------|
| Dashboard (Index) | Fonctionnel — profils suivis, posts recents, sync LinkedIn |
| Ajout de profils (AddProfile) | Fonctionnel |
| Traitement (analyse de viralite) | Fonctionnel |
| Posts Suggeres (generation AI) | Fonctionnel |
| Planifier (scheduling) | Fonctionnel |
| Analyser (stats + graphes) | Fonctionnel mais stats abonnes/connexions dependent de la reponse Unipile |
| Engagement (auto-reply, auto-DM, auto-like) | Fonctionnel + cron horaire |
| Memoire (profil enrichi + idees + photos) | Fonctionnel |
| Configuration (LinkedIn connection) | Fonctionnel |
| Sidebar + Lazy loading | Fonctionnel |
| Performance (staleTime, limits) | Applique |

### Bugs mineurs a corriger

1. **Warnings `forwardRef`** : `ProfileCard` et `PostCard` sont utilises comme enfants de `Link` sans `forwardRef` — warning dans la console
2. **Page Engagement : `single()` crash** si aucune config n'existe encore (premiere utilisation) — devrait utiliser `maybeSingle()`

### Ce qu'il reste a faire pour finaliser

**1. Authentification utilisateur (CRITIQUE)**
Actuellement toutes les tables ont des RLS policies `true` (acces public). N'importe qui peut lire/modifier les donnees. Il faut :
- Ajouter un systeme de login/signup
- Ajouter `user_id` sur les tables principales
- Remplacer les RLS par des policies basees sur `auth.uid()`

**2. Publication automatique des posts schedules**
La fonction `publish-scheduled-post` existe mais il n'y a pas de cron configure pour l'executer automatiquement. Les posts schedules ne se publient pas tout seuls.

**3. Generation de visuels**
La fonction `generate-visual` existe mais n'est pas connectee dans l'UI — les posts generes n'ont pas de visuels automatiques.

**4. Recuperation des stats de posts publies**
La fonction `fetch-post-stats` existe pour recuperer likes/comments/shares des posts publies via Unipile, mais le bouton "Actualiser stats" sur la page Analyser devrait l'utiliser pour chaque post.

**5. Tests end-to-end du workflow complet**
Verifier que le flux complet fonctionne :
- Remplir la memoire → Ajouter un profil → Sync → Analyser viralite → Generer posts → Planifier → Publier → Auto-engagement

### Recommandation d'ordre

| Priorite | Action | Effort |
|----------|--------|--------|
| 1 | Fix `maybeSingle()` sur EngagementPage | 2 min |
| 2 | Fix `forwardRef` sur ProfileCard/PostCard | 5 min |
| 3 | Ajouter cron pour `publish-scheduled-post` | 10 min |
| 4 | Connecter `generate-visual` dans l'UI | 30 min |
| 5 | Ameliorer fetch-post-stats sur Analyser | 20 min |
| 6 | Ajouter authentification + securiser RLS | 1-2h |

### Section technique

- Le fix `maybeSingle()` remplace `.single()` ligne 28 de `EngagementPage.tsx` pour eviter un crash quand la table `auto_engagement_config` est vide
- Les `forwardRef` sur `ProfileCard.tsx` et `PostCard.tsx` suppriment les warnings React dans la console
- Le cron pour `publish-scheduled-post` se configure dans `supabase/config.toml` comme celui de `auto-engage-comments`
- L'authentification necessite une migration pour ajouter `user_id` sur `user_memory`, `suggested_posts`, `auto_engagement_config`, etc. puis des RLS policies avec `auth.uid() = user_id`

Dis-moi quelles actions tu veux que j'implemente en priorite.

