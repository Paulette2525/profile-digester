import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Zap, Clock, Calendar, Eye, Rocket, TrendingUp, Brain, Play, ImageIcon } from "lucide-react";
import { ContentMixCard } from "@/components/autopilot/ContentMixCard";
import { DailyPlanCard } from "@/components/autopilot/DailyPlanCard";

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

  const { data: config, isLoading } = useQuery({
    queryKey: ["autopilot-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_config")
        .select("id,enabled,posts_per_day,active_days,posting_hours,industries_to_watch,approval_mode,last_run_at,content_mix,daily_content_plan,auto_visuals")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: trends } = useQuery({
    queryKey: ["trend-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trend_insights")
        .select("id,topic,source,used,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
      queryClient.invalidateQueries({ queryKey: ["autopilot-config", user?.id] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    },
  });

  const [running, setRunning] = useState(false);
  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-run", { body: { force: true } });
      if (error) throw error;
      toast({ title: "Autopilote exécuté", description: `${data?.results?.[0]?.postsGenerated || 0} posts générés` });
      queryClient.invalidateQueries({ queryKey: ["trend-insights", user?.id] });
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
    content_mix: { news: 30, tutorial: 25, viral: 25, storytelling: 20 },
    daily_content_plan: {},
    auto_visuals: false,
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Mode Autopilote
          </h1>
          {currentConfig.last_run_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Dernière exécution : {new Date(currentConfig.last_run_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={runNow} disabled={running} variant="outline" size="sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Exécuter
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
            <Switch
              checked={currentConfig.enabled}
              onCheckedChange={(enabled) => saveMutation.mutate({ enabled })}
            />
            <Label className="font-medium text-sm">
              {currentConfig.enabled ? "Actif" : "Inactif"}
            </Label>
          </div>
        </div>
      </div>

      {/* Section 1: Essentiel */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Fréquence</span>
            </div>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Approbation</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={currentConfig.approval_mode === "review" ? "default" : "outline"}
                size="sm"
                onClick={() => saveMutation.mutate({ approval_mode: "review" })}
              >
                Révision
              </Button>
              <Button
                variant={currentConfig.approval_mode === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => saveMutation.mutate({ approval_mode: "auto" })}
              >
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {currentConfig.approval_mode === "review" ? "Brouillons pour validation" : "Publication automatique"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Planning (Tabs) */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="days">
            <TabsList className="w-full">
              <TabsTrigger value="days" className="flex-1">
                <Calendar className="h-3.5 w-3.5 mr-1" /> Jours
              </TabsTrigger>
              <TabsTrigger value="hours" className="flex-1">
                <Clock className="h-3.5 w-3.5 mr-1" /> Heures
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1">
                <Zap className="h-3.5 w-3.5 mr-1" /> Hebdo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="days" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">Jours de publication actifs</p>
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
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">Heures de publication</p>
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
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <DailyPlanCard
                dailyPlan={(currentConfig.daily_content_plan || {}) as Record<string, string>}
                activeDays={currentConfig.active_days || []}
                onSave={(daily_content_plan) => saveMutation.mutate({ daily_content_plan })}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Section 3: Contenu (Accordion) */}
      <Accordion type="multiple" defaultValue={["mix"]} className="space-y-2">
        <AccordionItem value="mix" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" /> Mix de contenu
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ContentMixCard
              contentMix={(currentConfig.content_mix || { news: 30, tutorial: 25, viral: 25, storytelling: 20 }) as { news: number; tutorial: number; viral: number; storytelling: number }}
              onSave={(content_mix) => saveMutation.mutate({ content_mix })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visuals" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4 text-primary" /> Visuels automatiques
              <Badge variant={currentConfig.auto_visuals ? "default" : "secondary"} className="ml-2 text-xs">
                {currentConfig.auto_visuals ? "ON" : "OFF"}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-3 py-2">
              <Switch
                checked={currentConfig.auto_visuals || false}
                onCheckedChange={(auto_visuals) => saveMutation.mutate({ auto_visuals })}
              />
              <Label>{currentConfig.auto_visuals ? "Visuels IA activés" : "Visuels IA désactivés"}</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentConfig.auto_visuals
                ? "Un visuel sera généré automatiquement pour chaque post (thème bleu)"
                : "Vous pourrez générer les visuels manuellement depuis Publications"}
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="topics" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" /> Sujets à surveiller
              {(currentConfig.industries_to_watch || []).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{(currentConfig.industries_to_watch || []).length}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="Ex: IA, SaaS, Leadership..."
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
                <p className="text-sm text-muted-foreground">Aucun sujet — l'IA utilisera votre industrie depuis la Mémoire</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Section 4: Tendances */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" /> Tendances récentes
            </CardTitle>
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
    </div>
  );
}
