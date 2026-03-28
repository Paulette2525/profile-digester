import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, Info } from "lucide-react";

const SettingsPage = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground">Gérez les paramètres de l'agent LinkedIn</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="h-5 w-5" />
              Clé API Unipile
            </CardTitle>
            <CardDescription>
              Votre clé API est stockée de manière sécurisée côté serveur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration sécurisée</p>
                <p className="text-muted-foreground mt-1">
                  La clé API Unipile est configurée comme un secret côté serveur dans Lovable Cloud.
                  Elle est utilisée par les Edge Functions pour communiquer avec l'API Unipile
                  sans jamais être exposée côté client.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Agent LinkedIn — Dashboard de suivi de contenu</p>
            <p>
              Cette application surveille les publications LinkedIn de profils sélectionnés
              en utilisant l'API Unipile pour extraire les données (posts, likes, commentaires).
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
