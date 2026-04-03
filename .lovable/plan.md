

## Plan : Barre de progression en temps reel pour l'execution Autopilot

### Probleme

Quand on clique "Executer", la page affiche un simple spinner (`Loader2 animate-spin`) pendant toute la duree (qui peut etre longue : Perplexity + AI generation + visuels). Aucun retour sur l'etape en cours ni le pourcentage d'avancement.

### Solution

La fonction edge `autopilot-run` ne peut pas streamer de progression en temps reel via HTTP classique. On va utiliser la table `autopilot_config` comme canal de progression : la fonction edge ecrira l'etape en cours dans un nouveau champ `run_progress` (jsonb), et le frontend interrogera ce champ en polling toutes les 2 secondes.

**Etapes de progression definies :**
1. `loading_memory` — Chargement memoire et profil (10%)
2. `fetching_trends` — Veille Perplexity (25%)
3. `generating_posts` — Generation IA des posts (50%)
4. `generating_visuals` — Generation des visuels (75%)
5. `finalizing` — Sauvegarde et planification (90%)
6. `done` — Termine (100%)

### Modifications

**Migration SQL** : Ajouter colonne `run_progress` (jsonb, nullable, default null) a `autopilot_config`. Format : `{ "step": "generating_posts", "percent": 50, "label": "Generation des posts..." }`

**`supabase/functions/autopilot-run/index.ts`** : Ajouter des appels `supabase.from("autopilot_config").update({ run_progress: {...} })` a chaque etape cle du pipeline. Remettre a null a la fin.

**`src/pages/AutopilotPage.tsx`** : Remplacer le spinner par une barre de progression animee avec le label de l'etape. Utiliser un `useEffect` avec `setInterval` de 2s qui re-fetch `run_progress` pendant que `running === true`. Afficher un composant `Progress` (deja dans shadcn) + le texte de l'etape.

### Section technique

- Le polling s'arrete des que `run_progress` est null ou `percent === 100`
- La fonction edge fait ~6 updates de progression (cout negligeable)
- Le composant Progress de shadcn est deja disponible dans le projet
- Pas de realtime necessaire, le polling a 2s suffit pour ce cas d'usage

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `run_progress` jsonb a `autopilot_config` |
| `supabase/functions/autopilot-run/index.ts` | Ecrire la progression a chaque etape |
| `src/pages/AutopilotPage.tsx` | Afficher barre de progression + label en polling |

