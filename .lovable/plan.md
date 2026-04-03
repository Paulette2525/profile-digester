

## Plan : Publication automatique des posts planifiés

### Problème

Deux problèmes distincts empêchent la publication automatique :

1. **Aucun cron job n'existe** pour appeler `publish-scheduled-post` automatiquement. La fonction edge existe et gère correctement le mode "cron" (sans body = chercher tous les posts scheduled dont `scheduled_at <= now`), mais rien ne la déclenche.

2. **Erreur Unipile "Unexpected field"** visible dans les logs : le champ `media` dans le FormData n'est pas reconnu par l'API Unipile. Le nom correct du champ pour les images est probablement `image` ou `media[]`, ou l'API attend un format JSON avec une URL plutôt que du multipart.

### Solution

**1. Corriger l'appel Unipile dans `publish-scheduled-post`**

Le 400 "Unexpected field" indique que Unipile n'accepte pas le champ `media` en FormData. D'après la documentation Unipile, l'API `/api/v1/posts` pour LinkedIn attend :
- `account_id` (string)
- `text` (string)  
- `media` → doit être envoyé comme fichier avec le bon content-type

Le problème vient probablement du fait que le blob téléchargé n'a pas le bon MIME type. Je vais :
- Détecter le MIME type réel de l'image (depuis le response header `content-type`)
- Utiliser le bon nom de fichier avec extension correcte
- Si l'image échoue toujours, publier sans image plutôt que de bloquer

**2. Créer un cron job toutes les 5 minutes**

Utiliser `pg_cron` + `pg_net` pour appeler `publish-scheduled-post` toutes les 5 minutes. La fonction vérifiera s'il y a des posts avec `status = 'scheduled'` et `scheduled_at <= now()`, et les publiera automatiquement.

### Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/publish-scheduled-post/index.ts` | Corriger le FormData pour Unipile (MIME type, nom de champ) |
| SQL (insert, pas migration) | Créer le cron job `pg_cron` toutes les 5 minutes |

### Section technique

- Le cron job utilisera `net.http_post` pour appeler la fonction edge sans body (mode cron)
- Les extensions `pg_cron` et `pg_net` seront activées via migration
- La fonction edge ne nécessite pas de JWT (déjà configuré avec `verify_jwt = false`)
- Fréquence de 5 minutes = précision suffisante pour des posts LinkedIn planifiés à l'heure

