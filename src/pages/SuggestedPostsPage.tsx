import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PenLine, Loader2, Copy, Calendar, Check, Sparkles, ImageIcon, RefreshCw, ChevronDown, ArrowRight, Images, Trash2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type FilterType = "all" | "autopilot" | "manual";

export default function SuggestedPostsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingVisualId, setGeneratingVisualId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [topic, setTopic] = useState("");
  const [postCount, setPostCount] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleting, setDeleting] = useState(false);

  const { data: analyses } = useQuery({
    queryKey: ["virality-analyses-done"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase
        .from("virality_analyses")
        .select("id, created_at")
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1);
      return data;
    },
  });

  const { data: posts, refetch } = useQuery({
    queryKey: ["suggested-posts"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Determine which posts came from autopilot (have scheduled_at set at creation and topic contains trend keywords)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isAutopilotPost = (post: any) => {
    const createdAt = new Date(post.created_at);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    // Posts created today with scheduled_at already set are likely from autopilot
    return createdAt >= todayStart && post.scheduled_at;
  };

  const filteredPosts = posts?.filter((p) => {
    if (filter === "autopilot") return isAutopilotPost(p);
    if (filter === "manual") return !isAutopilotPost(p);
    return true;
  });

  const latestAnalysisId = analyses?.[0]?.id;

  const handleGenerate = async () => {
    if (!latestAnalysisId) {
      toast.error("Lancez d'abord une analyse dans l'onglet Traitement");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-posts", {
        body: { analysis_id: latestAnalysisId, count: postCount, topic: topic || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.posts?.length || 0} posts générés !`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteOldPosts = async () => {
    if (!confirm("Supprimer tous les brouillons anciens (avant aujourd'hui) ? Les posts planifiés et publiés seront conservés.")) return;
    setDeleting(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("suggested_posts")
        .delete()
        .eq("status", "draft")
        .lt("created_at", todayStr);
      if (error) throw error;
      toast.success("Anciens brouillons supprimés !");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["planifier-posts"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from("suggested_posts").delete().eq("id", id);
    if (error) toast.error("Erreur de suppression");
    else { toast.success("Post supprimé"); refetch(); }
  };

  const handleGenerateVisual = async (postId: string) => {
    setGeneratingVisualId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-visual", {
        body: { post_id: postId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Visuel généré !");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération du visuel");
    } finally {
      setGeneratingVisualId(null);
    }
  };

  const handleBatchVisuals = async () => {
    const postsWithoutVisual = posts?.filter(p => !p.image_url) || [];
    if (postsWithoutVisual.length === 0) {
      toast.info("Tous les posts ont déjà un visuel");
      return;
    }
    setBatchProgress({ done: 0, total: postsWithoutVisual.length });
    const batchSize = 3;
    let done = 0;
    for (let i = 0; i < postsWithoutVisual.length; i += batchSize) {
      const batch = postsWithoutVisual.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(p => supabase.functions.invoke("generate-visual", { body: { post_id: p.id } }))
      );
      done += results.length;
      setBatchProgress({ done, total: postsWithoutVisual.length });
    }
    setBatchProgress(null);
    refetch();
    toast.success(`Visuels générés pour ${done} posts !`);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copié !");
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from("suggested_posts")
      .update({ content: editContent })
      .eq("id", id);
    if (error) toast.error("Erreur de sauvegarde");
    else { toast.success("Post modifié !"); setEditingId(null); refetch(); }
  };

  const handleSchedulePost = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const { error } = await supabase.functions.invoke("schedule-posts", {
      body: { schedule: [{ post_id: id, scheduled_at: tomorrow.toISOString() }] },
    });
    if (error) toast.error("Erreur de planification");
    else { toast.success("Post planifié pour demain 9h !"); refetch(); }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-yellow-500/10 text-yellow-600",
    published: "bg-green-500/10 text-green-600",
  };
  const statusLabels: Record<string, string> = {
    draft: "Brouillon", scheduled: "Planifié", published: "Publié",
  };

  const oldDraftCount = posts?.filter(p => p.status === "draft" && new Date(p.created_at) < today).length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Posts Suggérés</h1>
            <p className="text-muted-foreground">Générez des publications virales avec visuels IA</p>
          </div>
          {oldDraftCount > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteOldPosts} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer {oldDraftCount} ancien{oldDraftCount > 1 ? "s" : ""} brouillon{oldDraftCount > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Thème optionnel…" value={topic} onChange={(e) => setTopic(e.target.value)} className="flex-1" />
              <div className="flex items-center gap-2 min-w-[180px]">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Nombre :</label>
                <Input type="number" min={1} max={20} value={postCount} onChange={(e) => setPostCount(Math.max(1, Math.min(20, Number(e.target.value))))} className="w-20" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating || !latestAnalysisId}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? "Génération…" : `Générer ${postCount} post${postCount > 1 ? "s" : ""}`}
              </Button>
              {posts && posts.length > 0 && (
                <Button variant="outline" onClick={handleBatchVisuals} disabled={!!batchProgress}>
                  {batchProgress ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {batchProgress.done}/{batchProgress.total}</>
                  ) : (
                    <><Images className="h-4 w-4" /> Générer tous les visuels</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
          {!latestAnalysisId && (
            <CardContent className="pt-0">
              <p className="text-sm text-destructive">⚠️ Aucune analyse disponible. Allez dans "Traitement" d'abord.</p>
            </CardContent>
          )}
        </Card>

        {/* Filter tabs */}
        {posts && posts.length > 0 && (
          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setVisibleCount(10); }}>
              Tous ({posts.length})
            </Button>
            <Button variant={filter === "autopilot" ? "default" : "outline"} size="sm" onClick={() => { setFilter("autopilot"); setVisibleCount(10); }}>
              <Rocket className="h-3.5 w-3.5 mr-1" /> Autopilote ({posts.filter(isAutopilotPost).length})
            </Button>
            <Button variant={filter === "manual" ? "default" : "outline"} size="sm" onClick={() => { setFilter("manual"); setVisibleCount(10); }}>
              Manuels ({posts.filter(p => !isAutopilotPost(p)).length})
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {filteredPosts?.slice(0, visibleCount).map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[post.status] || ""}>{statusLabels[post.status] || post.status}</Badge>
                    {post.topic && <Badge variant="secondary">{post.topic}</Badge>}
                    {isAutopilotPost(post) && (
                      <Badge variant="default" className="bg-primary/10 text-primary text-xs gap-1">
                        <Rocket className="h-3 w-3" /> Autopilote
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {post.scheduled_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.scheduled_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à {new Date(post.scheduled_at).getHours()}h
                      </span>
                    )}
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-primary">{post.virality_score}/100</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {post.image_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img src={post.image_url} alt="Visuel" className="w-full max-h-[400px] object-cover" loading="lazy" />
                  </div>
                )}
                {editingId === post.id ? (
                  <>
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[200px]" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(post.id)}><Check className="h-3.5 w-3.5" /> Sauvegarder</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopy(post.content)}><Copy className="h-3.5 w-3.5" /> Copier</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(post.id); setEditContent(post.content); }}><PenLine className="h-3.5 w-3.5" /> Modifier</Button>
                      <Button size="sm" variant="outline" onClick={() => handleGenerateVisual(post.id)} disabled={generatingVisualId === post.id}>
                        {generatingVisualId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : post.image_url ? <RefreshCw className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        {post.image_url ? "Regénérer visuel" : "Générer visuel"}
                      </Button>
                      {post.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleSchedulePost(post.id)}><Calendar className="h-3.5 w-3.5" /> Planifier</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredPosts && filteredPosts.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button onClick={() => navigate("/planifier")} className="gap-2">Planifier les posts <ArrowRight className="h-4 w-4" /></Button>
            </div>
          )}

          {filteredPosts && filteredPosts.length > visibleCount && (
            <Button variant="ghost" className="w-full" onClick={() => setVisibleCount(v => v + 10)}>
              <ChevronDown className="h-4 w-4 mr-1" /> Voir plus ({filteredPosts.length - visibleCount} restants)
            </Button>
          )}

          {(!filteredPosts || filteredPosts.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <PenLine className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold">Aucun post {filter !== "all" ? `(filtre: ${filter === "autopilot" ? "autopilote" : "manuels"})` : "généré"}</h3>
                <p className="text-muted-foreground text-sm mt-1">Générez des publications basées sur votre analyse de viralité</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
