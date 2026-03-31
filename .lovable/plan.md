

## Plan : Calendrier editorial + Boite a idees

### 1. Page Calendrier (`/calendrier`)

Nouvelle page affichant une vue calendrier mensuelle de toutes les publications (publiees, planifiees, brouillons). Chaque jour montre les posts avec un code couleur par statut (vert = publie, bleu = planifie, gris = brouillon). Clic sur un post pour voir/editer. Utilise les donnees existantes de `suggested_posts` (champs `scheduled_at`, `published_at`, `status`).

Position dans la sidebar : entre Publications et Performance.

### 2. Page Boite a idees (`/idees`)

Nouvelle page permettant de sauvegarder des idees de contenu avec :
- Selection du type (Tuto, Viral, Storytelling, News, Autre)
- Zone de texte pour decrire l'idee
- Upload optionnel d'une image (bucket `user-photos`)
- Liste des idees existantes avec badge de type et bouton supprimer

Utilise la table `content_ideas` existante. Ajout d'une colonne `content_type` (text) pour stocker le type choisi.

Position dans la sidebar : entre Memoire et Profils.

### 3. Integration avec l'Autopilote

Dans `autopilot-run/index.ts`, avant de generer les posts, verifier s'il y a des idees non utilisees dans `content_ideas`. Si oui, les integrer dans le prompt de generation et marquer `used = true` apres utilisation.

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `content_type` a `content_ideas` |
| `src/pages/CalendarPage.tsx` | Nouvelle page calendrier |
| `src/pages/IdeasPage.tsx` | Nouvelle page boite a idees |
| `src/components/layout/AppSidebar.tsx` | Ajouter les 2 entrees |
| `src/App.tsx` | Ajouter les 2 routes |
| `supabase/functions/autopilot-run/index.ts` | Consommer les idees |

