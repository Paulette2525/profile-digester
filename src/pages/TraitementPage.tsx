import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Zap, Loader2, BarChart3, Target, Lightbulb, Clock, Hash, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function TraitementPage() {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(true);
  const [factorsOpen, setFactorsOpen] = useState(false);

  const { data: analyses, refetch } = useQuery({
    queryKey: ["virality-analyses"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virality_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const latestAnalysis = analyses?.[0];
  const analysisData = latestAnalysis?.analysis_json as any;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-virality", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Analyse de viralité terminée !");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const factorsChartData = analysisData?.factors?.map((f: any) => ({
    name: f.name?.length > 20 ? f.name.substring(0, 20) + "…" : f.name,
    score: f.score,
  })) || [];

  const radarData = analysisData?.factors?.slice(0, 8).map((f: any) => ({
    factor: f.name?.length > 15 ? f.name.substring(0, 15) + "…" : f.name,
    value: f.score,
  })) || [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Traitement & Analyse</h1>
            <p className="text-muted-foreground">Analysez les facteurs de viralité des publications les plus performantes</p>
          </div>
          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="lg">
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isAnalyzing ? "Analyse en cours…" : "Lancer l'analyse"}
          </Button>
        </div>

        {latestAnalysis?.status === "pending" && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Analyse en cours…</span>
            </CardContent>
          </Card>
        )}

        {analysisData?.summary && (
          <>
            {/* Summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Résumé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysisData.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {analysisData.analyzed_posts_count} posts analysés • Profils : {analysisData.profiles_analyzed?.join(", ")}
                </p>
              </CardContent>
            </Card>

            {/* Charts - Collapsible */}
            <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-base font-semibold">
                  <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Graphiques</span>
                  {chartsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-6 md:grid-cols-2 mt-2">
                  {factorsChartData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Facteurs de viralité (scores)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={factorsChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {radarData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Profil de viralité
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={radarData}>
                            <PolarGrid className="stroke-border" />
                            <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Content Patterns */}
            {analysisData.content_patterns && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🎣 Hooks d'accroche efficaces</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysisData.content_patterns.hooks?.map((h: string, i: number) => (
                      <div key={i} className="rounded-md bg-muted p-3 text-sm italic">"{h}"</div>
                    ))}
                    <div className="mt-3 text-sm">
                      <strong>Structure optimale :</strong> {analysisData.content_patterns.structure}
                    </div>
                    <div className="text-sm">
                      <strong>Longueur idéale :</strong> {analysisData.content_patterns.optimal_length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Mots-clés & CTA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {analysisData.top_keywords?.map((kw: string, i: number) => (
                        <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{kw}</span>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <strong className="text-sm">CTA efficaces :</strong>
                      {analysisData.content_patterns.cta_patterns?.map((c: string, i: number) => (
                        <div key={i} className="rounded-md bg-muted p-2 text-sm">→ {c}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Media & Timing */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📸 Impact des médias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysisData.media_insights}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timing optimal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysisData.timing_insights}</p>
                </CardContent>
              </Card>
            </div>

            {/* Factor Details - Collapsible */}
            <Collapsible open={factorsOpen} onOpenChange={setFactorsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-base font-semibold">
                  <span>Détail des facteurs ({analysisData.factors?.length || 0})</span>
                  {factorsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="space-y-4 pt-6">
                    {analysisData.factors?.map((f: any, i: number) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{f.name}</h4>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{f.score}/100</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{f.description}</p>
                        {f.examples?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Exemples :</span>
                            {f.examples.map((ex: string, j: number) => (
                              <div key={j} className="ml-2 text-xs italic text-muted-foreground bg-muted rounded p-2">"{ex}"</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Transition button */}
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate("/strategie")} className="gap-2">
                Générer ma stratégie <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {!analysisData?.summary && !isAnalyzing && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Aucune analyse disponible</h3>
              <p className="text-muted-foreground text-sm mt-1">Cliquez sur "Lancer l'analyse" pour analyser les facteurs de viralité</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
