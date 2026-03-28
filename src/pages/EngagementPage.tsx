import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, MessageSquare, Heart, Send, CheckCircle, XCircle, Plus, Trash2, Link, Zap } from "lucide-react";
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
      const { data, error } = await supabase.from("auto_engagement_config").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["auto-engagement-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auto_engagement_logs").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch published posts for DM rules
  const { data: publishedPosts } = useQuery({
    queryKey: ["published-posts-for-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suggested_posts").select("id, content, topic").eq("status", "published").order("published_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch DM rules
  const { data: dmRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["post-dm-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_dm_rules" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!config?.id) return;
      const { error } = await supabase.from("auto_engagement_config").update(updates).eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-engagement-config"] });
      toast({ title: "Configuration sauvegardée" });
    },
    onError: (e) => toast({ title: "Erreur", description: String(e), variant: "destructive" }),
  });

  const runEngagement = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-engage-comments");
      if (error) throw error;
      toast({ title: "Engagement exécuté", description: data?.message || `${data?.processed || 0} actions effectuées` });
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

  // DM Rule form
  const [rulePostId, setRulePostId] = useState("");
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleMessage, setRuleMessage] = useState("");
  const [ruleUrl, setRuleUrl] = useState("");

  const addDmRule = async () => {
    if (!rulePostId || !ruleKeyword.trim() || !ruleMessage.trim()) {
      toast({ title: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("post_dm_rules" as any).insert({
      post_id: rulePostId,
      trigger_keyword: ruleKeyword.trim().toLowerCase(),
      dm_message: ruleMessage.trim(),
      resource_url: ruleUrl.trim() || null,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Règle DM créée !" });
    setRulePostId(""); setRuleKeyword(""); setRuleMessage(""); setRuleUrl("");
    queryClient.invalidateQueries({ queryKey: ["post-dm-rules"] });
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from("post_dm_rules" as any).update({ is_active: active } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["post-dm-rules"] });
  };

  const deleteRule = async (id: string) => {
    await supabase.from("post_dm_rules" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["post-dm-rules"] });
  };

  if (configLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  const actionIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="h-4 w-4 text-red-500" />;
      case "reply": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "dm": case "dm_rule": return <Send className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const actionLabel = (type: string) => {
    switch (type) {
      case "like": return "Like";
      case "reply": return "Réponse";
      case "dm": return "DM global";
      case "dm_rule": return "DM règle";
      default: return type;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Engagement Automatique</h1>
            <p className="text-muted-foreground">Gérez les réponses, likes et messages automatiques</p>
          </div>
          <Button onClick={runEngagement} disabled={isRunning}>
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Exécuter maintenant
          </Button>
        </div>

        {/* Toggles */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: "auto_reply", icon: MessageSquare, title: "Auto-Réponse", desc: "Répondre automatiquement aux commentaires" },
            { key: "auto_dm", icon: Send, title: "Auto-DM", desc: "Envoyer un message privé aux commentateurs" },
            { key: "auto_like", icon: Heart, title: "Auto-Like", desc: "Liker automatiquement les commentaires" },
          ].map(item => (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Switch checked={(config as any)?.[item.key] || false} onCheckedChange={v => updateConfig.mutate({ [item.key]: v })} />
                  <Label>{(config as any)?.[item.key] ? "Activé" : "Désactivé"}</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Prompts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prompt de réponse IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={replyPrompt} onChange={e => setReplyPrompt(e.target.value)} rows={4} placeholder="Instructions pour l'IA..." />
              <Button size="sm" variant="outline" onClick={() => updateConfig.mutate({ reply_prompt: replyPrompt })} disabled={updateConfig.isPending}>Sauvegarder</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template DM global</CardTitle>
              <CardDescription>Utilisez {"{author_name}"} pour le nom</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={dmTemplate} onChange={e => setDmTemplate(e.target.value)} rows={4} placeholder="Bonjour {author_name}, merci..." />
              <Button size="sm" variant="outline" onClick={() => updateConfig.mutate({ dm_template: dmTemplate })} disabled={updateConfig.isPending}>Sauvegarder</Button>
            </CardContent>
          </Card>
        </div>

        {/* Post-specific DM rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Règles DM par publication</CardTitle>
            <CardDescription>Envoyez des DM personnalisés quand un commentaire contient un mot-clé spécifique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Publication</Label>
                <Select value={rulePostId} onValueChange={setRulePostId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un post" /></SelectTrigger>
                  <SelectContent>
                    {publishedPosts?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="truncate block max-w-[200px]">{p.topic || p.content.substring(0, 40) + "…"}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mot-clé déclencheur</Label>
                <Input value={ruleKeyword} onChange={e => setRuleKeyword(e.target.value)} placeholder="moi, guide, intéressé…" />
              </div>
              <div className="space-y-1.5">
                <Label>Message DM</Label>
                <Input value={ruleMessage} onChange={e => setRuleMessage(e.target.value)} placeholder="Voici le lien promis…" />
              </div>
              <div className="space-y-1.5">
                <Label>URL ressource (optionnel)</Label>
                <div className="flex gap-1.5">
                  <Input value={ruleUrl} onChange={e => setRuleUrl(e.target.value)} placeholder="https://..." />
                  <Button onClick={addDmRule} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : dmRules && dmRules.length > 0 ? (
              <div className="space-y-2">
                {dmRules.map((rule: any) => {
                  const post = publishedPosts?.find(p => p.id === rule.post_id);
                  return (
                    <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Switch checked={rule.is_active} onCheckedChange={v => toggleRule(rule.id, v)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post?.topic || "Post"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">mot-clé: {rule.trigger_keyword}</Badge>
                          {rule.resource_url && <span className="flex items-center gap-1"><Link className="h-3 w-3" /> {rule.resource_url.substring(0, 30)}…</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{rule.dm_message}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune règle DM configurée</p>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique des actions</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
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
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">{actionIcon(log.action_type)}<span className="text-xs">{actionLabel(log.action_type)}</span></div>
                      </TableCell>
                      <TableCell className="text-sm">{log.author_name || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{log.content_sent || "—"}</TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>
                        ) : (
                          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Erreur</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}</TableCell>
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
