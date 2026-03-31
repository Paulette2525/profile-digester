import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Zap, Clock, Calendar, Eye, Rocket, TrendingUp, Brain, Play } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Lun" },
  { key: "tuesday", label: "Mar" },
  { key: "wednesday", label: "Mer" },
  { key: "thursday", label: "Jeu" },
  { key: "friday", label: "Ven" },
  { key: "saturday", label: "Sam" },
  { key: "sunday", label: "Dim" },
];

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function AutopilotPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newIndustry, setNewIndustry] = useState("");

  // Load config
  const { data: config, isLoading } = useQuery({
    queryKey: ["autopilot-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load recent trends
  const { data: trends } = useQuery({
    queryKey: ["trend-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trend_insights")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Upsert config
  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (config) {
        const { error } = await supabase
          .from("autopilot_config")
          .update(updates)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("autopilot_config")
          .insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-config"] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    },
  });

  // Manual run
  const [running, setRunning] = useState(false);
  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-run");
      if (error) throw error;
      toast({ title: "Autopilote exécuté", description: `${data?.results?.[0]?.postsGenerated || 0} posts générés` });
      queryClient.invalidateQueries({ queryKey: ["trend-insights"] });
    } catch (err: any) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const currentConfig = config || {
    enabled: false,
    posts_per_day: 2,
    active_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    posting_hours: [9, 12, 17],
    industries_to_watch: [],
    approval_mode: "review",
    last_run_at: null,
  };

  const toggleDay = (day: string) => {
    const days = [...(currentConfig.active_days || [])];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    saveMutation.mutate({ active_days: days });
  };

  const toggleHour = (hour: number) => {
    const hours = [...(currentConfig.posting_hours || [])];
    const idx = hours.indexOf(hour);
    if (idx >= 0) hours.splice(idx, 1);
    else hours.push(hour);
    hours.sort((a, b) => a - b);
    saveMutation.mutate({ posting_hours: hours });
  };

  const addIndustry = () => {
    if (!newIndustry.trim()) return;
    const industries = [...(currentConfig.industries_to_watch || []), newIndustry.trim()];
    saveMutation.mutate({ industries_to_watch: industries });
    setNewIndustry("");
  };

  const removeIndustry = (idx: number) => {
    const industries = [...(currentConfig.industries_to_watch || [])];
    industries.splice(idx, 1);
    saveMutation.mutate({ industries_to_watch: industries });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Mode Autopilote
            </h1>
            <p className="text-muted-foreground mt-1">
              Génération et planification automatique de vos publications LinkedIn
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={runNow} disabled={running} variant="outline" size="sm">
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Exécuter maintenant
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                checked={currentConfig.enabled}
                onCheckedChange={(enabled) => saveMutation.mutate({ enabled })}
              />
              <Label className="font-medium">
                {currentConfig.enabled ? "Actif" : "Inactif"}
              </Label>
            </div>
          </div>
        </div>

        {currentConfig.last_run_at && (
          <p className="text-xs text-muted-foreground">
            Dernière exécution : {new Date(currentConfig.last_run_at).toLocaleString("fr-FR")}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Frequency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" /> Fréquence
              </CardTitle>
              <CardDescription>Nombre de posts par jour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={currentConfig.posts_per_day}
                  onChange={(e) => saveMutation.mutate({ posts_per_day: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">posts / jour</span>
              </div>
            </CardContent>
          </Card>

          {/* Approval mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Mode d'approbation
              </CardTitle>
              <CardDescription>Comment les posts sont traités</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={currentConfig.approval_mode === "review" ? "default" : "outline"}
                  size="sm"
                  onClick={() => saveMutation.mutate({ approval_mode: "review" })}
                >
                  Révision manuelle
                </Button>
                <Button
                  variant={currentConfig.approval_mode === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => saveMutation.mutate({ approval_mode: "auto" })}
                >
                  Publication auto
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentConfig.approval_mode === "review"
                  ? "Les posts sont créés en brouillon pour votre validation"
                  : "Les posts sont directement planifiés et publiés automatiquement"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active days */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Jours actifs
            </CardTitle>
            <CardDescription>L'autopilote ne génère des posts que ces jours-là</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <Button
                  key={d.key}
                  variant={(currentConfig.active_days || []).includes(d.key) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(d.key)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posting hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Heures de publication
            </CardTitle>
            <CardDescription>Les posts seront planifiés à ces heures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {HOURS.map((h) => (
                <Button
                  key={h}
                  variant={(currentConfig.posting_hours || []).includes(h) ? "default" : "outline"}
                  size="sm"
                  className="w-12"
                  onClick={() => toggleHour(h)}
                >
                  {h}h
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Industries to watch */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Sujets à surveiller
            </CardTitle>
            <CardDescription>L'IA surveillera les tendances dans ces domaines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="Ex: Intelligence Artificielle, SaaS, Leadership..."
                onKeyDown={(e) => e.key === "Enter" && addIndustry()}
              />
              <Button onClick={addIndustry} size="sm">Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(currentConfig.industries_to_watch || []).map((ind: string, idx: number) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeIndustry(idx)}
                >
                  {ind} ✕
                </Badge>
              ))}
              {(currentConfig.industries_to_watch || []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun sujet configuré — l'IA utilisera votre industrie depuis la Mémoire</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" /> Tendances récentes détectées
              </CardTitle>
              <CardDescription>Sujets identifiés par la veille Perplexity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("fr-FR")} — {t.source}
                      </p>
                    </div>
                    <Badge variant={t.used ? "secondary" : "default"} className="text-xs">
                      {t.used ? "Utilisé" : "Nouveau"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Comment fonctionne l'Autopilote ?</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Chaque jour à 6h UTC, l'IA recherche les tendances dans vos domaines via Perplexity</li>
            <li>Elle charge votre Mémoire, vos profils suivis et vos posts performants</li>
            <li>Elle génère le nombre de posts configuré en respectant vos instructions de rédaction</li>
            <li>Les posts sont planifiés aux heures choisies</li>
            <li>Le cron de publication existant publie les posts à l'heure prévue</li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
