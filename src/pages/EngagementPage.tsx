import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, MessageSquare, Heart, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function EngagementPage() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["auto-engagement-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_engagement_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["auto-engagement-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_engagement_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Update config mutation
  const updateConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!config?.id) return;
      const { error } = await supabase
        .from("auto_engagement_config")
        .update(updates)
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-engagement-config"] });
      toast({ title: "Configuration sauvegardée" });
    },
    onError: (e) => {
      toast({ title: "Erreur", description: String(e), variant: "destructive" });
    },
  });

  // Run engagement
  const runEngagement = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-engage-comments");
      if (error) throw error;
      toast({
        title: "Engagement exécuté",
        description: data?.message || `${data?.processed || 0} actions effectuées`,
      });
      queryClient.invalidateQueries({ queryKey: ["auto-engagement-logs"] });
    } catch (e) {
      toast({ title: "Erreur", description: String(e), variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const [replyPrompt, setReplyPrompt] = useState("");
  const [dmTemplate, setDmTemplate] = useState("");

  useEffect(() => {
    if (config) {
      setReplyPrompt(config.reply_prompt || "");
      setDmTemplate(config.dm_template || "");
    }
  }, [config]);

  if (configLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const actionIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="h-4 w-4 text-red-500" />;
      case "reply": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "dm": return <Send className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const actionLabel = (type: string) => {
    switch (type) {
      case "like": return "Like";
      case "reply": return "Réponse";
      case "dm": return "Message privé";
      default: return type;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Engagement Automatique</h1>
            <p className="text-muted-foreground">Gérez les réponses, likes et messages automatiques sur vos posts LinkedIn</p>
          </div>
          <Button onClick={runEngagement} disabled={isRunning}>
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Exécuter maintenant
          </Button>
        </div>

        {/* Toggles */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Auto-Réponse
              </CardTitle>
              <CardDescription>Répondre automatiquement aux commentaires avec l'IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config?.auto_reply || false}
                  onCheckedChange={(v) => updateConfig.mutate({ auto_reply: v })}
                />
                <Label>{config?.auto_reply ? "Activé" : "Désactivé"}</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Auto-DM
              </CardTitle>
              <CardDescription>Envoyer un message privé aux commentateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config?.auto_dm || false}
                  onCheckedChange={(v) => updateConfig.mutate({ auto_dm: v })}
                />
                <Label>{config?.auto_dm ? "Activé" : "Désactivé"}</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" /> Auto-Like
              </CardTitle>
              <CardDescription>Liker automatiquement les commentaires reçus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config?.auto_like || false}
                  onCheckedChange={(v) => updateConfig.mutate({ auto_like: v })}
                />
                <Label>{config?.auto_like ? "Activé" : "Désactivé"}</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prompts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prompt de réponse IA</CardTitle>
              <CardDescription>Instructions pour générer les réponses automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={replyPrompt}
                onChange={(e) => setReplyPrompt(e.target.value)}
                rows={4}
                placeholder="Instructions pour l'IA..."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateConfig.mutate({ reply_prompt: replyPrompt })}
                disabled={updateConfig.isPending}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template message privé</CardTitle>
              <CardDescription>Utilisez {"{author_name}"} pour le nom du commentateur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={dmTemplate}
                onChange={(e) => setDmTemplate(e.target.value)}
                rows={4}
                placeholder="Bonjour {author_name}, merci..."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateConfig.mutate({ dm_template: dmTemplate })}
                disabled={updateConfig.isPending}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique des actions</CardTitle>
            <CardDescription>Dernières 50 actions automatiques</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune action pour le moment</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Contenu</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {actionIcon(log.action_type)}
                          <span className="text-xs">{actionLabel(log.action_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.author_name || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {log.content_sent || "—"}
                      </TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" /> Erreur
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
