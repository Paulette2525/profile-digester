
Objectif

Rendre la plateforme beaucoup plus rapide, supprimer l’écran blanc entre les pages, et réduire les lenteurs structurelles côté interface et base de données.

Constat après inspection

- Le blanc au changement de page vient surtout de `src/App.tsx` : toutes les pages sont lazy-loadées derrière un `Suspense` global plein écran. À chaque navigation, l’ancienne page disparaît avant que la suivante soit prête.
- Le shell principal se remonte trop souvent : chaque page protégée embarque son propre `AppLayout`, donc sidebar + header sont recréés inutilement.
- Plusieurs pages font des requêtes trop larges (`select("*")`) et sans filtre explicite `user_id`, ce qui ralentit les lectures quand les données grossissent.
- La page Autopilote sauvegarde trop souvent pendant l’usage, surtout avec les sliders, ce qui donne une sensation de lourdeur.
- Il manque des index sur les lectures les plus fréquentes.
- Il y a aussi un warning React sur `Badge` (ref) à corriger pour stabiliser l’UI.

Plan d’implémentation

1. Supprimer l’écran blanc à la navigation
- Refaire le routage protégé dans `src/App.tsx` avec un shell persistant.
- Garder `AppLayout` monté une seule fois, puis afficher les pages via un `Outlet`.
- Rendre `AppLayout` compatible avec l’imbrication pour ne pas casser les pages existantes immédiatement.
- Remplacer le loader plein écran par un loader intégré au contenu.
- Ajouter un `ScrollToTop` pour lisser la transition entre pages.

2. Réduire fortement le coût des requêtes
- Ajouter `eq("user_id", user.id)` partout où il manque.
- Remplacer les `select("*")` par des sélections minimales sur les pages lourdes.
- Priorité sur :
  - `src/pages/Index.tsx`
  - `src/pages/AnalyserPage.tsx`
  - `src/pages/PlanifierPage.tsx`
  - `src/pages/MemoirePage.tsx`
  - `src/pages/CalendarPage.tsx`
  - `src/pages/AutopilotPage.tsx`
- Garder les anciennes données visibles pendant les refetchs pour éviter les écrans vides.

3. Optimiser la page Autopilote
- Passer à un état local + sauvegarde groupée / debounce au lieu d’écrire au moindre changement.
- Dans `src/components/autopilot/ContentMixCard.tsx`, sauvegarder au relâchement du slider, pas pendant tout le drag.
- Stabiliser les query keys avec `user?.id`.
- Corriger le warning `Badge` dans `src/components/ui/badge.tsx` avec `forwardRef`.

4. Optimiser les pages les plus lourdes
- `SuggestedPostsPage.tsx` : réduire le volume initial chargé et garder “Voir plus”.
- `PlanifierPage.tsx` : filtrer par utilisateur et ne charger que les colonnes utiles.
- `AnalyserPage.tsx` : filtrer toutes les requêtes par utilisateur et limiter les datasets des graphiques.
- `MemoirePage.tsx` : différer les requêtes secondaires (photos, idées) jusqu’à l’ouverture des sections concernées.
- `CalendarPage.tsx` : requête mensuelle plus ciblée + conservation des données pendant le changement de mois.

5. Accélérer la base de données
- Créer une migration d’index pour les chemins critiques :
  - `tracked_profiles (user_id, created_at desc)`
  - `linkedin_posts (user_id, posted_at desc)`
  - `suggested_posts (user_id, status, created_at desc)`
  - `suggested_posts (user_id, scheduled_at)`
  - `suggested_posts (user_id, published_at desc)`
  - `content_ideas (user_id, used, created_at desc)`
  - `user_photos (user_id, created_at desc)`
  - `trend_insights (user_id, created_at desc)`
  - `auto_engagement_logs (user_id, created_at desc)`
  - `post_dm_rules (user_id, created_at desc)`

Résultat attendu

- Plus d’écran blanc entre les pages.
- Navigation plus fluide car le shell restera affiché.
- Chargements plus rapides grâce à des requêtes plus petites et mieux filtrées.
- Autopilote plus réactif car il n’écrira plus en continu.
- Base plus performante sur toutes les pages clés.

Fichiers principaux concernés

- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/ScrollToTop.tsx` (nouveau)
- `src/components/ui/badge.tsx`
- `src/components/autopilot/ContentMixCard.tsx`
- `src/pages/AutopilotPage.tsx`
- `src/pages/Index.tsx`
- `src/pages/SuggestedPostsPage.tsx`
- `src/pages/PlanifierPage.tsx`
- `src/pages/AnalyserPage.tsx`
- `src/pages/MemoirePage.tsx`
- `src/pages/CalendarPage.tsx`
- migration SQL pour les index

Section technique

- Le gain le plus visible viendra du shell persistant + suppression du `Suspense` plein écran.
- Le gain le plus structurel viendra des filtres `user_id`, des `select` plus petits et des index.
- Je corrigerai d’abord le code et les accès base de données ; si le backend reste saturé après ça, on pourra ensuite augmenter la taille de l’instance Lovable Cloud.
