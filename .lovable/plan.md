

## Plan : Corriger les erreurs de build TypeScript

### Probleme

Deux erreurs TypeScript identiques dans `AutopilotPage.tsx` (ligne 70) et `EngagementPage.tsx` (ligne 88) : `Record<string, any>` n'est pas assignable au type strict attendu par Supabase pour `.update()` et `.insert()`.

### Concernant la planification

L'edge function `schedule-posts` fonctionne correctement (test retourne 200). Les posts sont bien planifies en base. Le probleme de planification que tu rencontres est probablement lie a ces erreurs de build qui empechent le deploiement correct du frontend.

### Corrections

**Fichier 1 : `src/pages/AutopilotPage.tsx`**
- Ligne 66 : changer `Record<string, any>` en type explicite utilisant `Tables<"autopilot_config">["Update"]` ou cast avec `as any` sur l'appel `.update()` et `.insert()`

**Fichier 2 : `src/pages/EngagementPage.tsx`**  
- Ligne 86 : meme correction pour `auto_engagement_config`

### Solution technique

Caster les objets `updates` avec `as any` dans les appels `.update(updates as any)` et `.insert({ user_id: user!.id, ...updates } as any)`. C'est la solution la plus simple et non-breaking puisque les champs sont deja valides a l'execution.

