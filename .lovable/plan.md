
## Agent LinkedIn - Dashboard de Suivi de Contenu

### Vue d'ensemble
Application de suivi de publications LinkedIn utilisant l'API Unipile, avec un dashboard simple listant les posts, likes et commentaires de profils surveillés, stockés dans une base de données Supabase.

### Architecture

**Backend (Lovable Cloud + Supabase)**
- Table `tracked_profiles` : URL LinkedIn, nom, identifiant Unipile, date d'ajout
- Table `linkedin_posts` : contenu du post, date, auteur, nombre de likes, nombre de commentaires, lien vers le post
- Table `post_interactions` : détail des likes et commentaires sur chaque post
- Edge function `sync-linkedin` : appelle l'API Unipile pour récupérer les publications des profils suivis et stocker les résultats
- Edge function `search-profiles` : recherche de profils via l'API Unipile

**Pages & Fonctionnalités**

1. **Dashboard principal**
   - Liste des profils suivis avec avatar, nom et stats récentes
   - Feed des dernières publications de tous les profils suivis
   - Chaque post affiche : auteur, contenu (tronqué), date, nombre de likes, nombre de commentaires
   - Bouton de synchronisation manuelle pour rafraîchir les données

2. **Page Profil**
   - Détail d'un profil suivi avec tous ses posts
   - Liste des likes et commentaires sur chaque post
   - Possibilité de supprimer le profil du suivi

3. **Ajout de profils**
   - Formulaire pour coller une URL LinkedIn
   - Recherche intégrée via l'API Unipile avec résultats cliquables
   - Ajout en un clic à la liste de suivi

4. **Configuration**
   - Champ pour stocker la clé API Unipile (secret côté serveur)

### Design
- Interface épurée, style tableau de bord professionnel
- Couleurs LinkedIn (bleu #0A66C2) comme accent
- Cards pour les posts, table pour la liste des profils
- Responsive mobile
