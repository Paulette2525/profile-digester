

## Plan : Permettre de changer la photo d'un post avant publication

### Probleme

Actuellement, la seule option pour changer l'image d'un post est de cliquer "Regénérer" (qui relance l'IA). Il n'y a aucun moyen d'uploader manuellement une image de remplacement ou de choisir parmi ses photos existantes dans la banque d'images.

### Solution

Ajouter un bouton "Changer la photo" sur chaque post (a cote de Regénérer) qui ouvre un dialogue avec deux options :
1. **Uploader une nouvelle image** depuis l'ordinateur
2. **Choisir parmi ses photos** existantes dans `user_photos`

L'image selectionnee sera uploadee dans le bucket `user-photos` (si nouvelle) puis le champ `image_url` du post sera mis a jour.

### Implementation

**Fichier : `src/pages/SuggestedPostsPage.tsx`**

- Ajouter un state pour le post en cours de changement d'image (`changingImagePostId`)
- Ajouter un Dialog qui s'ouvre au clic sur "Changer"
- Dans le Dialog :
  - Onglet 1 : Input file pour uploader une image → upload vers `user-photos` bucket → update `suggested_posts.image_url`
  - Onglet 2 : Grille des photos existantes depuis `user_photos` (query deja disponible via le user_id) → clic sur une photo → update `suggested_posts.image_url`
- Apres la mise a jour, fermer le dialog et refetch

**Bouton dans la barre d'actions de chaque post** :
- Visible des qu'un post a une `image_url` (a cote de "Regénérer")
- Aussi visible si pas d'image (comme alternative a la generation IA)
- Icone : `ImagePlus` ou `Replace`

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/SuggestedPostsPage.tsx` | Ajouter Dialog de changement d'image avec upload + selection depuis galerie |

