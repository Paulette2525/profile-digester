import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, RefreshCw, Calendar, Target, TrendingUp, Recycle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ContentPillar {
  name: string;
  percentage: number;
  description: string;
}

interface CalendarEntry {
  day: string;
  type: string;
  suggestion: string;
}

interface WinningFormat {
  format: string;
  avg_engagement?: number;
  recommendation: string;
}

interface RecyclingOpp {
  original_post_excerpt: string;
  new_angle: string;
  why: string;
}

interface Strategy {
  summary: string;
  positioning: string;
  content_pillars: ContentPillar[];
  weekly_calendar: CalendarEntry[];
  winning_formats: WinningFormat[];
  themes_to_explore: string[];
  recycling_opportunities: RecyclingOpp[];
}

const pillarColors = [
  "bg-primary/20 text-primary",
  "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-purple-500/20 text-purple-700 dark:text-purple-300",
];

export default function StrategiePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const strategy: Strategy | null = strategyRow?.strategy_json || null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-strategy");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Stratégie générée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["content-strategy"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la génération");
    },
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Stratégie de Contenu
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Plan personnalisé basé sur votre mémoire, vos analyses et vos performances
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : strategy ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {strategy ? "Actualiser" : "Générer ma stratégie"}
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && !strategy && !generateMutation.isPending && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune stratégie générée</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Cliquez sur "Générer ma stratégie" pour obtenir un plan de contenu personnalisé basé sur vos données.
                Remplissez d'abord votre Mémoire pour de meilleurs résultats.
              </p>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer ma stratégie
              </Button>
            </CardContent>
          </Card>
        )}

        {generateMutation.isPending && !strategy && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analyse en cours de vos données...</p>
              <p className="text-xs text-muted-foreground mt-1">Cela peut prendre 15-30 secondes</p>
            </CardContent>
          </Card>
        )}

        {strategy && (
          <div className="space-y-6">
            {/* Summary & Positioning */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Vision Stratégique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{strategy.summary}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Positionnement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{strategy.positioning}</p>
                </CardContent>
              </Card>
            </div>

            {/* Content Pillars */}
            {strategy.content_pillars?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Piliers de Contenu</CardTitle>
                  <CardDescription>Répartition recommandée de vos publications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strategy.content_pillars.map((pillar, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={pillarColors[i % pillarColors.length]}>
                            {pillar.name}
                          </Badge>
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

            {/* Weekly Calendar */}
            {strategy.weekly_calendar?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Calendrier Type (Semaine)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {strategy.weekly_calendar.map((entry, i) => (
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

            {/* Winning Formats */}
            {strategy.winning_formats?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Formats Gagnants
                  </CardTitle>
                  <CardDescription>Basé sur les performances réelles de vos posts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {strategy.winning_formats.map((wf, i) => (
                      <div key={i} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{wf.format}</span>
                          {wf.avg_engagement != null && (
                            <Badge variant="secondary" className="text-xs">
                              ~{wf.avg_engagement} eng.
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{wf.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Themes to Explore */}
            {strategy.themes_to_explore?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Thèmes à Explorer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {strategy.themes_to_explore.map((theme, i) => (
                      <Badge key={i} variant="outline">{theme}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recycling Opportunities */}
            {strategy.recycling_opportunities?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Recycle className="h-4 w-4 text-primary" />
                    Opportunités de Recyclage
                  </CardTitle>
                  <CardDescription>Vos meilleurs posts méritent une nouvelle vie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strategy.recycling_opportunities.map((opp, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground italic">
                        « {opp.original_post_excerpt} »
                      </p>
                      <p className="text-sm font-medium">→ {opp.new_angle}</p>
                      <p className="text-xs text-muted-foreground">{opp.why}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {strategyRow?.updated_at && (
              <p className="text-xs text-muted-foreground text-center">
                Dernière mise à jour : {new Date(strategyRow.updated_at).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
