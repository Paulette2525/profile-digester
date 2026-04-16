import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProspectionStats } from "@/components/prospection/ProspectionStats";
import { Loader2 } from "lucide-react";

export default function ProspectionStatsPage() {
  const { user } = useAuth();

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["prospection-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_campaigns")
        .select("id, name, status, total_prospects, sent_count, reply_count, accepted_count, warmup_enabled, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["prospection-messages-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_messages")
        .select("id, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const isLoading = loadingCampaigns || loadingMessages;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Statistiques de prospection</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ProspectionStats campaigns={campaigns} messages={messages} />
      )}
    </>
  );
}
