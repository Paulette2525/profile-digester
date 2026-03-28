

## Plan : Memoire enrichie + Idees avec images + Auto-DM par post

### 3 axes de changement

### 1. Enrichir le formulaire Memoire (profil)

**Nouveaux champs dans `user_memory`** (migration SQL) :
- `achievements` (text) — realisations, projets crees
- `unique_methodology` (text) — methode ou approche unique
- `key_results` (text) — resultats marquants (chiffres, impact)
- `differentiators` (text) — ce qui vous differencie des autres
- `audience_pain_points` (text) — problemes de votre audience
- `call_to_action_style` (text) — style de CTA prefere
- `linkedin_goals` (text) — objectifs LinkedIn specifiques
- `target_followers` (integer) — objectif nombre d'abonnes
- `target_connections` (integer) — objectif nombre de connexions
- `target_engagement_rate` (numeric) — objectif taux d'engagement %
- `goal_timeline` (text) — horizon temporel (1 mois, 3 mois, 6 mois)
- `competitors` (text) — leaders/concurrents dans votre domaine
- `content_pillars` (text array) — piliers de contenu strategiques
- `brand_keywords` (text array) — mots-cles de marque

**UI** : reorganiser `MemoirePage.tsx` en sections claires avec des titres :
- Identite (nom, profession, entreprise, industrie)
- Expertise & Realisations (expertise, realisations, methodologie, resultats, differenciateurs)
- Audience & Marche (audience cible, problemes audience, concurrents)
- Objectifs LinkedIn (abonnes vises, connexions visees, engagement vise, horizon)
- Strategie de contenu (themes, piliers, types, formats, frequence, ton, CTA)
- Histoire & Valeurs (histoire perso, valeurs, ambitions)
- Offres & Notes (offres, notes)

**Impact AI** : mettre a jour `generate-posts/index.ts` pour injecter les nouveaux champs dans le prompt (objectifs, realisations, differenciateurs, etc.)

### 2. Idees de publication avec images

**Modifier `content_ideas`** (migration) :
- Ajouter `image_url` (text, nullable) — URL de l'image associee

**UI dans MemoirePage.tsx** :
- Ajouter un bouton upload image a cote de chaque idee
- Afficher la miniature de l'image si presente
- Lors de l'ajout d'une idee, permettre d'uploader une image en meme temps

**Impact AI** : dans `generate-posts/index.ts`, quand une idee a une image, la mentionner et l'associer au post genere

### 3. Auto-DM specifique par post

**Nouvelle table `post_dm_rules`** (migration) :
- `id` (uuid)
- `post_id` (uuid, ref suggested_posts)
- `trigger_keyword` (text) — mot-cle declencheur dans le commentaire (ex: "moi", "interessé", "guide")
- `dm_message` (text) — message DM personnalise avec le lien/ressource
- `resource_url` (text, nullable) — URL de la ressource a envoyer
- `is_active` (boolean, default true)
- `created_at`

**UI dans EngagementPage.tsx** :
- Nouvelle section "Regles DM par post"
- Formulaire : selectionner un post publie, definir le mot-cle declencheur, le message DM et le lien
- Liste des regles actives avec toggle on/off et suppression

**Modifier `auto-engage-comments/index.ts`** :
- Avant d'appliquer le DM global, verifier s'il existe une regle specifique `post_dm_rules` pour ce post
- Si le commentaire contient le `trigger_keyword`, envoyer le `dm_message` personnalise au lieu du template global
- Logger l'action avec `action_type = "dm_rule"` pour differencier

### 4. Objectifs sur la page Analyser

**Modifier `AnalyserPage.tsx`** :
- Ajouter des indicateurs de progression vers les objectifs (barre de progression abonnes actuels vs objectif, etc.)
- Recuperer `user_memory` pour afficher les cibles

### Fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonnes `user_memory`, colonne `content_ideas.image_url`, table `post_dm_rules` |
| `src/pages/MemoirePage.tsx` | Enrichir formulaire + images sur idees |
| `src/pages/EngagementPage.tsx` | Ajouter section regles DM par post |
| `src/pages/AnalyserPage.tsx` | Ajouter progression objectifs |
| `supabase/functions/generate-posts/index.ts` | Injecter nouveaux champs memoire |
| `supabase/functions/auto-engage-comments/index.ts` | Gerer regles DM specifiques par post |

