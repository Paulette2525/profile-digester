

## Plan : Visuels ultra-realistes et contextualises avec Nano Banana 2

### Problemes identifies

1. **Prompts trop generiques** : Les prompts actuels sont courts et vagues — ils mentionnent le topic et 200 caracteres de contenu, mais ne decrivent pas concretement la scene a illustrer. Un tuto sur "comment negocier un salaire" recoit le meme style generique qu'un tuto sur "utiliser Notion".

2. **Modele sous-optimal** : Le code utilise `google/gemini-3-pro-image-preview` partout. Le modele `google/gemini-3.1-flash-image-preview` (Nano Banana 2) est plus rapide avec une qualite pro equivalente.

3. **Photos utilisateur limitees au viral/storytelling** : Le code ne cherche les photos utilisateur que pour `viral` et `storytelling` (ligne 121). Pour les news et tutos, aucune photo perso n'est utilisee meme si l'utilisateur en a.

4. **Prompts d'edition trop simples** : Le prompt d'edit-image dit juste "enhance this photo" sans decrire la scene concrete liee au contenu du post.

### Solutions

**1. Prompts de generation radicalement ameliores**

Remplacement complet de `buildImagePrompt` avec des prompts ultra-detailles par type :

- **Tutorial** : Decrire une scene concrete illustrant le sujet (ex: "une personne en train de presenter un framework sur un whiteboard dans un bureau moderne, vue en contre-plongee, lumiere naturelle laterale"). Integrer le topic ET le contenu pour que le visuel soit specifique.
- **News** : Scene editoriale type magazine avec elements visuels du sujet, tons bleus de la marque, ambiance presse professionnelle.
- **Viral** : Moment humain fort, composition cinematographique, emotion palpable, eclairage dramatique.
- **Storytelling** : Ambiance documentaire authentique, lumiere golden hour, moment de vie captivant.

Le prompt enverra 500 caracteres du contenu (au lieu de 200) pour que l'IA comprenne mieux le sujet.

**2. Passer au modele Nano Banana 2**

Remplacer `google/gemini-3-pro-image-preview` par `google/gemini-3.1-flash-image-preview` dans les deux modes (generation et edition). Plus rapide, qualite pro.

**3. Utiliser les photos utilisateur pour TOUS les types**

Elargir la recherche de photos utilisateur a tous les types de posts (pas seulement viral/storytelling). Si l'utilisateur a uploade des photos, elles seront utilisees comme base pour tous les visuels, retravaillees par l'IA selon le contexte du post.

**4. Prompts d'edition contextualises**

Remplacement complet de `buildEditPrompt` avec des instructions precises qui decrivent la transformation souhaitee en fonction du contenu reel du post, pas juste "enhance".

### Fichier a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-visual/index.ts` | Refonte des prompts, modele Nano Banana 2, photos pour tous types |

### Section technique

- `buildImagePrompt` : prompts de 300+ mots par type, incluant 500 chars du contenu, directives photographiques professionnelles (ouverture, focale, composition, lumiere), interdiction stricte de texte/watermark
- `buildEditPrompt` : instructions detaillees decrivant comment retravailler la photo selon le sujet precis du post
- Modele : `google/gemini-3.1-flash-image-preview` partout
- Recherche photos : retirer la condition `postType === "viral" || postType === "storytelling"`, chercher pour tous types avec fallback sur photos sans categorie

