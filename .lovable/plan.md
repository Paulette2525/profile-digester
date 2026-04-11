

## Plan : Sequences de prospection multi-etapes avec relances automatiques

### Objectif

Ajouter la possibilite de definir des sequences de messages (message initial + relances a J+3, J+7, etc.) lors de la creation d'une campagne, et executer automatiquement ces relances.

### 1. Migration SQL

Nouvelle table `prospection_sequence_steps` pour stocker les etapes de chaque campagne :

```sql
CREATE TABLE public.prospection_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL DEFAULT 1,
  delay_days integer NOT NULL DEFAULT 0,
  message_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: users manage via campaign ownership
```

Ajout de colonnes sur `prospection_messages` :

```sql
ALTER TABLE public.prospection_messages 
  ADD COLUMN step_order integer NOT NULL DEFAULT 1,
  ADD COLUMN next_followup_at timestamptz;
```

### 2. Frontend — `ProspectionPage.tsx`

- Ajouter un systeme d'etapes dynamique dans la section "Lancer une campagne" :
  - Etape 1 (existante) = message initial (delai 0)
  - Bouton "Ajouter une relance" pour creer des etapes supplementaires avec un champ delai (J+3, J+7, etc.) et un template de message
  - Chaque etape affichable/supprimable
  - Variables `{name}`, `{headline}` disponibles dans chaque message
- Lors du lancement, inserer les steps dans `prospection_sequence_steps` et programmer les relances
- Dans `CampaignRow`, afficher le step_order (Etape 1, Relance 1, Relance 2) pour chaque message

### 3. Edge Function — `prospect-outreach/index.ts`

- Sauvegarder les sequence steps en base lors du lancement
- Apres envoi du message initial, calculer `next_followup_at` = `sent_at + delay_days` pour le prochain step
- Ne traiter que les messages dont `step_order` correspond a l'etape courante

### 4. Nouvelle Edge Function — `prospect-followup/index.ts`

- Declenchee par un cron (toutes les heures ou quotidiennement)
- Requete : messages avec `next_followup_at <= now()` et status `sent` (pas de reponse)
- Pour chaque message eligible, envoyer la relance suivante via Unipile, creer un nouveau message avec `step_order + 1`
- Si le prospect a repondu (`status = replied`), ne pas envoyer la relance

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer `prospection_sequence_steps`, ajouter colonnes sur `prospection_messages` |
| `src/pages/ProspectionPage.tsx` | UI des sequences multi-etapes + affichage step dans historique |
| `supabase/functions/prospect-outreach/index.ts` | Sauvegarder steps, calculer `next_followup_at` |
| `supabase/functions/prospect-followup/index.ts` | Nouvelle fonction pour les relances auto |

