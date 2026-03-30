import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorialCalendarDialog } from "@/components/strategy/EditorialCalendarDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, RefreshCw, Calendar, Target, TrendingUp, Recycle, Loader2, Sparkles, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface ContentPillar {
  name: string;
  percentage: number;
  description: string;
  content_type?: string;
}
interface CalendarEntry { day: string; type: string; suggestion: string; }
interface WinningFormat { format: string; avg_engagement?: number; recommendation: string; }
interface RecyclingOpp { original_post_excerpt: string; new_angle: string; why: string; }

interface StrategyVariant {
  variant_name: string;
  variant_emoji: string;
  frequency: string;
  summary: string;
  positioning: string;
  content_pillars: ContentPillar[];
  weekly_calendar: CalendarEntry[];
  winning_formats: WinningFormat[];
  themes_to_explore: string[];
  recycling_opportunities: RecyclingOpp[];
}

interface StrategyData {
  variants?: StrategyVariant[];
  selected_variant?: number | null;
  // Legacy single strategy fields
  summary?: string;
  positioning?: string;
  content_pillars?: ContentPillar[];
  weekly_calendar?: CalendarEntry[];
  winning_formats?: WinningFormat[];
  themes_to_explore?: string[];
  recycling_opportunities?: RecyclingOpp[];
}

const pillarColors = [
  "bg-primary/20 text-primary",
  "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-purple-500/20 text-purple-700 dark:text-purple-300",
];

const contentTypeColors: Record<string, string> = {
  "Storytelling": "bg-pink-500/10 text-pink-600",
  "Viral": "bg-red-500/10 text-red-600",
  "Tuto": "bg-blue-500/10 text-blue-600",
  "News": "bg-emerald-500/10 text-emerald-600",
  "Social Proof": "bg-amber-500/10 text-amber-600",
};

function StrategyView({ strategy, colors }: { strategy: StrategyVariant | StrategyData; colors?: boolean }) {
  const s = strategy as any;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Vision</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">{s.summary}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Positionnement</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">{s.positioning}</p></CardContent>
        </Card>
      </div>

      {s.content_pillars?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Piliers de Contenu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.content_pillars.map((pillar: ContentPillar, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={pillarColors[i % pillarColors.length]}>{pillar.name}</Badge>
                    {pillar.content_type && (
                      <Badge variant="outline" className={contentTypeColors[pillar.content_type] || ""}>{pillar.content_type}</Badge>
                    )}
                    <span className="text-sm font-medium">{pillar.percentage}%</span>
                  </div>
                </div>
                <Progress value={pillar.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {s.weekly_calendar?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Calendrier Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.weekly_calendar.map((entry: CalendarEntry, i: number) => (
                <div key={i} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{entry.day}</span>
                    <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {s.winning_formats?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Formats Gagnants</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {s.winning_formats.map((wf: WinningFormat, i: number) => (
                <div key={i} className="rounded-lg border p-3 space-y-1">
                  <span className="font-medium text-sm">{wf.format}</span>
                  <p className="text-xs text-muted-foreground">{wf.recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {s.themes_to_explore?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Thèmes à Explorer</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {s.themes_to_explore.map((t: string, i: number) => (
                <Badge key={i} variant="outline">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {s.recycling_opportunities?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Recycle className="h-4 w-4 text-primary" /> Recyclage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.recycling_opportunities.map((opp: RecyclingOpp, i: number) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <p className="text-xs italic text-muted-foreground">« {opp.original_post_excerpt} »</p>
                <p className="text-sm font-medium">→ {opp.new_angle}</p>
                <p className="text-xs text-muted-foreground">{opp.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StrategiePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch latest analysis for calendar dialog
  const { data: latestAnalysis } = useQuery({
    queryKey: ["latest-analysis", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("virality_analyses")
        .select("id")
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: strategyRow, isLoading } = useQuery({
    queryKey: ["content-strategy", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_strategy" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const strategyData: StrategyData | null = strategyRow?.strategy_json || null;
  const hasVariants = strategyData?.variants && strategyData.variants.length > 0;
  const activeVariantIndex = selectedVariant ?? strategyData?.selected_variant ?? null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-strategy");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("3 stratégies générées !");
      setSelectedVariant(null);
      queryClient.invalidateQueries({ queryKey: ["content-strategy"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la génération"),
  });

  const handleSelectVariant = async (index: number) => {
    setSelectedVariant(index);
    if (strategyRow?.id && strategyData) {
      const updated = { ...strategyData, selected_variant: index };
      await supabase.from("content_strategy" as any).update({ strategy_json: updated }).eq("id", strategyRow.id);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" /> Stratégie de Contenu
            </h1>
            <p className="text-muted-foreground text-sm mt-1">3 variantes personnalisées basées sur vos données</p>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : strategyData ? <RefreshCw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {strategyData ? "Actualiser" : "Générer mes stratégies"}
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}

        {!isLoading && !strategyData && !generateMutation.isPending && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune stratégie générée</h3>
              <p className="text-muted-foreground max-w-md mb-6">Cliquez pour obtenir 3 variantes de stratégie (Agressive, Équilibrée, Autoritaire).</p>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-2" /> Générer mes stratégies
              </Button>
            </CardContent>
          </Card>
        )}

        {generateMutation.isPending && !strategyData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Génération de 3 stratégies en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">Cela peut prendre 20-40 secondes</p>
            </CardContent>
          </Card>
        )}

        {/* Variant selector cards */}
        {hasVariants && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {strategyData!.variants!.map((variant, i) => (
                <Card
                  key={i}
                  className={`cursor-pointer transition-all hover:shadow-md ${activeVariantIndex === i ? "ring-2 ring-primary border-primary" : ""}`}
                  onClick={() => handleSelectVariant(i)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{variant.variant_emoji} {variant.variant_name}</span>
                      {activeVariantIndex === i && <Check className="h-4 w-4 text-primary" />}
                    </CardTitle>
                    <CardDescription className="text-xs">{variant.frequency}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-3">{variant.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {activeVariantIndex !== null && strategyData!.variants![activeVariantIndex] && (
              <>
                <StrategyView strategy={strategyData!.variants![activeVariantIndex]} />
                <div className="flex justify-center">
                  <Button onClick={() => setCalendarOpen(true)} className="gap-2">
                    Créer des posts basés sur cette stratégie <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Legacy single strategy display */}
        {!hasVariants && strategyData?.summary && (
          <>
            <StrategyView strategy={strategyData} />
            <div className="flex justify-center">
              <Button onClick={() => setCalendarOpen(true)} className="gap-2">
                Créer des posts <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {strategyRow?.updated_at && (
          <p className="text-xs text-muted-foreground text-center">
            Dernière mise à jour : {new Date(strategyRow.updated_at).toLocaleString("fr-FR")}
          </p>
        )}

        <EditorialCalendarDialog
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          analysisId={latestAnalysis?.id || null}
          strategyVariant={activeVariantIndex !== null ? strategyData?.variants?.[activeVariantIndex] : undefined}
        />
      </div>
    </AppLayout>
  );
}
