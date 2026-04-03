

## Plan : Upload multiple photos + generation de variantes IA depuis vos photos

### 1. Upload multi-photos sur la page Memoire

**Actuellement** : L'input file n'accepte qu'une seule photo a la fois (`type="file"` sans `multiple`).

**Fix** : Ajouter `multiple` a l'input file. La fonction `handlePhotoUpload` sera refactoree pour iterer sur `e.target.files` et uploader chaque fichier en parallele avec la meme description et categorie. Un compteur de progression montrera "3/5 photos uploadees...".

Fichier : `src/pages/MemoirePage.tsx`

### 2. Generation de variantes realistes depuis vos photos

**Concept** : Quand l'autopilot genere un visuel pour un post Viral ou Storytelling, au lieu de creer une image de zero, il prendra une de vos photos personnelles et la passera au modele IA en mode **edit** pour generer une variante contextuelle realiste (meme personne, cadrage different, atmosphere adaptee au post).

**Implementation dans `generate-visual/index.ts`** :
- Avant de generer une image from scratch, verifier s'il existe des photos utilisateur avec `photo_category` = `viral` ou `storytelling` (selon le type du post)
- Si une photo existe, utiliser le mode **edit-image** de l'AI gateway : envoyer la photo originale + un prompt d'editing contextuel ("Enhance this photo with dramatic cinematic lighting for a powerful LinkedIn post about {topic}")
- Si aucune photo utilisateur, generer normalement comme avant
- Le prompt d'editing gardera le style realiste et professionnel

**Prompt d'editing selon le type** :
- **Viral** : "Transform this photo into a powerful, emotionally impactful editorial shot. Add dramatic lighting, cinematic depth of field. Keep the person natural and authentic. Context: {topic}"
- **Storytelling** : "Enhance this photo with warm golden hour atmosphere, documentary style. Make it feel like a candid life moment. Keep the person natural. Context: {topic}"

### 3. Modification autopilot-run

Le flux existant dans `autopilot-run` qui assigne des photos utilisateur aux posts viral/storytelling reste inchange. La nouveaute est dans `generate-visual` : quand il est appele pour un post sans image pre-assignee, il cherchera quand meme les photos utilisateur pour les utiliser comme base d'editing IA plutot que de generer from scratch.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/MemoirePage.tsx` | Input `multiple` + upload en batch |
| `supabase/functions/generate-visual/index.ts` | Mode edit-image avec photos utilisateur |

### Section technique

- L'upload multiple utilisera `Promise.all` avec un `map` sur `FileList`
- Le mode edit-image utilise le meme endpoint AI gateway mais avec le champ `image_url` dans le message content (format multipart image + texte)
- La photo utilisateur est recuperee via son URL publique dans le bucket `user-photos`
- Si l'editing echoue (ex: modele refuse), fallback sur la generation classique

