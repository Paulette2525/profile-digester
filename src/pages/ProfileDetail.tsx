import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, ExternalLink, ThumbsUp, MessageCircle, Download, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type SortKey = "posted_at" | "likes_count" | "comments_count" | "shares_count" | "impressions_count" | "engagement";
type SortDir = "asc" | "desc";

const ProfileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sortKey, setSortKey] = useState<SortKey>("posted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<string>("all");
  const perPage = 20;

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracked_profiles")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["profile_posts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("linkedin_posts")
        .select("*")
        .eq("profile_id", id!)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const fetchPostsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-profile-posts", {
        body: { profile_id: id, max_pages: 5 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile_posts", id] });
      toast.success(`${data.total_posts} publications extraites`);
    },
    onError: () => toast.error("Erreur lors de l'extraction"),
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const handleAnalyzeProfile = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-profile-virality", {
        body: { profile_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Analyse du profil terminée !");
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
    } catch (e: any) {
      toast.error(e.message || "Erreur d'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tracked_profiles").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked_profiles"] });
      toast.success("Profil supprimé");
      navigate("/");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const filteredPosts = useMemo(() => {
    let filtered = mediaFilter === "all" ? posts : posts.filter(p => p.media_type === mediaFilter);
    
    filtered.sort((a, b) => {
      let valA: number, valB: number;
      if (sortKey === "engagement") {
        valA = a.likes_count + a.comments_count * 3 + a.shares_count * 5;
        valB = b.likes_count + b.comments_count * 3 + b.shares_count * 5;
      } else if (sortKey === "posted_at") {
        valA = new Date(a.posted_at || 0).getTime();
        valB = new Date(b.posted_at || 0).getTime();
      } else {
        valA = (a as any)[sortKey] || 0;
        valB = (b as any)[sortKey] || 0;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return filtered;
  }, [posts, sortKey, sortDir, mediaFilter]);

  const totalPages = Math.ceil(filteredPosts.length / perPage);
  const paginatedPosts = filteredPosts.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      </AppLayout>
    );
  }

  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const totalLikes = posts.reduce((s, p) => s + p.likes_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);
  const totalShares = posts.reduce((s, p) => s + p.shares_count, 0);
  const analysisSummary = (profile as any).analysis_summary;
  const mediaTypes = [...new Set(posts.map(p => p.media_type).filter(Boolean))];

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : "text-muted-foreground/50"}`} />
      </span>
    </TableHead>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>

        {/* Profile Header */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{profile.name}</h1>
              {profile.headline && <p className="text-muted-foreground text-sm">{profile.headline}</p>}
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {totalLikes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {totalComments}</span>
                <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {totalShares}</span>
                <span>{posts.length} posts</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchPostsMutation.mutate()} disabled={fetchPostsMutation.isPending}>
                {fetchPostsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Extraire
              </Button>
              <Button variant="outline" size="sm" onClick={handleAnalyzeProfile} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyser
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> LinkedIn
                </a>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Posts Table */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Publications ({filteredPosts.length})</h2>
              <Select value={mediaFilter} onValueChange={(v) => { setMediaFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type média" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {mediaTypes.map(t => (
                    <SelectItem key={t} value={t!}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paginatedPosts.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortHeader label="Date" field="posted_at" />
                        <TableHead className="min-w-[200px]">Contenu</TableHead>
                        <SortHeader label="👍" field="likes_count" />
                        <SortHeader label="💬" field="comments_count" />
                        <SortHeader label="🔁" field="shares_count" />
                        <SortHeader label="👁" field="impressions_count" />
                        <SortHeader label="Score" field="engagement" />
                        <TableHead>Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPosts.map((post) => {
                        const engagement = post.likes_count + post.comments_count * 3 + post.shares_count * 5;
                        return (
                          <TableRow key={post.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {post.posted_at ? format(new Date(post.posted_at), "dd MMM yy", { locale: fr }) : "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[250px] truncate" title={post.content || ""}>
                              {post.post_url ? (
                                <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                  {(post.content || "").substring(0, 60)}…
                                </a>
                              ) : (
                                (post.content || "").substring(0, 60) + (post.content && post.content.length > 60 ? "…" : "")
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-center">{post.likes_count}</TableCell>
                            <TableCell className="text-xs text-center">{post.comments_count}</TableCell>
                            <TableCell className="text-xs text-center">{post.shares_count}</TableCell>
                            <TableCell className="text-xs text-center">{post.impressions_count || 0}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-xs">{engagement}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{post.media_type || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Page {page + 1} / {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune publication
                </CardContent>
              </Card>
            )}
          </div>

          {/* Analysis Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Analyse
            </h2>
            {analysisSummary && Object.keys(analysisSummary).length > 0 ? (
              <>
                {analysisSummary.summary && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Résumé</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs leading-relaxed">{analysisSummary.summary}</p>
                    </CardContent>
                  </Card>
                )}
                {analysisSummary.top_hooks?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">🎣 Accroches efficaces</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {analysisSummary.top_hooks.map((h: string, i: number) => (
                        <p key={i} className="text-xs italic text-muted-foreground bg-muted rounded p-2">"{h}"</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {analysisSummary.content_types?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Types de contenu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {analysisSummary.content_types.map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {analysisSummary.keywords?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Mots-clés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {analysisSummary.keywords.map((k: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Cliquez "Analyser" pour identifier les patterns de viralité</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfileDetail;
