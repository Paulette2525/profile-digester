import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

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

const statusConfig: Record<string, { label: string; color: string }> = {
  published: { label: "Publié", color: "bg-green-500" },
  scheduled: { label: "Planifié", color: "bg-blue-500" },
  draft: { label: "Brouillon", color: "bg-muted-foreground" },
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const monthKey = format(currentMonth, "yyyy-MM");

  const { data: posts = [] } = useQuery({
    queryKey: ["calendar-posts", user?.id, monthKey],
    queryFn: async () => {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      const { data } = await supabase
        .from("suggested_posts")
        .select("id,content,topic,status,scheduled_at,published_at,created_at,image_url")
        .eq("user_id", user!.id)
        .or(`scheduled_at.gte.${start},published_at.gte.${start},created_at.gte.${start}`)
        .or(`scheduled_at.lte.${end},published_at.lte.${end},created_at.lte.${end}`);
      return (data || []) as Post[];
    },
    enabled: !!user,
    keepPreviousData: true,
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
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
    return map;
  }, [posts]);

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-6">
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

      <div className="flex gap-4 text-sm">
        {Object.entries(statusConfig).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${color}`} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map((d) => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-2 min-h-[100px]" />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={`bg-background p-2 min-h-[100px] border-t ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
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
                          <div className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent transition-colors">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.color}`} />
                            <span className="text-[10px] truncate">{post.topic || post.content.slice(0, 30)}</span>
                          </div>
                        </button>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 3} autres</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {selectedPost?.topic || "Publication"}
            </DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <Badge variant={selectedPost.status === "published" ? "default" : "secondary"}>
                {statusConfig[selectedPost.status]?.label || selectedPost.status}
              </Badge>
              {selectedPost.image_url && (
                <img src={selectedPost.image_url} alt="" className="w-full rounded-lg max-h-48 object-cover" />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {selectedPost.scheduled_at && (
                  <p>📅 Planifié : {format(new Date(selectedPost.scheduled_at), "PPPp", { locale: fr })}</p>
                )}
                {selectedPost.published_at && (
                  <p>✅ Publié : {format(new Date(selectedPost.published_at), "PPPp", { locale: fr })}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
