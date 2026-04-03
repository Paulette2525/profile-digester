

## Plan : Controle du mix de contenu, visuels realistes, banque d'images personnelles

### 1. ContentMixCard — Donner un vrai controle

**Probleme** : Les sliders redistribuent automatiquement les pourcentages entre les autres types quand on bouge un slider, ce qui rend le controle frustrant — on ne peut pas fixer un type a 0% sans que les autres bougent.

**Fix** : Ajouter un toggle ON/OFF par type de contenu. Quand un type est desactive (OFF), son pourcentage passe a 0% et il est exclu de la redistribution. Seuls les types actifs se partagent les 100%. Cela permet de desactiver completement un type sans le voir revenir.

Fichier : `src/components/autopilot/ContentMixCard.tsx`

### 2. Visuels generes — Qualite realiste et professionnelle

**Probleme** : Le prompt actuel dans `generate-visual` demande un "infographic, bold typography, minimalist" — ce qui produit des visuels generiques a l'aspect IA evident.

**Fix** : Recrire le prompt pour demander des visuels photographiques realistes :
- Remplacer "infographic, bold typography" par "photorealistic, editorial photography style, natural lighting"
- Utiliser le modele `google/gemini-3-pro-image-preview` (meilleure qualite) au lieu de `gemini-3.1-flash-image-preview`
- Adapter le prompt selon le type de post :
  - **News** : photo editoriale professionnelle, style magazine
  - **Tuto** : mise en scene realiste d'un espace de travail ou ecran
  - **Viral** : photo emotionnelle et percutante, style photojournalisme
  - **Storytelling** : photo atmospherique, portraits, moments de vie
- Supprimer toute mention de texte dans l'image (les textes IA dans les images sont toujours mauvais)

Fichier : `supabase/functions/generate-visual/index.ts`

### 3. Memoire — Remplacer "Idees de publication" par "Mes visuels pour publications"

**Probleme** : La section "Idees de publications" en bas de Memoire est redondante avec la page `/idees` (Boite a idees) qui fait deja ce travail plus completement.

**Fix** : Supprimer la section "Idees de publications" de MemoirePage et la remplacer par une section **"Mes visuels (Viral & Storytelling)"** :
- Upload d'images avec description et tag de type (`viral` ou `storytelling`)
- Ces images seront utilisees en priorite par l'autopilot pour les posts Viral et Storytelling au lieu de generer des visuels IA
- Ajouter une colonne `photo_category` (text, nullable) a la table `user_photos` pour distinguer les photos generales des photos de publication
- L'autopilot-run verifiera s'il y a des photos tagees `viral`/`storytelling` avant de lancer la generation visuelle IA pour ces types

### Migration SQL

```sql
ALTER TABLE public.user_photos ADD COLUMN IF NOT EXISTS photo_category text DEFAULT null;
```

### Modification autopilot-run

Pour les posts de type `viral` ou `storytelling` :
1. Chercher d'abord une photo utilisateur avec `photo_category` correspondant
2. Si trouvee, l'utiliser directement (pas de generation IA)
3. Sinon, generer le visuel IA comme avant

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/components/autopilot/ContentMixCard.tsx` | Ajouter toggle ON/OFF par type |
| `supabase/functions/generate-visual/index.ts` | Prompt realiste + modele pro |
| `src/pages/MemoirePage.tsx` | Remplacer section idees par banque visuels viral/storytelling |
| Migration SQL | Ajouter `photo_category` a `user_photos` |
| `supabase/functions/autopilot-run/index.ts` | Utiliser photos utilisateur pour viral/storytelling |

