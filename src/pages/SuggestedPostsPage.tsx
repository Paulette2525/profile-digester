import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Loader2, Copy, Calendar, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SuggestedPostsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: analyses } = useQuery({
    queryKey: ["virality-analyses-done"],
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
        body: { analysis_id: latestAnalysisId, count: 5, topic: topic || undefined },
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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copié dans le presse-papier !");
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from("suggested_posts")
      .update({ content: editContent })
      .eq("id", id);
    if (error) {
      toast.error("Erreur de sauvegarde");
    } else {
      toast.success("Post modifié !");
      setEditingId(null);
      refetch();
    }
  };

  const handleSchedulePost = async (id: string) => {
    // Schedule for tomorrow at 9am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const { error } = await supabase.functions.invoke("schedule-posts", {
      body: { schedule: [{ post_id: id, scheduled_at: tomorrow.toISOString() }] },
    });
    if (error) {
      toast.error("Erreur de planification");
    } else {
      toast.success("Post planifié pour demain 9h !");
      refetch();
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-yellow-500/10 text-yellow-600",
    published: "bg-green-500/10 text-green-600",
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    scheduled: "Planifié",
    published: "Publié",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Posts Suggérés</h1>
            <p className="text-muted-foreground">Générez des publications virales basées sur l'analyse</p>
          </div>
        </div>

        {/* Generator */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-3 pt-6">
            <Input
              placeholder="Thème optionnel (ex: leadership, IA, productivité…)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGenerate} disabled={isGenerating || !latestAnalysisId}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "Génération…" : "Générer des posts"}
            </Button>
          </CardContent>
          {!latestAnalysisId && (
            <CardContent className="pt-0">
              <p className="text-sm text-destructive">⚠️ Aucune analyse disponible. Allez dans "Traitement" d'abord.</p>
            </CardContent>
          )}
        </Card>

        {/* Posts list */}
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[post.status] || ""}>
                      {statusLabels[post.status] || post.status}
                    </Badge>
                    {post.topic && <Badge variant="secondary">{post.topic}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-primary">{post.virality_score}/100</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === post.id ? (
                  <>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(post.id)}>
                        <Check className="h-3.5 w-3.5" /> Sauvegarder
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopy(post.content)}>
                        <Copy className="h-3.5 w-3.5" /> Copier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(post.id); setEditContent(post.content); }}>
                        <PenLine className="h-3.5 w-3.5" /> Modifier
                      </Button>
                      {post.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleSchedulePost(post.id)}>
                          <Calendar className="h-3.5 w-3.5" /> Planifier
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {(!posts || posts.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <PenLine className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold">Aucun post généré</h3>
                <p className="text-muted-foreground text-sm mt-1">Générez des publications basées sur votre analyse de viralité</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
