

## Plan : Fix upsert des publications extraites

### Probleme

L'edge function `fetch-profile-posts` extrait bien 250 posts depuis Unipile, mais l'upsert echoue a chaque batch avec l'erreur :
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

La migration precedente a cree un **index unique conditionnel** (`CREATE UNIQUE INDEX ... WHERE unipile_post_id IS NOT NULL`), mais PostgreSQL exige une **contrainte unique** (pas un simple index) pour que `ON CONFLICT` fonctionne.

### Solution

1. **Migration SQL** : Supprimer l'index conditionnel et ajouter une vraie contrainte unique sur `(unipile_post_id, profile_id)` :
```sql
DROP INDEX IF EXISTS idx_linkedin_posts_unipile;
ALTER TABLE public.linkedin_posts
  ADD CONSTRAINT uq_linkedin_posts_unipile
  UNIQUE (unipile_post_id, profile_id);
```

2. **Aucun changement dans l'edge function** : le code existant avec `onConflict: "unipile_post_id,profile_id"` fonctionnera une fois la contrainte en place.

### Fichier a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Remplacer l'index par une contrainte unique |

