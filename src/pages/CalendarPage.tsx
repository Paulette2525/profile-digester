import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, Eye, Send, XCircle, Clock, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  topic: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  image_url: string | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; barBg: string; barBorder: string; badgeBg: string; badgeText: string }> = {
  published: {
    label: "Publié",
    icon: CheckCircle2,
    barBg: "bg-green-50 dark:bg-green-950/30",
    barBorder: "border-l-4 border-green-500",
    badgeBg: "bg-green-100 dark:bg-green-900/50",
    badgeText: "text-green-700 dark:text-green-300",
  },
  scheduled: {
    label: "Planifié",
    icon: Clock,
    barBg: "bg-blue-50 dark:bg-blue-950/30",
    barBorder: "border-l-4 border-blue-500",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  draft: {
    label: "Brouillon",
    icon: FileText,
    barBg: "bg-muted/50",
    barBorder: "border-l-4 border-muted-foreground/40",
    badgeBg: "bg-muted",
    badgeText: "text-muted-foreground",
  },
};

export default function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["calendar-posts", user?.id, monthKey],
    queryFn: async () => {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      // Single correct OR: any date field falls within the month
      const { data } = await supabase
        .from("suggested_posts")
        .select("id,content,topic,status,scheduled_at,published_at,created_at,image_url")
        .eq("user_id", user!.id)
        .or(
          `and(scheduled_at.gte.${start},scheduled_at.lte.${end}),and(published_at.gte.${start},published_at.lte.${end}),and(created_at.gte.${start},created_at.lte.${end})`
        );
      return (data || []) as Post[];
    },
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const days = useMemo(() => {
    const s = startOfMonth(currentMonth);
    const e = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: s, end: e });
  }, [currentMonth]);

  const firstDayOffset = (getDay(days[0]) + 6) % 7;

  const getPostDate = (post: Post): Date | null => {
    if (post.published_at) return new Date(post.published_at);
    if (post.scheduled_at) return new Date(post.scheduled_at);
    return new Date(post.created_at);
  };

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((post) => {
      const date = getPostDate(post);
      if (date) {
        const key = format(date, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(post);
      }
    });
    // Sort posts within each day by time
    map.forEach((dayPosts) => {
      dayPosts.sort((a, b) => {
        const da = getPostDate(a)!.getTime();
        const db = getPostDate(b)!.getTime();
        return da - db;
      });
    });
    return map;
  }, [posts]);

  const handlePublishNow = async (post: Post) => {
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-scheduled-post", {
        body: { post_id: post.id },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.success) {
        toast.success("Publication envoyée sur LinkedIn !");
        setSelectedPost(null);
        queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
      } else {
        toast.error(result?.error || "Échec de la publication");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelSchedule = async (post: Post) => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("suggested_posts")
        .update({ status: "draft", scheduled_at: null })
        .eq("id", post.id);
      if (error) throw error;
      toast.success("Planification annulée");
      setSelectedPost(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Stats for the month
  const stats = useMemo(() => {
    let published = 0, scheduled = 0, draft = 0;
    posts.forEach((p) => {
      if (p.status === "published") published++;
      else if (p.status === "scheduled") scheduled++;
      else draft++;
    });
    return { published, scheduled, draft, total: posts.length };
  }, [posts]);

  const getPostTime = (post: Post): string => {
    const date = getPostDate(post);
    return date ? format(date, "HH:mm") : "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Calendrier éditorial
          </h1>
          <p className="text-muted-foreground text-sm">Vue globale de vos publications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[180px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats + Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = key === "published" ? stats.published : key === "scheduled" ? stats.scheduled : stats.draft;
          const Icon = cfg.icon;
          return (
            <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.badgeBg}`}>
              <Icon className={`h-4 w-4 ${cfg.badgeText}`} />
              <span className={`text-sm font-medium ${cfg.badgeText}`}>{cfg.label}</span>
              <span className={`text-sm font-bold ${cfg.badgeText}`}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map((d) => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-2 min-h-[120px]" />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={`bg-background p-2 min-h-[120px] border-t transition-colors ${isToday ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayPosts.slice(0, 3).map((post) => {
                      const cfg = statusConfig[post.status] || statusConfig.draft;
                      return (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="w-full text-left"
                        >
                          <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${cfg.barBg} ${cfg.barBorder} hover:opacity-80 transition-opacity`}>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {getPostTime(post)}
                            </span>
                            <span className="text-[11px] font-medium truncate">
                              {post.topic || post.content.slice(0, 25)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <button
                        onClick={() => dayPosts[3] && setSelectedPost(dayPosts[3])}
                        className="text-[10px] text-primary font-medium pl-2 hover:underline"
                      >
                        +{dayPosts.length - 3} autres
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {selectedPost?.topic || "Publication"}
            </DialogTitle>
            <DialogDescription>Détails de la publication</DialogDescription>
          </DialogHeader>
          {selectedPost && (() => {
            const cfg = statusConfig[selectedPost.status] || statusConfig.draft;
            const Icon = cfg.icon;
            const dayKey = format(getPostDate(selectedPost)!, "yyyy-MM-dd");
            const dayPosts = postsByDay.get(dayKey) || [];
            const currentIdx = dayPosts.findIndex((p) => p.id === selectedPost.id);

            return (
              <div className="space-y-4">
                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${cfg.badgeBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.badgeText}`} />
                  <span className={`text-sm font-semibold ${cfg.badgeText}`}>{cfg.label}</span>
                </div>

                {/* Image */}
                {selectedPost.image_url && (
                  <img src={selectedPost.image_url} alt="" className="w-full rounded-lg max-h-56 object-cover" />
                )}

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedPost.content}
                </p>

                {/* Dates */}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                  {selectedPost.scheduled_at && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Planifié : {format(new Date(selectedPost.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  )}
                  {selectedPost.published_at && (
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Publié : {format(new Date(selectedPost.published_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  )}
                </div>

                {/* Actions for scheduled posts */}
                {(selectedPost.status === "scheduled" || selectedPost.status === "draft") && (
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      onClick={() => handlePublishNow(selectedPost)}
                      disabled={publishing}
                      className="flex-1"
                    >
                      {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                      Publier maintenant
                    </Button>
                    {selectedPost.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelSchedule(selectedPost)}
                        disabled={cancelling}
                      >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                        Annuler
                      </Button>
                    )}
                  </div>
                )}

                {/* Day navigation */}
                {dayPosts.length > 1 && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentIdx <= 0}
                      onClick={() => setSelectedPost(dayPosts[currentIdx - 1])}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentIdx + 1} / {dayPosts.length} ce jour
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={currentIdx >= dayPosts.length - 1}
                      onClick={() => setSelectedPost(dayPosts[currentIdx + 1])}
                    >
                      Suivant <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
