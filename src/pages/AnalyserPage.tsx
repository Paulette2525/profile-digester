import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Target, RefreshCw, Loader2, ThumbsUp, MessageCircle, Share2, Eye, ChevronDown, Users, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { toast } from "sonner";

export default function AnalyserPage() {
  const [isFetching, setIsFetching] = useState(false);
  const [visiblePosts, setVisiblePosts] = useState(10);

  // Account stats (followers, connections)
  const { data: accountStats, isLoading: accountLoading } = useQuery({
    queryKey: ["account-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-account-stats");
      if (error) return { followers: 0, connections: 0 };
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user memory for goals
  const { data: memory } = useQuery({
    queryKey: ["user-memory-goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_memory").select("*").limit(1).maybeSingle();
      if (error) return null;
      return data as any;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: publishedPosts, refetch } = useQuery({
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

  const handleFetchStats = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-post-stats");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const matched = data?.results?.filter((r: any) => r.matched)?.length || 0;
      toast.success(`Stats récupérées ! ${matched} post(s) mis à jour`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la récupération des stats");
    } finally {
      setIsFetching(false);
    }
  };

  const postsWithPerf = publishedPosts?.filter(p => p.post_performance) || [];
  const totalPublished = publishedPosts?.length || 0;
  const avgScore = totalPublished > 0
    ? Math.round((publishedPosts?.reduce((acc, p) => acc + (p.virality_score || 0), 0) || 0) / totalPublished)
    : 0;

  const totalLikes = postsWithPerf.reduce((acc, p) => acc + ((p.post_performance as any)?.likes || 0), 0);
  const totalComments = postsWithPerf.reduce((acc, p) => acc + ((p.post_performance as any)?.comments || 0), 0);
  const totalShares = postsWithPerf.reduce((acc, p) => acc + ((p.post_performance as any)?.shares || 0), 0);
  const totalImpressions = postsWithPerf.reduce((acc, p) => acc + ((p.post_performance as any)?.impressions || 0), 0);

  // Performance evolution data (chronological)
  const evolutionData = postsWithPerf
    .slice()
    .sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime())
    .map(p => {
      const perf = p.post_performance as any;
      return {
        date: p.published_at ? format(new Date(p.published_at), "dd/MM", { locale: fr }) : "",
        likes: perf?.likes || 0,
        commentaires: perf?.comments || 0,
        impressions: perf?.impressions || 0,
      };
    });

  const comparisonData = postsWithPerf.map((p, i) => {
    const perf = p.post_performance as any;
    return { name: `Post ${i + 1}`, prédit: p.virality_score || 0, réel: perf?.actual_score || 0 };
  });

  const engagementData = postsWithPerf.map((p, i) => {
    const perf = p.post_performance as any;
    return { name: `Post ${i + 1}`, likes: perf?.likes || 0, commentaires: perf?.comments || 0, partages: perf?.shares || 0 };
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analyser</h1>
            <p className="text-muted-foreground">Suivez la performance de votre compte et vos publications</p>
          </div>
          <Button onClick={handleFetchStats} disabled={isFetching || totalPublished === 0}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isFetching ? "Récupération…" : "Récupérer les stats"}
          </Button>
        </div>

        {/* Account stats + main stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-primary/10 p-2.5">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{accountLoading ? "…" : (accountStats?.followers || 0)}</p>
                <p className="text-xs text-muted-foreground">Abonnés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-primary/10 p-2.5">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{accountLoading ? "…" : (accountStats?.connections || 0)}</p>
                <p className="text-xs text-muted-foreground">Connexions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-primary/10 p-2.5"><TrendingUp className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xl font-bold">{totalPublished}</p><p className="text-xs text-muted-foreground">Publiés</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-primary/10 p-2.5"><Target className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xl font-bold">{avgScore}/100</p><p className="text-xs text-muted-foreground">Score moyen</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-blue-500/10 p-2.5"><ThumbsUp className="h-4 w-4 text-blue-500" /></div>
              <div><p className="text-xl font-bold">{totalLikes}</p><p className="text-xs text-muted-foreground">Likes</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-green-500/10 p-2.5"><MessageCircle className="h-4 w-4 text-green-500" /></div>
              <div><p className="text-xl font-bold">{totalComments}</p><p className="text-xs text-muted-foreground">Commentaires</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-orange-500/10 p-2.5"><Share2 className="h-4 w-4 text-orange-500" /></div>
              <div><p className="text-xl font-bold">{totalShares}</p><p className="text-xs text-muted-foreground">Partages</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-full bg-purple-500/10 p-2.5"><Eye className="h-4 w-4 text-purple-500" /></div>
              <div><p className="text-xl font-bold">{totalImpressions}</p><p className="text-xs text-muted-foreground">Impressions</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Performance evolution */}
        {evolutionData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Évolution de la performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="likes" stroke="#3b82f6" name="Likes" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="commentaires" stroke="#22c55e" name="Commentaires" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="impressions" stroke="#a855f7" name="Impressions" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Comparison chart */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Score prédit vs réel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
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

        {/* Engagement chart */}
        {engagementData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Engagement par publication</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="likes" fill="#3b82f6" name="Likes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commentaires" fill="#22c55e" name="Commentaires" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="partages" fill="#f97316" name="Partages" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Posts list */}
        <Card>
          <CardHeader><CardTitle className="text-base">Publications ({totalPublished})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {publishedPosts?.slice(0, visiblePosts).map((post) => {
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
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {perf.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {perf.comments || 0}</span>
                        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {perf.shares || 0}</span>
                        {perf.impressions > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {perf.impressions}</span>}
                        <span>Score réel : <strong className="text-destructive">{perf.actual_score}/100</strong></span>
                      </>
                    )}
                    {!perf && <span className="italic">Cliquez "Récupérer les stats" pour mesurer la performance</span>}
                  </div>
                </div>
              );
            })}
            {totalPublished > visiblePosts && (
              <Button variant="ghost" className="w-full" onClick={() => setVisiblePosts(v => v + 10)}>
                <ChevronDown className="h-4 w-4 mr-1" /> Voir plus ({totalPublished - visiblePosts} restants)
              </Button>
            )}
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
