import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, ThumbsUp, MessageSquare, BarChart3 } from "lucide-react";
import { format, subWeeks, startOfWeek, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface ProspectionStatsProps {
  campaigns: any[];
  messages: any[];
}

export function ProspectionStats({ campaigns, messages }: ProspectionStatsProps) {
  const stats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
    const totalReplies = campaigns.reduce((s, c) => s + (c.reply_count || 0), 0);
    const totalAccepted = campaigns.reduce((s, c) => s + (c.accepted_count || 0), 0);
    const totalProspects = campaigns.reduce((s, c) => s + (c.total_prospects || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;
    const acceptanceRate = totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0;
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;
    const warmupCampaigns = campaigns.filter(c => c.warmup_enabled).length;

    return { totalSent, totalReplies, totalAccepted, totalProspects, activeCampaigns, acceptanceRate, replyRate, warmupCampaigns };
  }, [campaigns]);

  // Weekly chart data
  const chartData = useMemo(() => {
    const weeks: Record<string, { sent: number; replied: number; accepted: number }> = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM");
      weeks[key] = { sent: 0, replied: 0, accepted: 0 };
    }

    messages.forEach((msg: any) => {
      const date = new Date(msg.created_at);
      if (!isAfter(date, subWeeks(now, 8))) return;
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM");
      if (weeks[key]) {
        if (msg.status === "sent" || msg.status === "replied") weeks[key].sent++;
        if (msg.status === "replied") weeks[key].replied++;
      }
    });

    return Object.entries(weeks).map(([week, data]) => ({ week, ...data }));
  }, [messages]);

  // Improvement suggestions
  const suggestions = useMemo(() => {
    const items: { icon: typeof Lightbulb; text: string; type: "warning" | "tip" | "success" }[] = [];

    if (stats.totalSent === 0) {
      items.push({ icon: Target, text: "Lancez votre première campagne pour commencer à prospecter.", type: "tip" });
      return items;
    }

    if (stats.acceptanceRate >= 30) {
      items.push({ icon: ThumbsUp, text: `Excellent taux d'acceptation (${stats.acceptanceRate}%) ! Votre approche fonctionne bien.`, type: "success" });
    } else if (stats.acceptanceRate < 20 && stats.warmupCampaigns === 0) {
      items.push({ icon: AlertTriangle, text: `Taux d'acceptation faible (${stats.acceptanceRate}%). Activez le warm-up pour augmenter de 30-40%.`, type: "warning" });
    } else if (stats.acceptanceRate < 20) {
      items.push({ icon: AlertTriangle, text: `Taux d'acceptation à ${stats.acceptanceRate}%. Essayez de personnaliser davantage vos messages.`, type: "warning" });
    }

    if (stats.replyRate < 10 && stats.totalSent > 10) {
      items.push({ icon: MessageSquare, text: `Taux de réponse bas (${stats.replyRate}%). Activez la personnalisation IA pour varier les messages.`, type: "warning" });
    } else if (stats.replyRate >= 15) {
      items.push({ icon: ThumbsUp, text: `Bon taux de réponse (${stats.replyRate}%) ! Continuez avec cette stratégie.`, type: "success" });
    }

    if (stats.activeCampaigns === 0 && campaigns.length > 0) {
      items.push({ icon: Lightbulb, text: "Aucune campagne active. Relancez une campagne ou activez l'autopilote.", type: "tip" });
    }

    if (campaigns.length > 3) {
      const modes = campaigns.map(c => c.name?.toLowerCase() || "");
      const hasCommenters = modes.some(m => m.includes("commentaire") || m.includes("comment"));
      if (!hasCommenters) {
        items.push({ icon: Lightbulb, text: "Diversifiez : essayez l'extraction de commentaires pour cibler des prospects déjà engagés.", type: "tip" });
      }
    }

    return items;
  }, [stats, campaigns]);

  const chartConfig = {
    sent: { label: "Envoyés", color: "hsl(var(--primary))" },
    replied: { label: "Réponses", color: "hsl(142 76% 36%)" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Statistiques & Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Analyse de vos campagnes de prospection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Grid */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Taux d'acceptation", value: `${stats.acceptanceRate}%`, trend: stats.acceptanceRate >= 20 },
            { label: "Taux de réponse", value: `${stats.replyRate}%`, trend: stats.replyRate >= 10 },
            { label: "Total contactés", value: stats.totalSent },
            { label: "Campagnes actives", value: stats.activeCampaigns },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold">{kpi.value}</p>
                {kpi.trend !== undefined && (
                  kpi.trend
                    ? <TrendingUp className="h-4 w-4 text-green-500" />
                    : <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {messages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Évolution hebdomadaire</p>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="sent" stroke="var(--color-sent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="replied" stroke="var(--color-replied)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Notes clés & axes d'amélioration</p>
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                  s.type === "warning" ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" :
                  s.type === "success" ? "border-green-300 bg-green-50 dark:bg-green-950/20" :
                  "border-blue-300 bg-blue-50 dark:bg-blue-950/20"
                }`}
              >
                <s.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                  s.type === "warning" ? "text-orange-600" :
                  s.type === "success" ? "text-green-600" : "text-blue-600"
                }`} />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
