

## Plan : Page stats séparée + activation par mode

### 1. Nouvelle page `/prospection/stats`

- Créer `src/pages/ProspectionStatsPage.tsx` — page dédiée qui fetch `prospection_campaigns` et `prospection_messages` puis affiche le composant `ProspectionStats` existant (déjà dans `src/components/prospection/ProspectionStats.tsx`)
- Supprimer l'import et l'utilisation de `<ProspectionStats>` dans `ProspectionPage.tsx` (ligne 1118)
- Ajouter la route `/prospection/stats` dans `App.tsx`
- Ajouter un lien "Stats Prospection" dans `AppSidebar.tsx` sous "Prospection" (icône `BarChart3`)

### 2. Bouton d'activation par mode (Profils / Commentaires / Entreprises)

**Migration SQL** : Remplacer le champ unique `enabled boolean` par 3 champs dans `prospection_autopilot_config` :
```sql
ALTER TABLE prospection_autopilot_config
  ADD COLUMN profiles_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN commenters_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN companies_enabled boolean NOT NULL DEFAULT false;

-- Migrer la valeur existante
UPDATE prospection_autopilot_config SET profiles_enabled = enabled WHERE mode = 'profiles';
UPDATE prospection_autopilot_config SET commenters_enabled = enabled WHERE mode = 'commenters';
UPDATE prospection_autopilot_config SET companies_enabled = enabled WHERE mode = 'companies';

ALTER TABLE prospection_autopilot_config DROP COLUMN enabled;
ALTER TABLE prospection_autopilot_config DROP COLUMN mode;
```

**Frontend — `AutopilotPanel`** : Remplacer le switch global + les onglets par 3 sections avec chacune :
- Un toggle ON/OFF dédié (Profils, Commentaires, Entreprises)
- Les champs de configuration spécifiques au mode (mots-clés, IDs de posts, etc.)
- Badge "ACTIF" sur chaque mode activé

**Edge Function — `prospection-autopilot`** : Modifier pour itérer sur les 3 modes indépendamment au lieu de lire `mode` + `enabled`.

### Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `src/pages/ProspectionStatsPage.tsx` | Créer |
| `src/pages/ProspectionPage.tsx` | Retirer ProspectionStats, modifier AutopilotPanel |
| `src/App.tsx` | Ajouter route `/prospection/stats` |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien Stats |
| Migration SQL | 3 colonnes enabled, supprimer `enabled` + `mode` |
| `supabase/functions/prospection-autopilot/index.ts` | Adapter à 3 modes indépendants |

