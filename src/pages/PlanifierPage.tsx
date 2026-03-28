import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Send, Loader2, CalendarDays, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PlanifierPage() {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});
  const [showAllDrafts, setShowAllDrafts] = useState(false);
  const [showAllPublished, setShowAllPublished] = useState(false);

  const { data: posts, refetch } = useQuery({
    queryKey: ["planned-posts"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_posts")
        .select("*")
        .in("status", ["draft", "scheduled", "published"])
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const scheduledPosts = posts?.filter(p => p.status === "scheduled") || [];
  const draftPosts = posts?.filter(p => p.status === "draft") || [];
  const publishedPosts = posts?.filter(p => p.status === "published") || [];

  const handleSchedule = async (postId: string) => {
    const dateStr = scheduleInputs[postId];
    if (!dateStr) {
      toast.error("Sélectionnez une date et heure");
      return;
    }
    const { error } = await supabase.functions.invoke("schedule-posts", {
      body: { schedule: [{ post_id: postId, scheduled_at: new Date(dateStr).toISOString() }] },
    });
    if (error) {
      toast.error("Erreur de planification");
    } else {
      toast.success("Post planifié !");
      refetch();
    }
  };

  const handlePublishNow = async (postId: string) => {
    setPublishingId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("publish-scheduled-post", {
        body: { post_id: postId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.results?.[0];
      if (result?.success) {
        toast.success("Post publié sur LinkedIn !");
      } else {
        toast.error(result?.error || "Erreur de publication");
      }
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur de publication");
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnschedule = async (postId: string) => {
    const { error } = await supabase
      .from("suggested_posts")
      .update({ status: "draft", scheduled_at: null })
      .eq("id", postId);
    if (error) toast.error("Erreur");
    else {
      toast.success("Planification annulée");
      refetch();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planifier</h1>
          <p className="text-muted-foreground">Planifiez et publiez vos posts LinkedIn</p>
        </div>

        {/* Scheduled Timeline */}
        {scheduledPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Posts planifiés ({scheduledPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="flex gap-4 rounded-lg border p-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-yellow-500/10 p-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-yellow-600">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), "dd MMM", { locale: fr }) : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), "HH:mm") : ""}
                    </div>
                  </div>
                  {post.image_url && post.image_url.startsWith("http") && (
                    <img src={post.image_url} alt="Visuel" className="h-20 w-20 rounded-md object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handlePublishNow(post.id)} disabled={publishingId === post.id}>
                        {publishingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Publier maintenant
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleUnschedule(post.id)}>Annuler</Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Draft posts to schedule */}
        {draftPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brouillons à planifier ({draftPosts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {draftPosts.slice(0, showAllDrafts ? undefined : 10).map((post) => (
                <div key={post.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex gap-3">
                    {post.image_url && post.image_url.startsWith("http") && (
                      <img src={post.image_url} alt="Visuel" className="h-16 w-16 rounded-md object-cover shrink-0" />
                    )}
                    <p className="text-sm line-clamp-3">{post.content}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduleInputs[post.id] || ""}
                      onChange={(e) => setScheduleInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      className="w-auto"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleSchedule(post.id)}>
                      <Calendar className="h-3.5 w-3.5" /> Planifier
                    </Button>
                    <Button size="sm" onClick={() => handlePublishNow(post.id)} disabled={publishingId === post.id}>
                      {publishingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Publier
                    </Button>
                  </div>
                </div>
              ))}
              {draftPosts.length > 10 && !showAllDrafts && (
                <Button variant="ghost" className="w-full" onClick={() => setShowAllDrafts(true)}>
                  <ChevronDown className="h-4 w-4 mr-1" /> Voir les {draftPosts.length - 10} autres
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Published posts */}
        {publishedPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publiés ({publishedPosts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publishedPosts.slice(0, showAllPublished ? undefined : 10).map((post) => (
                <div key={post.id} className="flex items-start gap-3 rounded-lg border p-3 opacity-70">
                  <Badge className="bg-green-500/10 text-green-600 shrink-0">Publié</Badge>
                  {post.image_url && post.image_url.startsWith("http") && (
                    <img src={post.image_url} alt="Visuel" className="h-12 w-12 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.published_at ? format(new Date(post.published_at), "dd MMM yyyy 'à' HH:mm", { locale: fr }) : ""}
                    </p>
                  </div>
                </div>
              ))}
              {publishedPosts.length > 10 && !showAllPublished && (
                <Button variant="ghost" className="w-full" onClick={() => setShowAllPublished(true)}>
                  <ChevronDown className="h-4 w-4 mr-1" /> Voir les {publishedPosts.length - 10} autres
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {(!posts || posts.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Aucun post à planifier</h3>
              <p className="text-muted-foreground text-sm mt-1">Générez des posts dans l'onglet "Posts Suggérés" d'abord</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
