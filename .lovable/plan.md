

## Plan : Photos perso uniquement pour Viral/Storytelling + prompts dynamiques + anti-repetition

### Problemes identifies

1. **Photos utilisateur sur tous les types** : Le code actuel (lignes 177-206 de `generate-visual/index.ts`) cherche les photos utilisateur pour TOUS les types de posts. Les Tutos et News utilisent donc les photos perso au lieu de generer des images illustratives du sujet.

2. **Prompts d'edition statiques** : Les prompts `buildEditPrompt` decrivent toujours le meme type de transformation pour un type donne (meme eclairage, meme ambiance). Aucune variation aleatoire de contexte, tenue, environnement.

3. **Pas de deduplication** : Ni le generateur de contenu ni le generateur de visuels ne verifient les publications precedentes pour eviter les repetitions.

### Solutions

**1. Restreindre les photos perso au Viral et Storytelling uniquement**

Dans `generate-visual/index.ts`, ajouter une condition : la recherche de `user_photos` ne se fait QUE si `postType === "viral"` ou `postType === "storytelling"`. Pour tous les autres types (tutorial, news, personal_branding), aller directement en mode generation depuis zero — le visuel sera cree par l'IA pour illustrer concretement le sujet du post.

**2. Prompts d'edition dynamiques avec variations aleatoires**

Remplacer `buildEditPrompt` par une version qui injecte des variations aleatoires a chaque appel :
- Pool de 6+ environnements (terrasse panoramique, cafe parisien, rooftop urbain, studio creatif, bibliotheque, jardin zen)
- Pool de 6+ ambiances lumineuses (golden hour, blue hour, lumiere studio, jour de pluie dramatique, aube)
- Pool de tenues/styles (costume elegant, casual chic, streetwear premium, col roule noir)
- Selection aleatoire d'un element de chaque pool pour chaque generation

**3. Anti-repetition dans autopilot-run**

Renforcer le prompt dans `autopilot-run/index.ts` en chargeant les 20 derniers topics (au lieu de 10) et en ajoutant une instruction explicite : "NE REPETE JAMAIS un sujet deja traite dans les posts precedents. Verifie la liste et propose des angles 100% nouveaux."

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-visual/index.ts` | Restreindre photos perso a viral/storytelling ; prompts edit dynamiques avec pools aleatoires |
| `supabase/functions/autopilot-run/index.ts` | Charger 20 derniers posts ; renforcer instruction anti-repetition |

### Section technique

- Condition photo : `if ((postType === "viral" || postType === "storytelling") && userId)` avant la recherche user_photos
- Pools de variation : tableaux `const environments = [...]`, `const lightings = [...]`, `const styles = [...]` avec `Math.random()` pour la selection
- Les prompts `buildImagePrompt` pour tutorial/news restent inchanges (ils generent deja des scenes illustratives)
- Pour l'anti-repetition : les 20 derniers `topic` sont envoyes dans le prompt avec l'instruction "ces sujets sont INTERDITS"

