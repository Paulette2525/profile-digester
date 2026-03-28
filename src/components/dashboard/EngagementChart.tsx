import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

interface EngagementChartProps {
  posts: Tables<"linkedin_posts">[];
}

export function EngagementChart({ posts }: EngagementChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...posts]
      .filter((p) => p.posted_at)
      .sort((a, b) => new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime());

    // Group by week if >30 posts, otherwise by post
    if (sorted.length > 30) {
      const weeks = new Map<string, { likes: number; comments: number; shares: number; count: number }>();
      for (const p of sorted) {
        const d = new Date(p.posted_at!);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = format(weekStart, "yyyy-MM-dd");
        const existing = weeks.get(key) || { likes: 0, comments: 0, shares: 0, count: 0 };
        existing.likes += p.likes_count;
        existing.comments += p.comments_count;
        existing.shares += p.shares_count;
        existing.count += 1;
        weeks.set(key, existing);
      }
      return Array.from(weeks.entries()).map(([date, v]) => ({
        date,
        label: format(new Date(date), "dd MMM", { locale: fr }),
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        posts: v.count,
      }));
    }

    return sorted.map((p) => ({
      date: p.posted_at!,
      label: format(new Date(p.posted_at!), "dd MMM", { locale: fr }),
      likes: p.likes_count,
      comments: p.comments_count,
      shares: p.shares_count,
      posts: 1,
    }));
  }, [posts]);

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Évolution de l'engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="likes" stroke="hsl(var(--primary))" name="Likes" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="comments" stroke="hsl(var(--destructive))" name="Commentaires" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="shares" stroke="hsl(var(--accent-foreground))" name="Partages" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
