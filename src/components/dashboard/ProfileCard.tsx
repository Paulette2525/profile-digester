import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"tracked_profiles">;

interface ProfileCardProps {
  profile: Profile;
  postsCount?: number;
}

export function ProfileCard({ profile, postsCount = 0 }: ProfileCardProps) {
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link to={`/profile/${profile.id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">
              {profile.name}
            </p>
            {profile.headline && (
              <p className="text-sm text-muted-foreground truncate">{profile.headline}</p>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{postsCount} posts</span>
            <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
