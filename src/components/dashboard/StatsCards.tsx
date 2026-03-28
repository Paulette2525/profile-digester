import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, ThumbsUp, MessageCircle } from "lucide-react";

interface StatsCardsProps {
  profilesCount: number;
  postsCount: number;
  totalLikes: number;
  totalComments: number;
}

export function StatsCards({ profilesCount, postsCount, totalLikes, totalComments }: StatsCardsProps) {
  const stats = [
    { label: "Profils suivis", value: profilesCount, icon: Users, color: "text-primary" },
    { label: "Publications", value: postsCount, icon: FileText, color: "text-linkedin" },
    { label: "Total likes", value: totalLikes, icon: ThumbsUp, color: "text-success" },
    { label: "Total commentaires", value: totalComments, icon: MessageCircle, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`${stat.color} bg-accent rounded-lg p-2.5`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
