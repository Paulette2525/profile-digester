import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Info, Linkedin, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SettingsPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    account?: { id: string; name: string; status: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-linkedin-connection");
      if (error) throw error;
      setConnectionStatus(data);
    } catch (e) {
      console.error("Error checking connection:", e);
      toast.error("Impossible de vérifier la connexion LinkedIn");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-linkedin");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Connectez votre compte LinkedIn dans l'onglet ouvert, puis revenez ici et cliquez sur « Vérifier la connexion ».");
      } else {
        toast.error("Aucun lien de connexion reçu");
      }
    } catch (e) {
      console.error("Error connecting:", e);
      toast.error("Erreur lors de la génération du lien de connexion");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground">Gérez les paramètres de l'agent LinkedIn</p>
        </div>

        {/* LinkedIn Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Linkedin className="h-5 w-5" />
              Compte LinkedIn
            </CardTitle>
            <CardDescription>
              Connectez votre compte LinkedIn via Unipile pour activer la recherche et la synchronisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Vérification en cours…
              </div>
            ) : connectionStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-accent">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Connecté</p>
                    <p className="text-sm text-muted-foreground">
                      {connectionStatus.account?.name}
                    </p>
                  </div>
                  <Badge variant="secondary">{connectionStatus.account?.status}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Vérifier la connexion
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Non connecté</p>
                    <p className="text-sm text-muted-foreground">
                      Aucun compte LinkedIn n'est relié. Connectez-en un pour utiliser l'application.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-1" />
                    )}
                    Connecter mon compte LinkedIn
                  </Button>
                  <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Vérifier
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                  Elle est utilisée par les fonctions backend pour communiquer avec l'API Unipile
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
