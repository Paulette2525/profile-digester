

## Plan : Visuels infographiques pour News/Tuto + photos perso restreintes au Viral/Storytelling

### Probleme

Les prompts actuels pour les types **Tutorial** et **News** demandent des "photographs" avec des specs de camera (Sony A7R IV, Canon EOS R5), ce qui produit des images photo-realistes avec des humains. L'utilisateur veut des **visuels illustratifs statiques** — infographies, icones, logos de marques, chiffres cles — pas des photos de personnes.

De plus, dans `autopilot-run/index.ts` (lignes 462-474), le code peut encore assigner des photos personnelles a des posts non-viral/non-storytelling via le fallback `usePhoto` (ligne 473). Meme chose dans `generate-posts/index.ts` (ligne 290).

### Solutions

**1. Refonte des prompts Tutorial et News dans `generate-visual/index.ts`**

Remplacer les prompts "photograph" par des prompts de type **infographie/illustration professionnelle** :

- **Tutorial** : "Create a clean, modern infographic-style visual that illustrates the tutorial topic. Use flat design icons, diagrams, numbered steps, arrows, and visual hierarchy. Include relevant brand logos if applicable (e.g., Notion logo if about Notion). Use text labels and key figures. Style: Dribbble-quality flat illustration, clean white or soft gradient background, bold accent colors. NO photographs, NO humans, NO realistic scenes."

- **News** : "Create a professional news-style infographic visual. Include the company/brand logo prominently (e.g., OpenAI logo for an OpenAI story). Show key figures, data points, and contextual icons. Use bold typography for headline numbers. Style: Bloomberg/TechCrunch editorial graphic, dark or gradient background with vibrant accent colors. Include relevant text, logos, and data visualization elements. NO photographs, NO humans."

Le `baseRules` sera modifie pour ces types : au lieu de "NO text, NO logos", il autorisera explicitement texte et logos.

**2. Bloquer les photos perso pour Tutorial/News dans `autopilot-run/index.ts`**

Ligne 462-474 : ne plus assigner `assignedImageUrl` pour les types `tutorial` et `news`. Le fallback `usePhoto` ne s'applique qu'aux types `viral` et `storytelling`.

**3. Meme correction dans `generate-posts/index.ts`**

Ligne 290 : ne pas assigner de photo perso si le `post_type` est `tutorial` ou `news`.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-visual/index.ts` | Refonte prompts Tutorial/News en infographie ; autoriser texte/logos |
| `supabase/functions/autopilot-run/index.ts` | Bloquer assignation de photos perso pour tutorial/news (lignes 462-474) |
| `supabase/functions/generate-posts/index.ts` | Bloquer assignation de photos perso pour tutorial/news (ligne 290) |

### Section technique

- Prompts infographiques : ~200 mots, style Dribbble/editorial, flat design avec icones et logos
- `baseRules` split en 2 variantes : une pour photo (viral/storytelling) qui interdit le texte, une pour infographie (tutorial/news) qui autorise texte, logos et chiffres
- Condition dans autopilot-run : `if (postType === "viral" || postType === "storytelling") { ... assign photo ... } else { assignedImageUrl = null; }`
- Le `inferPostType` reste inchange, il detecte deja correctement les types

