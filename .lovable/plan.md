

## Ajout de la connexion LinkedIn via Unipile Hosted Auth

### Probleme
L'application utilise l'API Unipile mais il n'y a aucun moyen de connecter un compte LinkedIn depuis l'interface. Sans compte connecte, les fonctions de recherche et de synchronisation echouent.

### Solution
Utiliser le **Hosted Auth Wizard** de Unipile : une edge function genere un lien temporaire via `POST /api/v1/hosted/accounts/link`, et l'utilisateur est redirige vers ce lien pour connecter son compte LinkedIn.

### Plan

**1. Nouvelle Edge Function `connect-linkedin`**
- Appelle `POST https://${UNIPILE_DSN}/api/v1/hosted/accounts/link` avec les parametres :
  - `type: "create"`
  - `providers: ["LINKEDIN"]`
  - `api_url: "https://${UNIPILE_DSN}"`
- Retourne l'URL d'authentification hebergee au frontend

**2. Nouvelle Edge Function `check-linkedin-connection`**
- Appelle `GET https://${UNIPILE_DSN}/api/v1/accounts` pour verifier si un compte LinkedIn est deja connecte
- Retourne le statut de connexion (connecte/non connecte) et les infos du compte

**3. Mise a jour de la page Configuration (`SettingsPage.tsx`)**
- Ajouter une carte "Compte LinkedIn" avec :
  - Statut de connexion (connecte / non connecte) avec indicateur visuel
  - Bouton "Connecter mon compte LinkedIn" qui appelle l'edge function et ouvre le lien dans un nouvel onglet
  - Nom/email du compte connecte si disponible
  - Bouton "Verifier la connexion" pour rafraichir le statut

**4. Indicateur de connexion dans le layout**
- Ajouter un petit badge dans le header (point vert/rouge) indiquant si un compte LinkedIn est connecte
- Permet a l'utilisateur de voir rapidement l'etat sans aller dans les settings

### Fichiers concernes
- `supabase/functions/connect-linkedin/index.ts` (nouveau)
- `supabase/functions/check-linkedin-connection/index.ts` (nouveau)
- `src/pages/SettingsPage.tsx` (modifie)
- `src/components/layout/AppLayout.tsx` (modifie)

