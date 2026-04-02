import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { PostCard } from "@/components/dashboard/PostCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);

  const { data: profiles = [], refetch: refetchProfiles } = useQuery({
    queryKey: ["tracked_profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracked_profiles")
        .select("id,name,avatar_url,headline,linkedin_url,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["linkedin_posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("linkedin_posts")
        .select("id,content,likes_count,comments_count,shares_count,posted_at,profile_id,post_url,media_type,tracked_profiles(name,avatar_url)")
        .eq("user_id", user!.id)
        .order("posted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const postsByProfile = posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.profile_id] = (acc[post.profile_id] || 0) + 1;
    return acc;
  }, {});

  const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-linkedin");
      if (error) throw error;
      await Promise.all([refetchProfiles(), refetchPosts()]);
      queryClient.invalidateQueries({ queryKey: ["account-stats"] });
      queryClient.invalidateQueries({ queryKey: ["content-strategy"] });
      toast.success("Synchronisation terminée !");
    } catch (err) {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Suivez l'activité LinkedIn de vos profils</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Synchroniser</span>
          </Button>
          <Button asChild>
            <Link to="/add-profile">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Link>
          </Button>
        </div>
      </div>

      <StatsCards
        profilesCount={profiles.length}
        postsCount={posts.length}
        totalLikes={totalLikes}
        totalComments={totalComments}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Profils suivis</h2>
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun profil suivi</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/add-profile">Ajouter un profil</Link>
              </Button>
            </div>
          ) : (
            profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                postsCount={postsByProfile[profile.id] || 0}
              />
            ))
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Publications récentes</h2>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune publication pour le moment</p>
              <p className="text-sm">Ajoutez des profils et synchronisez pour voir les publications</p>
            </div>
          ) : (
            <>
              {posts.slice(0, showAllPosts ? undefined : 10).map((post) => <PostCard key={post.id} post={post} />)}
              {posts.length > 10 && !showAllPosts && (
                <Button variant="ghost" className="w-full" onClick={() => setShowAllPosts(true)}>
                  <ChevronDown className="h-4 w-4 mr-1" /> Voir les {posts.length - 10} autres
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
