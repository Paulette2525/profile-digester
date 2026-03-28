import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyserPage() {
  const { data: publishedPosts } = useQuery({
    queryKey: ["published-posts-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const postsWithPerf = publishedPosts?.filter(p => p.post_performance) || [];
  const postsWithoutPerf = publishedPosts?.filter(p => !p.post_performance) || [];

  const chartData = postsWithPerf.map((p, i) => {
    const perf = p.post_performance as any;
    return {
      name: `Post ${i + 1}`,
      prédit: p.virality_score || 0,
      réel: perf?.actual_score || 0,
      likes: perf?.likes || 0,
      comments: perf?.comments || 0,
    };
  });

  const totalPublished = publishedPosts?.length || 0;
  const avgScore = totalPublished > 0
    ? Math.round((publishedPosts?.reduce((acc, p) => acc + (p.virality_score || 0), 0) || 0) / totalPublished)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analyser</h1>
          <p className="text-muted-foreground">Suivez la performance de vos publications LinkedIn</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPublished}</p>
                <p className="text-sm text-muted-foreground">Posts publiés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}/100</p>
                <p className="text-sm text-muted-foreground">Score moyen prédit</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-full bg-primary/10 p-3">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{postsWithPerf.length}</p>
                <p className="text-sm text-muted-foreground">Avec données de perf</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score prédit vs réel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="prédit" fill="hsl(var(--primary))" name="Prédit" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="réel" fill="hsl(var(--destructive))" name="Réel" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Posts list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publications ({totalPublished})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {publishedPosts?.map((post) => {
              const perf = post.post_performance as any;
              return (
                <div key={post.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-500/10 text-green-600">Publié</Badge>
                    <span className="text-xs text-muted-foreground">
                      {post.published_at ? format(new Date(post.published_at), "dd MMM yyyy HH:mm", { locale: fr }) : ""}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Score prédit : <strong className="text-primary">{post.virality_score}/100</strong></span>
                    {perf && (
                      <>
                        <span>👍 {perf.likes || 0}</span>
                        <span>💬 {perf.comments || 0}</span>
                        <span>🔄 {perf.shares || 0}</span>
                      </>
                    )}
                    {!perf && <span className="italic">Performance non encore mesurée</span>}
                  </div>
                </div>
              );
            })}
            {totalPublished === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold">Aucun post publié</h3>
                <p className="text-muted-foreground text-sm mt-1">Publiez des posts depuis l'onglet "Planifier"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
