import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle, Share2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Post = Tables<"linkedin_posts"> & {
  tracked_profiles?: Tables<"tracked_profiles"> | null;
};

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const profile = post.tracked_profiles;
  const initials = profile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  const timeAgo = post.posted_at
    ? formatDistanceToNow(new Date(post.posted_at), { addSuffix: true, locale: fr })
    : "Date inconnue";

  const truncatedContent = post.content
    ? post.content.length > 280
      ? post.content.slice(0, 280) + "…"
      : post.content
    : "Pas de contenu";

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{profile?.name ?? "Profil inconnu"}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{truncatedContent}</p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {post.comments_count}
          </span>
          <span className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" />
            {post.shares_count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
