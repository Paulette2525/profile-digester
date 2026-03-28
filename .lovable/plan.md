

## Plan : Optimiser l'affichage des statistiques sur la page Analyser

### Probleme

Les 8 cartes statistiques sont affichees sur une seule ligne (`grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8`), ce qui les rend trop compressees sur la plupart des ecrans. Les valeurs et labels sont difficiles a lire.

### Solution

Reorganiser en 2 rangees de 4 cartes avec un design plus lisible :

**Rangee 1 — Compte LinkedIn** : Abonnes, Connexions, Publies, Score moyen
**Rangee 2 — Engagement** : Likes, Commentaires, Partages, Impressions

### Changements concrets dans `src/pages/AnalyserPage.tsx`

1. **Grid** : Remplacer `grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8` par deux blocs `grid-cols-2 md:grid-cols-4 gap-4`
2. **Espacement** : Augmenter le padding interne des cartes pour plus de lisibilite
3. **Titres de section** : Ajouter des labels discrets ("Compte" / "Engagement") au-dessus de chaque rangee
4. **Taille du texte** : Passer les valeurs de `text-xl` a `text-2xl font-bold` et les labels de `text-xs` a `text-sm`
5. **Icones** : Augmenter legerement la taille des icones (`h-5 w-5` au lieu de `h-4 w-4`)

### Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/AnalyserPage.tsx` | Restructurer la grille de stats en 2 rangees de 4 |

