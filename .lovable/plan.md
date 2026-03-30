

## Plan : Optimiser la generation de posts (longueur, contenu, heures, planification)

### Problemes identifies

1. **Longueur uniforme** : Le prompt ne demande pas explicitement de varier les longueurs (court 3-5 lignes, moyen 8-15 lignes, long 20-40 lignes)
2. **Carrousels inutiles** : Le type "Carousel" genere "Slide 1, Slide 2..." au lieu de vrai contenu — et "Sondage" n'est pas pertinent
3. **Posts top performants tronques** : Les posts des profils suivis sont coupes a 200 caracteres — insuffisant pour capter le style complet
4. **Pas d'heure de publication** : Les posts generes depuis SuggestedPostsPage n'ont pas de `scheduled_at`
5. **Planifier page** : Les brouillons necessitent une saisie manuelle de date — pas de bouton "Tout planifier" en 1 clic

### Modifications

**1. `generate-posts/index.ts` — Prompt restructure**
- Supprimer "Carousel" et "Sondage" des types de contenu
- Ajouter une regle explicite de variation de longueur : chaque post doit avoir un attribut `length` (short/medium/long) et le prompt exige un mix des 3
- Augmenter l'extrait des posts performants de 200 a 800 caracteres pour capturer le style complet
- Ajouter dans le tool schema un champ `suggested_hour` (entier 7-20) pour que l'IA assigne une heure optimale a chaque post
- Quand un `calendar` est fourni, l'heure du slot est utilisee ; sinon l'IA decide de l'heure
- Stocker `scheduled_at` meme en mode non-calendrier (date = creation + idx jours, heure = suggested_hour)

**2. `EditorialCalendarDialog.tsx` — Retirer types inutiles**
- Supprimer "Carousel" et "Sondage" de `POST_TYPES`

**3. `PlanifierPage.tsx` — Bouton "Tout planifier"**
- Ajouter un bouton "Valider et planifier tous les brouillons" qui prend chaque draft ayant un `scheduled_at` et les passe en status "scheduled" en un seul appel a `schedule-posts`
- Si des drafts n'ont pas de `scheduled_at`, leur attribuer automatiquement des creneaux (jours ouvrables a 9h, 12h, 17h)

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-posts/index.ts` | Prompt : longueurs variees, pas de carousel/sondage, posts complets, heure de publication, scheduled_at auto |
| `src/components/strategy/EditorialCalendarDialog.tsx` | Retirer Carousel et Sondage des types |
| `src/pages/PlanifierPage.tsx` | Bouton "Tout planifier" pour valider tous les brouillons d'un coup |

### Detail technique du prompt

```
RÈGLES IMPÉRATIVES:
...
11. VARIER LES LONGUEURS : certains posts doivent être LONGS (20-40 lignes avec storytelling développé),
    d'autres MOYENS (8-15 lignes), d'autres COURTS (3-7 lignes percutants). Mélange obligatoire.
12. NE JAMAIS écrire de posts "Carousel" avec "Slide 1, Slide 2" — écris des posts complets et lisibles.
13. NE JAMAIS écrire de sondages.
14. Pour chaque post, suggère une heure de publication optimale (7h-20h).
```

Tool schema enrichi :
```json
{
  "suggested_hour": { "type": "number", "description": "Heure optimale de publication (7-20)" },
  "length": { "type": "string", "enum": ["short", "medium", "long"] }
}
```

