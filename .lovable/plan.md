

## Plan : Rendre Perplexity optionnel et supprimer le blocage virality_analyses

### Probleme

Le edge function `autopilot-run` echoue completement car :
1. Il exige `PERPLEXITY_API_KEY` au demarrage — meme si aucun post News n'est prevu
2. Il exige une `virality_analyses` avec status "done" — sinon il skip l'utilisateur entierement

### Modifications dans `supabase/functions/autopilot-run/index.ts`

**A. Rendre PERPLEXITY_API_KEY optionnel (lignes 23-25)**

Supprimer le `throw` pour PERPLEXITY_API_KEY. Le garder comme variable nullable. Ne l'utiliser que si des posts de type "news" sont dans le mix.

**B. Deplacer l'appel Perplexity apres le calcul des postSlots (lignes 76-145)**

Actuellement Perplexity est appele avant de savoir si des posts News sont necessaires. Reorganiser :
1. Calculer d'abord les postSlots (content mix / daily plan)
2. Verifier si au moins un slot est de type "news"
3. Si oui ET que PERPLEXITY_API_KEY existe → appeler Perplexity
4. Sinon → `trends = ""`, pas d'appel

**C. Supprimer le blocage virality_analyses (lignes 179-182)**

Au lieu de `continue` quand il n'y a pas d'analyse, utiliser un objet vide par defaut. Le champ `source_analysis_id` sera `null` dans les posts inseres.

### Fichier modifie

| Fichier | Action |
|---------|--------|
| `supabase/functions/autopilot-run/index.ts` | Perplexity conditionnel, virality_analyses optionnel |

### Resultat

- Posts Tuto, Viral, Storytelling fonctionnent sans Perplexity
- Posts News utilisent Perplexity seulement quand la cle est disponible
- L'absence de virality_analyses ne bloque plus la generation

