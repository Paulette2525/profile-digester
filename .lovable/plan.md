

## Plan : Désactiver la vérification email à l'inscription

### Changement unique

Utiliser l'outil `cloud--configure_auth` pour activer l'auto-confirmation des emails. Ainsi, quand un utilisateur s'inscrit avec nom + email + mot de passe, le compte est immédiatement actif sans avoir à cliquer sur un lien de confirmation.

### Fichier à modifier

| Fichier | Changement |
|---------|-----------|
| Configuration Auth (Cloud) | Activer `enable_signup: true`, `double_confirm_email_changes: false`, `enable_confirmations: false` |
| `src/pages/AuthPage.tsx` | Mettre à jour le message de succès après inscription (retirer "Vérifiez votre email") |

