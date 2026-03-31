

## Plan : Ajouter les types de contenu (Tuto, Viral, Storytelling) a l'Autopilote

### Objectif

Transformer l'Autopilote en hub central de creation de contenu avec 4 types configurables : News/Veille (existant), Tuto, Viral, Storytelling. L'utilisateur choisit la repartition par semaine directement depuis la page Autopilote.

### Modifications

**1. Migration DB** — Ajouter une colonne `content_mix` (jsonb) a `autopilot_config`

```json
{
  "news": 30,
  "tutorial": 25,
  "viral": 25,
  "storytelling": 20
}
```

Chaque valeur = pourcentage du total de posts. La somme fait 100%.

**2. AutopilotPage.tsx** — Nouvelle carte "Types de contenu"

Affiche 4 types avec sliders ou boutons +/- pour ajuster le pourcentage de chaque type :
- **News & Veille** (icone Newspaper) — Actualites, analyses, comparatifs (Perplexity)
- **Tuto** (icone GraduationCap) — Guides step-by-step, comment faire X avec Y
- **Viral** (icone Flame) — Hooks percutants, opinions tranchees, formats engageants
- **Storytelling** (icone BookOpen) — Histoire personnelle, parcours, lecons apprises

Chaque type a une description courte et un pourcentage ajustable. La somme est maintenue a 100%.

**3. autopilot-run/index.ts** — Generation par type

Au lieu de generer N posts tous du meme type :
- Lire `content_mix` depuis la config
- Calculer combien de posts par type (ex: 3 posts/jour, 30% news = 1 news, 25% tuto = 1 tuto, etc.)
- Pour chaque type, injecter des instructions specifiques dans le prompt :
  - **News** : utilise les tendances Perplexity (logique actuelle)
  - **Tuto** : "Ecris un tutoriel step-by-step montrant comment utiliser un outil/technique. Inclus des etapes numerotees, des exemples concrets et un resultat attendu."
  - **Viral** : "Ecris un post avec un hook ultra-percutant, une opinion tranchee ou un constat surprenant. Format court ou moyen, optimise pour l'engagement et les reactions."
  - **Storytelling** : "Raconte une histoire personnelle de l'auteur basee sur son parcours, ses echecs, ses reussites. Ton authentique et emotionnel, avec une lecon concrete a la fin."

Le champ `post_type` dans le schema est mis a jour pour inclure `viral` et `storytelling`.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonne `content_mix` jsonb |
| `src/pages/AutopilotPage.tsx` | Nouvelle carte avec sliders pour le mix de contenu |
| `supabase/functions/autopilot-run/index.ts` | Repartir la generation par type avec prompts specifiques |

### Resultat

L'utilisateur configure depuis une seule page : "Cette semaine, 30% news, 25% tutos, 25% viral, 20% storytelling" et l'Autopilote genere automatiquement le bon mix chaque jour.

