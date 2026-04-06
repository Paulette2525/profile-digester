import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Send, Loader2, UserPlus, CheckCircle, XCircle, Clock, BarChart3, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SearchResult {
  id: string;
  name: string;
  headline: string;
  avatar_url: string;
  linkedin_url: string;
}

export default function ProspectionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<SearchResult[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [maxResults, setMaxResults] = useState(25);
  const [dailyContactLimit, setDailyContactLimit] = useState(20);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(5);
  const [messageTemplate, setMessageTemplate] = useState(
    "Bonjour {name},\n\nJ'ai vu votre profil ({headline}) et j'aimerais échanger avec vous.\n\nBien cordialement"
  );

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["prospection-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_campaigns" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch recent messages
  const { data: recentMessages = [] } = useQuery({
    queryKey: ["prospection-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_messages" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-profiles", {
        body: { query: searchQuery.trim(), limit: maxResults },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (e: any) {
      toast({ title: "Erreur de recherche", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const toggleProspect = (prospect: SearchResult) => {
    setSelectedProspects((prev) =>
      prev.some((p) => p.id === prospect.id)
        ? prev.filter((p) => p.id !== prospect.id)
        : [...prev, prospect]
    );
  };

  const selectAll = () => {
    if (selectedProspects.length === searchResults.length) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects([...searchResults]);
    }
  };

  const launchCampaign = useMutation({
    mutationFn: async () => {
      if (!user || !campaignName.trim() || selectedProspects.length === 0) return;

      const { data: campaign, error: campErr } = await supabase
        .from("prospection_campaigns" as any)
        .insert({
          user_id: user.id,
          name: campaignName.trim(),
          message_template: messageTemplate,
          status: "active",
          total_prospects: selectedProspects.length,
        } as any)
        .select("*")
        .single();
      if (campErr) throw campErr;

      const messages = selectedProspects.map((p) => ({
        campaign_id: (campaign as any).id,
        user_id: user.id,
        prospect_name: p.name,
        prospect_headline: p.headline,
        prospect_linkedin_url: p.linkedin_url,
        prospect_avatar_url: p.avatar_url,
        message_sent: messageTemplate
          .replace("{name}", p.name)
          .replace("{headline}", p.headline),
        status: "pending",
      }));

      const { error: msgErr } = await supabase
        .from("prospection_messages" as any)
        .insert(messages as any);
      if (msgErr) throw msgErr;

      const { error: fnErr } = await supabase.functions.invoke("prospect-outreach", {
        body: {
          campaign_id: (campaign as any).id,
          daily_limit: dailyContactLimit,
          delay_seconds: delayBetweenMessages,
        },
      });
      if (fnErr) console.error("Outreach function error:", fnErr);

      return campaign;
    },
    onSuccess: () => {
      toast({ title: "Campagne lancée ! 🚀" });
      setCampaignName("");
      setSelectedProspects([]);
      setSearchResults([]);
      qc.invalidateQueries({ queryKey: ["prospection-campaigns"] });
      qc.invalidateQueries({ queryKey: ["prospection-messages"] });
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  // Stats
  const totalSent = campaigns.reduce((s: number, c: any) => s + (c.sent_count || 0), 0);
  const totalReplies = campaigns.reduce((s: number, c: any) => s + (c.reply_count || 0), 0);
  const totalAccepted = campaigns.reduce((s: number, c: any) => s + (c.accepted_count || 0), 0);
  const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;
  const acceptRate = totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0;

  const allSelected = searchResults.length > 0 && selectedProspects.length === searchResults.length;

  return (
    <>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" /> Prospection
          </h1>
          <p className="text-muted-foreground text-sm">
            Recherchez des profils LinkedIn et lancez des campagnes de prospection automatisées
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Prospects contactés", value: totalSent, icon: Send },
            { label: "Réponses", value: totalReplies, icon: CheckCircle },
            { label: "Taux de réponse", value: `${replyRate}%`, icon: BarChart3 },
            { label: "Connexions acceptées", value: totalAccepted, icon: Users },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className="h-8 w-8 text-primary opacity-70" />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Rechercher des profils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search controls */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: CEO startup IA, Growth Marketer, Consultant digital..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Select value={String(maxResults)} onValueChange={(v) => setMaxResults(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 profils</SelectItem>
                  <SelectItem value="25">25 profils</SelectItem>
                  <SelectItem value="50">50 profils</SelectItem>
                  <SelectItem value="100">100 profils</SelectItem>
                  <SelectItem value="200">200 profils</SelectItem>
                  <SelectItem value="500">500 profils</SelectItem>
                  <SelectItem value="1000">1000 profils</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Results header with select all */}
            {searchResults.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {searchResults.length} profil(s) trouvé(s)
                  </p>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleProspect(r)}
                    >
                      <Checkbox checked={selectedProspects.some((p) => p.id === r.id)} />
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {r.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.headline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedProspects.length > 0 && (
              <Badge variant="secondary">{selectedProspects.length} prospect(s) sélectionné(s)</Badge>
            )}
          </CardContent>
        </Card>

        {/* Campaign launch */}
        {selectedProspects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Lancer une campagne
              </CardTitle>
              <CardDescription>
                Variables disponibles : {"{name}"}, {"{headline}"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Nom de la campagne</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Prospection CEO startup Mars 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Message personnalisé</Label>
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Advanced settings */}
              <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg border bg-muted/30">
                <div className="space-y-3">
                  <Label className="text-sm">Contacts par jour : <span className="font-bold text-primary">{dailyContactLimit}</span></Label>
                  <Slider
                    value={[dailyContactLimit]}
                    onValueChange={(v) => setDailyContactLimit(v[0])}
                    min={5}
                    max={500}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">Limite quotidienne (5-500)</p>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm">Délai entre messages : <span className="font-bold text-primary">{delayBetweenMessages}s</span></Label>
                  <Slider
                    value={[delayBetweenMessages]}
                    onValueChange={(v) => setDelayBetweenMessages(v[0])}
                    min={3}
                    max={30}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Temps d'attente entre chaque envoi (secondes)</p>
                </div>
              </div>

              <Button
                onClick={() => launchCampaign.mutate()}
                disabled={launchCampaign.isPending || !campaignName.trim()}
                className="w-full"
              >
                {launchCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Lancer ({selectedProspects.length} prospects — {Math.ceil(selectedProspects.length / dailyContactLimit)} jour(s))
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Campaign history with expandable details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune campagne lancée</p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c: any) => (
                  <CampaignRow key={c.id} campaign={c} userId={user?.id} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent messages */}
        {recentMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Messages récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentMessages.map((msg: any) => (
                  <div key={msg.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{msg.prospect_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{msg.prospect_headline}</p>
                    </div>
                    <Badge
                      variant={
                        msg.status === "sent" ? "default" :
                        msg.status === "replied" ? "secondary" :
                        msg.status === "error" ? "destructive" : "outline"
                      }
                    >
                      {msg.status === "sent" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {msg.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {msg.status === "error" && <XCircle className="h-3 w-3 mr-1" />}
                      {msg.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
