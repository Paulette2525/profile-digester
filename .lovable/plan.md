

## Plan : Planification amelioree + visuels qui correspondent aux publications

### Probleme 1 : Planification peu pratique

Le champ `datetime-local` actuel est minuscule (ligne 307-312) et difficile a utiliser. Il faut un systeme de planification plus clair avec un Popover contenant un calendrier + selecteur d'heure.

**Fix** : Remplacer l'input `datetime-local` par un bouton "Planifier" qui ouvre un Popover avec :
- Un calendrier Shadcn (composant deja present)
- Un selecteur d'heure (dropdown avec creneaux : 8h, 9h, 10h... 20h)
- Un bouton de confirmation
- Possibilite de replanifier un post deja scheduled (changer la date/heure)

### Probleme 2 : Photos ne correspondent pas aux publications

**Cause racine** : La colonne `post_type` n'existe PAS dans la table `suggested_posts`. Le code `generate-visual` lit `post.post_type` (ligne 105) qui est toujours `undefined` → `""`. Donc TOUS les visuels utilisent le prompt generique, sans adapter le style au type de contenu.

**Fix en 2 parties** :

1. **Ajouter la colonne `post_type`** a `suggested_posts` (migration SQL) — type `text`, nullable, default null
2. **Mettre a jour `generate-posts`** pour remplir `post_type` lors de la generation (il connait deja le type via le calendrier editorial)
3. **Ameliorer `generate-visual`** : si `post_type` est null, deduire le type depuis le `topic` ou le contenu du post (recherche de mots-cles comme "storytelling", "viral", "tuto", "news")

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonne `post_type` a `suggested_posts` |
| `supabase/functions/generate-posts/index.ts` | Remplir `post_type` lors de l'insertion |
| `supabase/functions/generate-visual/index.ts` | Fallback : deduire le type depuis topic/content si `post_type` est null |
| `src/pages/SuggestedPostsPage.tsx` | Remplacer input datetime par Popover calendrier + heure ; permettre replanification |

### Section technique

- La deduction de type utilisera des regexps simples sur le contenu/topic : si contient "histoire"/"parcours" → storytelling, "astuce"/"etapes"/"comment" → tutorial, "actualite"/"etude" → news, etc.
- Le Popover de planification utilisera le composant Calendar existant + un Select pour l'heure
- Les posts deja scheduled auront un bouton "Replanifier" qui reouvre le meme Popover

