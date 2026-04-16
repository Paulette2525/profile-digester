

## Plan : Filtres personnalisés par mode de prospection

### Concept

Ajouter des champs de filtrage avancés et spécifiques à chaque mode (Profils, Commentaires, Entreprises) directement dans les cartes de configuration de l'AutopilotPanel, au lieu d'un simple champ texte unique par mode.

### 1. Migration SQL — nouveaux champs de filtre

Ajouter des colonnes de filtrage dans `prospection_autopilot_config` :

```sql
-- Filtres Profils
profiles_location text         -- Ex: "France", "Paris"
profiles_industry text         -- Ex: "SaaS", "IA"
profiles_title_filter text     -- Ex: "CEO, CTO, Fondateur"
profiles_company_size text     -- Ex: "1-50", "51-200", "201-500"

-- Filtres Commentaires  
commenters_min_likes integer DEFAULT 0      -- Nb min de likes sur le commentaire
commenters_filter_headline text             -- Filtrer par headline (ex: "CEO, Directeur")
commenters_exclude_keywords text            -- Exclure certains profils

-- Filtres Entreprises
companies_location text        -- Ex: "France"
companies_size_min integer     -- Taille min employés
companies_size_max integer     -- Taille max employés
companies_industry_filter text -- Secteur spécifique
```

### 2. Frontend — Filtres dans chaque carte de mode

Transformer les 3 blocs de configuration actuels (lignes 377-406) en sections enrichies :

**Profils** :
- Mots-clés de recherche (existant)
- Localisation (input texte)
- Secteur d'activité (input texte)
- Titre / poste ciblé (input texte, ex: "CEO, CTO, VP Sales")
- Taille d'entreprise (select : 1-50, 51-200, 201-500, 500+)

**Commentaires** :
- IDs de posts (existant)
- Filtrer par headline (input texte, ex: "Directeur, CEO")
- Likes minimum sur le commentaire (input number)
- Exclure des mots-clés (input texte)

**Entreprises** :
- Mots-clés entreprises (existant)
- Localisation (input texte)
- Taille min / max employés (2 inputs number)
- Secteur d'activité (input texte)

Chaque section de filtre sera repliable sous un bouton "Filtres avancés" pour ne pas surcharger l'interface.

### 3. Edge Function — utiliser les filtres

Modifier `prospection-autopilot` pour transmettre les filtres aux fonctions de recherche existantes (`search-profiles`, `extract-commenters`, `search-companies`) et filtrer côté serveur les résultats selon les critères définis.

### Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| Migration SQL | 10 nouvelles colonnes de filtrage |
| `src/pages/ProspectionPage.tsx` | Enrichir les 3 blocs de config avec les filtres |
| `supabase/functions/prospection-autopilot/index.ts` | Transmettre les filtres aux recherches |

### Section technique

- Tous les nouveaux champs sont nullable (pas de valeur par défaut obligatoire) pour compatibilité avec les configs existantes
- Les filtres `headline` et `exclude_keywords` appliquent un filtre côté code après récupération des résultats Unipile (l'API ne supporte pas tous les filtres nativement)
- L'UI utilise un `Collapsible` pour les filtres avancés afin de garder la page lisible
- Le `saveMutation` existant est étendu pour inclure les nouveaux champs dans le payload

