import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Linkedin, CheckCircle, XCircle, RefreshCw, ExternalLink, Unplug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    account?: { id: string; name: string; status: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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
        toast.info("Connectez votre compte LinkedIn dans l'onglet ouvert, puis revenez ici et cliquez sur « Vérifier ».");
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

  const handleDisconnect = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter votre compte LinkedIn ?")) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("disconnect-linkedin");
      if (error) throw error;
      if (data?.success) {
        toast.success("Compte LinkedIn déconnecté");
        setConnectionStatus({ connected: false });
        queryClient.invalidateQueries({ queryKey: ["account-stats"] });
        queryClient.invalidateQueries({ queryKey: ["published-posts-analysis"] });
      }
    } catch (e) {
      console.error("Error disconnecting:", e);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
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
          <p className="text-muted-foreground">Gérez la connexion de votre compte LinkedIn</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Linkedin className="h-5 w-5" />
              Compte LinkedIn
            </CardTitle>
            <CardDescription>
              Connectez votre compte LinkedIn pour activer toutes les fonctionnalités de la plateforme
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Vérifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Unplug className="h-4 w-4 mr-1" />}
                    Déconnecter
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Non connecté</p>
                    <p className="text-sm text-muted-foreground">
                      Connectez votre compte LinkedIn pour utiliser l'application.
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
              <Settings className="h-5 w-5" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Agent LinkedIn — Plateforme intelligente de gestion de contenu</p>
            <p>
              Cette application gère votre présence LinkedIn : création de contenu, analyse de performance,
              engagement automatique et stratégie de publication optimisée.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
