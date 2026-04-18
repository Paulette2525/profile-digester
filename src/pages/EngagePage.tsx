import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Loader2, Trash2, Play, Search, ExternalLink, CheckCircle2, XCircle, MessageCircle, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TONE_LABELS: Record<string, string> = {
  professionnel: "Professionnel",
  amical: "Amical",
  expert: "Expert",
  enthousiaste: "Enthousiaste",
};

export default function EngagePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("profiles");

  // Add profile dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [previewProfile, setPreviewProfile] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [autoLike, setAutoLike] = useState(true);
  const [autoComment, setAutoComment] = useState(true);
  const [tone, setTone] = useState("professionnel");

  // Profiles list
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["engaged-profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engaged_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Config
  const { data: config } = useQuery({
    queryKey: ["engaged-config", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("engaged_config").select("*").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Interactions
  const { data: interactions = [] } = useQuery({
    queryKey: ["engaged-interactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engaged_interactions")
        .select("*, engaged_profiles(name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Stats: 30-day daily counts
  const { data: dailyStats = [] } = useQuery({
    queryKey: ["engaged-daily-stats", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("engaged_interactions")
        .select("created_at, action_type, status")
        .gte("created_at", since.toISOString());
      const byDay: Record<string, { date: string; total: number; likes: number; comments: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        byDay[k] = { date: k.slice(5), total: 0, likes: 0, comments: 0 };
      }
      for (const r of data || []) {
        const k = r.created_at.slice(0, 10);
        if (byDay[k] && r.status === "success") {
          byDay[k].total++;
          if (r.action_type === "like") byDay[k].likes++;
          if (r.action_type === "comment") byDay[k].comments++;
        }
      }
      return Object.values(byDay);
    },
    enabled: !!user,
  });

  // Search profile
  const handleSearch = async () => {
    if (!linkedinUrl.trim()) return;
    setSearching(true);
    setPreviewProfile(null);
    try {
      const { data, error } = await supabase.functions.invoke("engaged-search-profile", {
        body: { linkedin_url: linkedinUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.degraded) {
        toast.warning("Service LinkedIn temporairement indisponible. Réessayez.");
        return;
      }
      setPreviewProfile(data);
    } catch (e: any) {
      toast.error(e.message || "Profil introuvable");
    } finally {
      setSearching(false);
    }
  };

  // Add profile
  const addProfile = useMutation({
    mutationFn: async () => {
      if (!previewProfile || !user) throw new Error("Profil manquant");
      const { error } = await supabase.from("engaged_profiles").insert({
        user_id: user.id,
        linkedin_url: linkedinUrl.trim(),
        name: previewProfile.name,
        avatar_url: previewProfile.avatar_url,
        headline: previewProfile.headline,
        unipile_provider_id: previewProfile.unipile_provider_id,
        auto_like: autoLike,
        auto_comment: autoComment,
        comment_tone: tone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil ajouté !");
      qc.invalidateQueries({ queryKey: ["engaged-profiles"] });
      setDialogOpen(false);
      setLinkedinUrl("");
      setPreviewProfile(null);
      setAutoLike(true);
      setAutoComment(true);
      setTone("professionnel");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de l'ajout"),
  });

  // Toggle profile active
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("engaged_profiles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engaged-profiles"] }),
  });

  // Delete profile
  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("engaged_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil supprimé");
      qc.invalidateQueries({ queryKey: ["engaged-profiles"] });
    },
  });

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) return;
      if (config?.id) {
        const { error } = await supabase.from("engaged_config").update(updates).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("engaged_config").insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engaged-config"] });
    },
  });

  // Run now
  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("engaged-run", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const s = data?.summary;
      toast.success(`Exécution terminée : ${s?.likes || 0} likes, ${s?.comments || 0} commentaires`);
      qc.invalidateQueries({ queryKey: ["engaged-interactions"] });
      qc.invalidateQueries({ queryKey: ["engaged-daily-stats"] });
      qc.invalidateQueries({ queryKey: ["engaged-profiles"] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur d'exécution"),
  });

  // KPIs
  const totalInteractions = interactions.length;
  const totalLikes = interactions.filter((i: any) => i.action_type === "like" && i.status === "success").length;
  const totalComments = interactions.filter((i: any) => i.action_type === "comment" && i.status === "success").length;
  const successRate = totalInteractions
    ? Math.round((interactions.filter((i: any) => i.status === "success").length / totalInteractions) * 100)
    : 0;

  // Top profiles
  const profileCounts: Record<string, { name: string; count: number; avatar?: string }> = {};
  for (const i of interactions as any[]) {
    const p = i.engaged_profiles;
    if (!p) continue;
    const k = i.engaged_profile_id;
    if (!profileCounts[k]) profileCounts[k] = { name: p.name, count: 0, avatar: p.avatar_url };
    if (i.status === "success") profileCounts[k].count++;
  }
  const topProfiles = Object.values(profileCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" />
            Engagé
          </h1>
          <p className="text-muted-foreground mt-1">
            Engagez automatiquement avec les publications de vos profils cibles
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profiles">Profils ({profiles.length})</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="settings">Réglages</TabsTrigger>
        </TabsList>

        {/* PROFILES */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{profiles.length} profil(s) suivi(s)</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Ajouter un profil
            </Button>
          </div>

          {profilesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : profiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun profil pour l'instant. Ajoutez-en un pour commencer.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {profiles.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="pt-4 flex gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={p.avatar_url} />
                      <AvatarFallback>{p.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{p.headline}</p>
                        </div>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: p.id, is_active: v })}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.auto_like && <Badge variant="secondary" className="text-xs"><ThumbsUp className="h-3 w-3 mr-1" />Like</Badge>}
                        {p.auto_comment && <Badge variant="secondary" className="text-xs"><MessageCircle className="h-3 w-3 mr-1" />Commentaire</Badge>}
                        <Badge variant="outline" className="text-xs">{TONE_LABELS[p.comment_tone]}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={p.linkedin_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Supprimer ${p.name} ?`)) deleteProfile.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total interactions</p>
              <p className="text-2xl font-bold">{totalInteractions}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Likes</p>
              <p className="text-2xl font-bold">{totalLikes}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Commentaires</p>
              <p className="text-2xl font-bold">{totalComments}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Taux de succès</p>
              <p className="text-2xl font-bold">{successRate}%</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Interactions sur 30 jours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="likes" stroke="hsl(var(--primary))" name="Likes" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke="hsl(var(--accent-foreground))" name="Commentaires" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {topProfiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 profils</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topProfiles.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                    <span className="flex-1 text-sm">{p.name}</span>
                    <Badge>{p.count} interactions</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dernières interactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune interaction pour l'instant</p>
              ) : (
                interactions.map((i: any) => (
                  <div key={i.id} className="flex gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {i.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {i.action_type === "like" ? <ThumbsUp className="h-3 w-3 mr-1" /> : <MessageCircle className="h-3 w-3 mr-1" />}
                          {i.action_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{i.engaged_profiles?.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(i.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{i.post_content_preview}</p>
                      {i.comment_text && (
                        <p className="text-xs mt-1 italic border-l-2 border-primary pl-2">"{i.comment_text}"</p>
                      )}
                      {i.error_message && (
                        <p className="text-xs text-destructive mt-1">{i.error_message}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activation</CardTitle>
              <CardDescription>Active ou désactive le moteur d'engagement automatique.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>Engagé activé</Label>
                <Switch
                  checked={config?.enabled || false}
                  onCheckedChange={(v) => saveConfig.mutate({ enabled: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sécurité anti-blocage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Limite quotidienne de commentaires</Label>
                  <span className="text-sm text-muted-foreground">{config?.daily_comment_limit ?? 30}</span>
                </div>
                <Slider
                  value={[config?.daily_comment_limit ?? 30]}
                  min={5}
                  max={100}
                  step={5}
                  onValueChange={([v]) => saveConfig.mutate({ daily_comment_limit: v })}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Délai entre actions (sec)</Label>
                  <span className="text-sm text-muted-foreground">{config?.delay_between_actions_seconds ?? 30}s</span>
                </div>
                <Slider
                  value={[config?.delay_between_actions_seconds ?? 30]}
                  min={10}
                  max={120}
                  step={5}
                  onValueChange={([v]) => saveConfig.mutate({ delay_between_actions_seconds: v })}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Fréquence vérification (min)</Label>
                  <span className="text-sm text-muted-foreground">{config?.check_frequency_minutes ?? 60} min</span>
                </div>
                <Slider
                  value={[config?.check_frequency_minutes ?? 60]}
                  min={15}
                  max={240}
                  step={15}
                  onValueChange={([v]) => saveConfig.mutate({ check_frequency_minutes: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt système IA</CardTitle>
              <CardDescription>Instruction pour l'IA qui génère les commentaires.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                defaultValue={config?.comment_prompt || ""}
                onBlur={(e) => {
                  if (e.target.value !== config?.comment_prompt) {
                    saveConfig.mutate({ comment_prompt: e.target.value });
                    toast.success("Prompt mis à jour");
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button onClick={() => runNow.mutate()} disabled={runNow.isPending} className="w-full">
                {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Lancer maintenant
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add profile dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un profil cible</DialogTitle>
            <DialogDescription>Collez l'URL LinkedIn du profil avec lequel engager.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {previewProfile && (
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex gap-3">
                  <Avatar><AvatarImage src={previewProfile.avatar_url} /><AvatarFallback>{previewProfile.name[0]}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold">{previewProfile.name}</p>
                    <p className="text-xs text-muted-foreground">{previewProfile.headline}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-like</Label>
                  <Switch checked={autoLike} onCheckedChange={setAutoLike} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-commentaire</Label>
                  <Switch checked={autoComment} onCheckedChange={setAutoComment} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Ton du commentaire</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TONE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addProfile.mutate()} disabled={!previewProfile || addProfile.isPending}>
              {addProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
