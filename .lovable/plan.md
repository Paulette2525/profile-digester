

## Plan : Restructurer la plateforme autour de l'Autopilote + Visuels automatiques

### Constat

L'Autopilote rend 4 pages redondantes : **Traitement** (analyse viralite manuelle), **Strategie** (generee manuellement), **Posts Suggeres** (generation manuelle), **Planifier** (planification manuelle). Seule **Analyser** reste utile pour le suivi de performance post-publication.

### Architecture cible

```text
SIDEBAR SIMPLIFIEE :
  ── Dashboard
  ── Autopilote (hub central — config + execution)
  ── Publications (ex Posts Suggeres — tous les posts generes, edition, visuels)
  ── Performance (ex Analyser — stats post-publication)
  ── Engagement (inchange)
  ── Memoire (inchange)
  ── Profils (inchange)
  ── Configuration (inchange)
```

Pages **supprimees** du menu : Traitement, Strategie, Planifier (le code reste pour ne rien casser, mais inaccessibles depuis la sidebar).

### Modifications

**1. Sidebar** — Reduire de 12 a 8 entrees

Retirer `Traitement`, `Strategie`, `Planifier` du menu. Renommer `Posts Suggeres` → `Publications`, `Analyser` → `Performance`. Deplacer `Autopilote` en premiere position du groupe Workflow apres Dashboard.

**2. AutopilotPage — Planification par jour**

Ajouter une nouvelle carte "Planning hebdomadaire" permettant de definir le type de contenu dominant par jour :
- Chaque jour actif affiche un select avec les types (News, Tuto, Viral, Storytelling, Auto)
- "Auto" = laisser le content_mix decider
- Stocke dans un nouveau champ `daily_content_plan` (jsonb) dans `autopilot_config`

**3. AutopilotPage — Generation de visuels automatiques**

Ajouter un toggle "Generer un visuel pour chaque post" dans la config. Quand actif, l'edge function `autopilot-run` appelle `generate-visual` apres chaque post genere. Le toggle s'appuie sur un nouveau champ `auto_visuals` (boolean) dans `autopilot_config`.

**4. Migration DB** — 2 colonnes dans `autopilot_config`

```sql
ALTER TABLE public.autopilot_config 
  ADD COLUMN daily_content_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN auto_visuals boolean NOT NULL DEFAULT false;
```

`daily_content_plan` format : `{"monday": "news", "tuesday": "tutorial", "wednesday": "auto", ...}`

**5. autopilot-run/index.ts** — Utiliser le plan journalier

Avant de calculer le mix, verifier si le jour actuel a un type force dans `daily_content_plan`. Si oui, tous les posts du jour sont de ce type. Sinon, utiliser le content_mix en pourcentage (logique actuelle).

Apres generation, si `auto_visuals` est actif, appeler `generate-visual` pour chaque post cree.

**6. MemoirePage — Banque d'images personnelles**

Ajouter une section "Mes visuels" dans la page Memoire permettant d'uploader des images dans le bucket `user-photos`. Ces images seront disponibles comme visuels par defaut pour les posts quand la generation IA n'est pas activee.

**7. Publications page (ex SuggestedPostsPage)** — Hub de gestion

Renommer et ajouter :
- Bouton "Planifier tout" (logique existante de PlanifierPage fusionnee ici)
- Affichage du statut (brouillon / planifie / publie) avec filtres
- Edition inline du contenu et du visuel

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `daily_content_plan` et `auto_visuals` |
| `src/components/layout/AppSidebar.tsx` | Reorganiser les menus |
| `src/App.tsx` | Garder les routes mais supprimer celles inutiles des imports |
| `src/pages/AutopilotPage.tsx` | Ajouter planning journalier + toggle visuels |
| `src/pages/SuggestedPostsPage.tsx` | Fusionner logique Planifier, renommer |
| `src/pages/MemoirePage.tsx` | Ajouter section upload d'images |
| `supabase/functions/autopilot-run/index.ts` | Integrer daily plan + appel generate-visual |

### Section technique : Visuels automatiques

Le edge function `generate-visual` existe deja et genere un PNG via Gemini 3.1 Flash Image. L'autopilot-run appelera :

```typescript
if (config.auto_visuals) {
  for (const postId of generatedPostIds) {
    await supabase.functions.invoke("generate-visual", { body: { post_id: postId } });
  }
}
```

Pour les posts News, le prompt de visuel inclura le theme bleu de la marque utilisateur.

