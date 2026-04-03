import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Loader2, Copy, Calendar, Check, Sparkles, ImageIcon, RefreshCw, ChevronDown, Images, Trash2, Send, CalendarCheck, Clock, ImagePlus } from "lucide-react";
import ChangeImageDialog from "@/components/posts/ChangeImageDialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type FilterType = "all" | "draft" | "scheduled" | "published";

export default function SuggestedPostsPage() {
  const { user } = useAuth();
  const [generatingVisualId, setGeneratingVisualId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isSchedulingAll, setIsSchedulingAll] = useState(false);
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});
  const [changingImagePostId, setChangingImagePostId] = useState<string | null>(null);

  const { data: posts, refetch } = useQuery({
    queryKey: ["suggested-posts", user?.id],
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_posts")
        .select("id,content,topic,status,virality_score,scheduled_at,published_at,image_url,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = posts?.filter((p) => {
    if (filter === "draft") return p.status === "draft";
    if (filter === "scheduled") return p.status === "scheduled";
    if (filter === "published") return p.status === "published";
    return true;
  });

  const draftCount = posts?.filter(p => p.status === "draft").length || 0;
  const scheduledCount = posts?.filter(p => p.status === "scheduled").length || 0;
  const publishedCount = posts?.filter(p => p.status === "published").length || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oldDraftCount = posts?.filter(p => p.status === "draft" && new Date(p.created_at) < today).length || 0;

  const handleDeleteOldPosts = async () => {
    if (!confirm("Supprimer tous les brouillons anciens (avant aujourd'hui) ?")) return;
    setDeleting(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("suggested_posts").delete().eq("status", "draft").lt("created_at", todayStr);
      if (error) throw error;
      toast.success("Anciens brouillons supprimés !");
      refetch();
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
      const { data, error } = await supabase.functions.invoke("generate-visual", { body: { post_id: postId } });
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
    if (postsWithoutVisual.length === 0) { toast.info("Tous les posts ont déjà un visuel"); return; }
    setBatchProgress({ done: 0, total: postsWithoutVisual.length });
    let done = 0;
    for (let i = 0; i < postsWithoutVisual.length; i += 3) {
      const batch = postsWithoutVisual.slice(i, i + 3);
      const results = await Promise.allSettled(batch.map(p => supabase.functions.invoke("generate-visual", { body: { post_id: p.id } })));
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
    const { error } = await supabase.from("suggested_posts").update({ content: editContent }).eq("id", id);
    if (error) toast.error("Erreur de sauvegarde");
    else { toast.success("Post modifié !"); setEditingId(null); refetch(); }
  };

  const handleSchedulePost = async (id: string) => {
    const dateStr = scheduleInputs[id];
    let scheduledAt: string;
    if (dateStr) {
      scheduledAt = new Date(dateStr).toISOString();
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduledAt = tomorrow.toISOString();
    }
    const { error } = await supabase.functions.invoke("schedule-posts", {
      body: { schedule: [{ post_id: id, scheduled_at: scheduledAt }] },
    });
    if (error) toast.error("Erreur de planification");
    else { toast.success("Post planifié !"); refetch(); }
  };

  const handleScheduleAll = async () => {
    const drafts = posts?.filter(p => p.status === "draft") || [];
    if (drafts.length === 0) return;
    setIsSchedulingAll(true);
    try {
      const hours = [9, 12, 17];
      let dayOffset = 1;
      let hourIdx = 0;
      const schedule = drafts.map((post) => {
        let scheduledAt = post.scheduled_at;
        if (!scheduledAt) {
          const d = new Date();
          d.setDate(d.getDate() + dayOffset);
          while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
          d.setHours(hours[hourIdx % hours.length], 0, 0, 0);
          scheduledAt = d.toISOString();
          hourIdx++;
          if (hourIdx % hours.length === 0) dayOffset++;
        }
        return { post_id: post.id, scheduled_at: scheduledAt };
      });
      const { error } = await supabase.functions.invoke("schedule-posts", { body: { schedule } });
      if (error) throw error;
      toast.success(`${schedule.length} posts planifiés !`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur de planification");
    } finally {
      setIsSchedulingAll(false);
    }
  };

  const handlePublishNow = async (postId: string) => {
    setPublishingId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("publish-scheduled-post", { body: { post_id: postId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.results?.[0];
      if (result?.success) toast.success("Post publié sur LinkedIn !");
      else toast.error(result?.error || "Erreur de publication");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur de publication");
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnschedule = async (postId: string) => {
    const { error } = await supabase.from("suggested_posts").update({ status: "draft", scheduled_at: null }).eq("id", postId);
    if (error) toast.error("Erreur");
    else { toast.success("Planification annulée"); refetch(); }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-yellow-500/10 text-yellow-600",
    published: "bg-green-500/10 text-green-600",
  };
  const statusLabels: Record<string, string> = {
    draft: "Brouillon", scheduled: "Planifié", published: "Publié",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Publications</h1>
          <p className="text-muted-foreground">Gérez, planifiez et publiez vos posts LinkedIn</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {draftCount > 0 && (
            <Button size="sm" onClick={handleScheduleAll} disabled={isSchedulingAll}>
              {isSchedulingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CalendarCheck className="h-3.5 w-3.5 mr-1" />}
              Tout planifier ({draftCount})
            </Button>
          )}
          {posts && posts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBatchVisuals} disabled={!!batchProgress}>
              {batchProgress ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {batchProgress.done}/{batchProgress.total}</>
              ) : (
                <><Images className="h-3.5 w-3.5" /> Visuels manquants</>
              )}
            </Button>
          )}
          {oldDraftCount > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteOldPosts} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Purger ({oldDraftCount})
            </Button>
          )}
        </div>
      </div>

      {posts && posts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setVisibleCount(10); }}>
            Tous ({posts.length})
          </Button>
          <Button variant={filter === "draft" ? "default" : "outline"} size="sm" onClick={() => { setFilter("draft"); setVisibleCount(10); }}>
            Brouillons ({draftCount})
          </Button>
          <Button variant={filter === "scheduled" ? "default" : "outline"} size="sm" onClick={() => { setFilter("scheduled"); setVisibleCount(10); }}>
            <Clock className="h-3.5 w-3.5 mr-1" /> Planifiés ({scheduledCount})
          </Button>
          <Button variant={filter === "published" ? "default" : "outline"} size="sm" onClick={() => { setFilter("published"); setVisibleCount(10); }}>
            <Check className="h-3.5 w-3.5 mr-1" /> Publiés ({publishedCount})
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
                </div>
                <div className="flex items-center gap-2">
                  {post.scheduled_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(post.scheduled_at), "EEE d MMM 'à' HH'h'", { locale: fr })}
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
                      {post.image_url ? "Regénérer" : "Visuel IA"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setChangingImagePostId(post.id)}>
                      <ImagePlus className="h-3.5 w-3.5" /> Changer
                    </Button>
                    {post.status === "draft" && (
                      <>
                        <Input
                          type="datetime-local"
                          value={scheduleInputs[post.id] || ""}
                          onChange={(e) => setScheduleInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="w-auto h-8 text-xs"
                        />
                        <Button size="sm" variant="outline" onClick={() => handleSchedulePost(post.id)}><Calendar className="h-3.5 w-3.5" /> Planifier</Button>
                      </>
                    )}
                    {post.status === "scheduled" && (
                      <>
                        <Button size="sm" onClick={() => handlePublishNow(post.id)} disabled={publishingId === post.id}>
                          {publishingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Publier
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleUnschedule(post.id)}>Annuler</Button>
                      </>
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

        {filteredPosts && filteredPosts.length > visibleCount && (
          <Button variant="ghost" className="w-full" onClick={() => setVisibleCount(v => v + 10)}>
            <ChevronDown className="h-4 w-4 mr-1" /> Voir plus ({filteredPosts.length - visibleCount} restants)
          </Button>
        )}

        {(!filteredPosts || filteredPosts.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <PenLine className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Aucune publication</h3>
              <p className="text-muted-foreground text-sm mt-1">Activez l'Autopilote pour générer des publications automatiquement</p>
            </CardContent>
          </Card>
        )}
      </div>
      <ChangeImageDialog postId={changingImagePostId} onClose={() => setChangingImagePostId(null)} onChanged={() => refetch()} />
    </div>
  );
}
