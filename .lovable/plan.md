

## Plan : Page Memoire + Stats compte sur Analyser

### 1. Page Analyser : Abonnes, connexions et evolution

**Ajouts sur `AnalyserPage.tsx` :**
- Appeler une nouvelle edge function `fetch-account-stats` qui recupere via Unipile les stats du compte LinkedIn (nombre d'abonnes/followers, nombre de connexions)
- Ajouter 2 cartes en haut : "Abonnes" et "Connexions"
- Ajouter un graphe LineChart "Evolution de la performance" qui trace l'evolution dans le temps des likes, commentaires, impressions cumules par date de publication (a partir des posts publies existants)

**Nouvelle edge function `fetch-account-stats/index.ts` :**
- Appel Unipile `GET /api/v1/users/me` pour recuperer followers_count et connections_count
- Retourne ces chiffres au frontend

### 2. Page Memoire (`/memoire`)

**Nouvelle table `user_memory` :**
- `id`, `created_at`, `updated_at`
- `full_name`, `profession`, `company`, `industry`
- `target_audience` (text), `offers_description` (text)
- `ambitions` (text), `values` (text), `tone_of_voice` (text)
- `content_themes` (text array), `content_types` (text array)
- `personal_story` (text), `expertise_areas` (text)
- `posting_frequency` (text), `preferred_formats` (text)
- `additional_notes` (text)

**Nouvelle table `user_photos` :**
- `id`, `created_at`, `image_url` (text), `description` (text)

**Nouvelle table `content_ideas` :**
- `id`, `created_at`, `idea_text` (text), `used` (boolean default false)

**Storage bucket `user-photos` :** pour stocker les photos uploadees

**Nouvelle page `src/pages/MemoirePage.tsx` :**
- **Section 1 - Formulaire Profil** : formulaire complet avec tous les champs de `user_memory` (nom, profession, entreprise, audience cible, offres, ambitions, valeurs, ton, themes, types de contenu, histoire personnelle, expertises, frequence, formats preferes, notes)
- **Section 2 - Mes Photos** : upload de photos avec description, grille d'apercu, suppression
- **Section 3 - Idees de publications** : textarea pour ajouter des idees, liste des idees existantes avec option supprimer

### 3. Integrer la memoire dans la generation de posts

**Modifier `generate-posts/index.ts` :**
- Avant de generer, recuperer les donnees de `user_memory`, `user_photos` et `content_ideas` non utilisees
- Injecter dans le prompt : informations personnelles, ton, themes, idees de contenu
- Quand des photos utilisateur existent, indiquer a l'IA de suggerer l'utilisation de photos personnelles dans certains posts (en ajoutant un champ `use_personal_photo: true` dans la reponse)
- Marquer les `content_ideas` utilisees comme `used = true`

**Modifier `analyze-virality/index.ts` :**
- Recuperer les donnees `user_memory` pour contextualiser l'analyse

### 4. Navigation

- Ajouter "Memoire" dans le groupe "Gestion" de `AppSidebar.tsx` (icone Brain)
- Route `/memoire` dans `App.tsx` avec lazy loading

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | 3 tables + bucket storage |
| `supabase/functions/fetch-account-stats/index.ts` | Creer |
| `src/pages/MemoirePage.tsx` | Creer |
| `src/pages/AnalyserPage.tsx` | Modifier (stats compte + graphe evolution) |
| `supabase/functions/generate-posts/index.ts` | Modifier (injecter memoire) |
| `supabase/functions/analyze-virality/index.ts` | Modifier (injecter memoire) |
| `src/App.tsx` | Ajouter route |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien Memoire |

