import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PostCard } from "@/components/dashboard/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, ExternalLink, ThumbsUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const ProfileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        .select("*, tracked_profiles(*)")
        .eq("profile_id", id!)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["profile_interactions", id],
    queryFn: async () => {
      const postIds = posts.map((p) => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from("post_interactions")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: posts.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tracked_profiles")
        .delete()
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked_profiles"] });
      toast.success("Profil supprimé");
      navigate("/");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      </AppLayout>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const totalLikes = posts.reduce((s, p) => s + p.likes_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>

        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{profile.name}</h1>
              {profile.headline && (
                <p className="text-muted-foreground">{profile.headline}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {totalLikes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {totalComments}</span>
                <span>{posts.length} posts</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> LinkedIn
                </a>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-semibold">Publications</h2>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">Aucune publication</p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Interactions récentes</h2>
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune interaction</p>
            ) : (
              interactions.map((interaction) => (
                <Card key={interaction.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        interaction.interaction_type === "like"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-accent-foreground"
                      }`}>
                        {interaction.interaction_type === "like" ? "👍 Like" : "💬 Commentaire"}
                      </span>
                      <span className="text-xs text-muted-foreground">{interaction.author_name}</span>
                    </div>
                    {interaction.comment_text && (
                      <p className="text-sm text-muted-foreground">{interaction.comment_text}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfileDetail;
