

## Plan : Refonte du calendrier + precision horaire des publications

### Problemes identifies

1. **Calendrier peu lisible** : Les posts sont de minuscules lignes de texte avec un point de couleur de 2px — impossible de distinguer visuellement publie/planifie/brouillon au premier coup d'oeil.
2. **Dialog de detail trop basique** : Pas d'heure precise, pas d'actions (publier, annuler).
3. **Requete SQL incorrecte** : Le double `.or()` ne filtre pas correctement par mois — des posts hors du mois courant peuvent apparaitre ou des posts du mois peuvent manquer.
4. **Publications groupees au meme moment** : Le cron toutes les 5 min publie tout d'un coup. Pas de mecanisme pour espacer les publications.

### Solutions

**1. Refonte visuelle du calendrier**

- Remplacer les petits points par des **barres colorees pleines** avec fond colore par statut :
  - Vert clair (`bg-green-100 border-l-4 border-green-500`) pour publie
  - Bleu clair (`bg-blue-100 border-l-4 border-blue-500`) pour planifie
  - Gris clair (`bg-gray-100 border-l-4 border-gray-400`) pour brouillon
- Afficher l'heure a cote du titre (`09:00 - Mon post`)
- Augmenter la hauteur des cellules pour mieux voir les posts

**2. Dialog de detail enrichi**

- Afficher le badge de statut avec couleur forte
- Montrer l'image en grand
- Afficher l'heure exacte de programmation et de publication
- Ajouter des boutons d'action : "Publier maintenant", "Annuler la planification" (pour les scheduled)
- Permettre de naviguer entre les posts du meme jour

**3. Corriger la requete SQL**

La requete actuelle avec double `.or()` est incorrecte. Remplacer par une logique correcte :
```
.or(`scheduled_at.gte.${start},scheduled_at.lte.${end}`)
.or(`published_at.gte.${start},published_at.lte.${end}`)
```
En realite il faut un filtre qui prend les posts dont la date pertinente tombe dans le mois. Utiliser une approche plus simple : recuperer tous les posts non-draft du user puis filtrer cote client, ou utiliser `.gte` et `.lte` sur chaque champ avec un `or` unique bien forme.

**4. Publication a l'heure exacte (pas en batch)**

Dans `publish-scheduled-post`, ajouter une fenetre de tolerance : ne publier que les posts dont `scheduled_at` est entre `now() - 6min` et `now()`. Cela evite de publier d'un coup tous les posts en retard. Si un post a ete rate (scheduled_at trop ancien), le marquer avec un statut `missed` ou le publier avec un delai entre chaque post (sleep 60s entre 2 posts).

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/CalendarPage.tsx` | Refonte visuelle complete + dialog enrichi + fix requete |
| `supabase/functions/publish-scheduled-post/index.ts` | Ajouter fenetre de tolerance + espacement entre posts |

