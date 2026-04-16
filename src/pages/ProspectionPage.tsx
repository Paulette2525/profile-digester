import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Send, Loader2, UserPlus, CheckCircle, XCircle, Clock, BarChart3, CheckSquare, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Pause, Play, Building2, MessageSquare, Flame, Zap, Settings2, Power } from "lucide-react";
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

interface CompanyResult {
  id: string;
  name: string;
  industry: string;
  logo_url: string;
  employee_count: number | null;
  linkedin_url: string;
  description: string;
}

interface SequenceStep {
  step_order: number;
  delay_days: number;
  message_template: string;
}

function StepBadge({ stepOrder }: { stepOrder: number }) {
  if (stepOrder === 1) return <Badge variant="outline" className="text-[10px]">Message initial</Badge>;
  return <Badge variant="secondary" className="text-[10px]"><RefreshCw className="h-2.5 w-2.5 mr-1" />Relance {stepOrder - 1}</Badge>;
}

function WarmupBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    warming: { label: "Warm-up...", className: "border-orange-400 text-orange-600" },
    warmed: { label: "Warmé ✓", className: "border-green-400 text-green-600" },
    warmup_error: { label: "Warm-up ✗", className: "border-red-400 text-red-600" },
  };
  const c = config[status];
  if (!c) return null;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}><Flame className="h-2.5 w-2.5 mr-1" />{c.label}</Badge>;
}

function CampaignRow({ campaign: c, userId }: { campaign: any; userId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const { data: messages, isLoading } = useQuery({
    queryKey: ["campaign-messages", c.id],
    enabled: expanded && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_messages")
        .select("*")
        .eq("campaign_id", c.id)
        .order("step_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const togglePause = useMutation({
    mutationFn: async () => {
      const newStatus = c.status === "paused" ? "active" : "paused";
      const { error } = await supabase
        .from("prospection_campaigns")
        .update({ status: newStatus })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospection-campaigns"] });
      toast({ title: c.status === "paused" ? "Campagne reprise ▶️" : "Campagne mise en pause ⏸️" });
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const canTogglePause = c.status === "active" || c.status === "paused";

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{c.name}</p>
          <Badge
            variant={c.status === "active" ? "default" : c.status === "paused" ? "outline" : "secondary"}
            className={`shrink-0 ${c.status === "paused" ? "border-orange-400 text-orange-600" : ""}`}
          >
            {c.status === "paused" && <Pause className="h-3 w-3 mr-1" />}
            {c.status === "active" ? "Active" : c.status === "completed" ? "Terminée" : c.status === "paused" ? "En pause" : c.status}
          </Badge>
          {c.warmup_enabled && (
            <Badge variant="outline" className="shrink-0 text-[10px] border-orange-300 text-orange-500">
              <Flame className="h-2.5 w-2.5 mr-1" />Warm-up
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span>{c.total_prospects} prospects</span>
          <span>{c.sent_count} envoyés</span>
          <span>{c.reply_count} réponses</span>
          <span>{format(new Date(c.created_at), "dd MMM yyyy", { locale: fr })}</span>
          {canTogglePause && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); togglePause.mutate(); }}
              disabled={togglePause.isPending}
              title={c.status === "paused" ? "Reprendre" : "Mettre en pause"}
            >
              {togglePause.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : c.status === "paused" ? (
                <Play className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Pause className="h-3.5 w-3.5 text-orange-500" />
              )}
            </Button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t p-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !messages?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun message</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {messages.map((msg: any) => (
                <div key={msg.id} className="flex items-center gap-3 p-2 rounded border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{msg.prospect_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{msg.prospect_headline}</p>
                  </div>
                  <WarmupBadge status={msg.warmup_status} />
                  <StepBadge stepOrder={msg.step_order || 1} />
                  <Badge
                    variant={
                      msg.status === "sent" ? "default" :
                      msg.status === "replied" ? "secondary" :
                      msg.status === "error" ? "destructive" : "outline"
                    }
                    className="text-xs"
                  >
                    {msg.status === "sent" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {msg.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {msg.status === "error" && <XCircle className="h-3 w-3 mr-1" />}
                    {msg.status}
                  </Badge>
                  {msg.next_followup_at && msg.status === "sent" && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Relance : {format(new Date(msg.next_followup_at), "dd/MM")}
                    </span>
                  )}
                  {msg.sent_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(msg.sent_at), "dd/MM HH:mm")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutopilotPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["prospection-autopilot-config", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospection_autopilot_config" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [mode, setMode] = useState("profiles");
  const [searchQuery, setSearchQueryAP] = useState("");
  const [postIds, setPostIds] = useState("");
  const [companyKeywords, setCompanyKeywords] = useState("");
  const [dailyLimit, setDailyLimit] = useState(20);
  const [warmup, setWarmup] = useState(true);
  const [warmupDelay, setWarmupDelay] = useState(2);
  const [msgTemplate, setMsgTemplate] = useState("Bonjour {name},\n\nJ'ai vu votre profil ({headline}) et j'aimerais échanger avec vous.\n\nBien cordialement");
  const [offerDesc, setOfferDesc] = useState("");
  const [convGuidelines, setConvGuidelines] = useState("");
  const [seqSteps, setSeqSteps] = useState<SequenceStep[]>([]);
  const [delayMsg, setDelayMsg] = useState(5);

  useEffect(() => {
    if (config) {
      setMode(config.mode || "profiles");
      setSearchQueryAP(config.search_query || "");
      setPostIds((config.post_ids || []).join(", "));
      setCompanyKeywords(config.company_keywords || "");
      setDailyLimit(config.daily_contact_limit || 20);
      setWarmup(config.warmup_enabled ?? true);
      setWarmupDelay(config.warmup_delay_hours || 2);
      setMsgTemplate(config.message_template || "Bonjour {name},\n\nJ'ai vu votre profil ({headline}) et j'aimerais échanger avec vous.\n\nBien cordialement");
      setOfferDesc(config.offer_description || "");
      setConvGuidelines(config.conversation_guidelines || "");
      setSeqSteps(Array.isArray(config.sequence_steps) ? config.sequence_steps : []);
      setDelayMsg(config.delay_between_messages || 5);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (enabled?: boolean) => {
      const payload = {
        user_id: userId,
        enabled: enabled !== undefined ? enabled : (config?.enabled ?? false),
        mode,
        search_query: searchQuery || null,
        post_ids: postIds.split(",").map((s: string) => s.trim()).filter(Boolean),
        company_keywords: companyKeywords || null,
        daily_contact_limit: dailyLimit,
        warmup_enabled: warmup,
        warmup_delay_hours: warmupDelay,
        message_template: msgTemplate || null,
        sequence_steps: seqSteps,
        offer_description: offerDesc || null,
        conversation_guidelines: convGuidelines || null,
        delay_between_messages: delayMsg,
      };

      if (config?.id) {
        const { error } = await supabase
          .from("prospection_autopilot_config" as any)
          .update(payload as any)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prospection_autopilot_config" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospection-autopilot-config"] });
      toast({ title: "Configuration sauvegardée ✅" });
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const toggleEnabled = () => {
    const newEnabled = !(config?.enabled ?? false);
    saveMutation.mutate(newEnabled);
  };

  const isEnabled = config?.enabled ?? false;
  const lastRun = config?.last_run_at;

  if (isLoading) return null;

  return (
    <Card className={`border-2 ${isEnabled ? "border-primary/50 bg-primary/5" : "border-dashed"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className={`h-5 w-5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
            Prospection automatique
            {isEnabled && <Badge className="bg-primary/20 text-primary text-[10px]">ACTIF</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastRun && (
              <span className="text-[10px] text-muted-foreground">
                Dernière exécution : {format(new Date(lastRun), "dd/MM à HH:mm", { locale: fr })}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfig(!showConfig)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Switch checked={isEnabled} onCheckedChange={toggleEnabled} disabled={saveMutation.isPending} />
          </div>
        </div>
        <CardDescription className="text-xs">
          Configure une fois, la prospection s'exécute automatiquement chaque jour à 08h00.
        </CardDescription>
      </CardHeader>

      {showConfig && (
        <CardContent className="space-y-5 pt-0">
          {/* Mode selection */}
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profiles" className="flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3" /> Profils
              </TabsTrigger>
              <TabsTrigger value="commenters" className="flex items-center gap-1.5 text-xs">
                <MessageSquare className="h-3 w-3" /> Commentaires
              </TabsTrigger>
              <TabsTrigger value="companies" className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3 w-3" /> Entreprises
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-2 mt-3">
              <Label className="text-sm">Mots-clés de recherche</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQueryAP(e.target.value)}
                placeholder="Ex: CEO startup IA, Growth Marketer, Consultant digital..."
              />
            </TabsContent>

            <TabsContent value="commenters" className="space-y-2 mt-3">
              <Label className="text-sm">IDs de posts à surveiller (séparés par des virgules)</Label>
              <Input
                value={postIds}
                onChange={(e) => setPostIds(e.target.value)}
                placeholder="urn:li:activity:123, urn:li:activity:456..."
              />
              <p className="text-xs text-muted-foreground">Les personnes qui commentent ces posts seront automatiquement contactées</p>
            </TabsContent>

            <TabsContent value="companies" className="space-y-2 mt-3">
              <Label className="text-sm">Mots-clés entreprises</Label>
              <Input
                value={companyKeywords}
                onChange={(e) => setCompanyKeywords(e.target.value)}
                placeholder="Ex: startup IA, agence marketing, cabinet conseil..."
              />
              <p className="text-xs text-muted-foreground">Les décideurs de ces entreprises seront automatiquement contactés</p>
            </TabsContent>
          </Tabs>

          {/* Daily limit */}
          <div className="space-y-2">
            <Label className="text-sm">Contacts par jour : <span className="font-bold text-primary">{dailyLimit}</span></Label>
            <Slider value={[dailyLimit]} onValueChange={(v) => setDailyLimit(v[0])} min={5} max={100} step={5} />
          </div>

          {/* Offer description */}
          <div className="space-y-2">
            <Label className="text-sm">Ce que vous proposez</Label>
            <Textarea
              value={offerDesc}
              onChange={(e) => setOfferDesc(e.target.value)}
              rows={2}
              placeholder="Ex: Nous aidons les startups à automatiser leur prospection LinkedIn et générer 3x plus de leads qualifiés..."
            />
            <p className="text-xs text-muted-foreground">Sera injecté dans les messages personnalisés par l'IA</p>
          </div>

          {/* Conversation guidelines */}
          <div className="space-y-2">
            <Label className="text-sm">Comment converser / relancer</Label>
            <Textarea
              value={convGuidelines}
              onChange={(e) => setConvGuidelines(e.target.value)}
              rows={2}
              placeholder="Ex: Ton amical et direct. Pas de jargon commercial. Proposer un appel de 15min si intérêt..."
            />
          </div>

          {/* Message template */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Étape 1</Badge>
              Message initial
            </Label>
            <Textarea value={msgTemplate} onChange={(e) => setMsgTemplate(e.target.value)} rows={3} />
            <p className="text-xs text-muted-foreground">Variables : {"{name}"}, {"{headline}"} — L'IA personnalise chaque message</p>
          </div>

          {/* Sequence steps */}
          {seqSteps.map((step, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border border-dashed bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]"><RefreshCw className="h-2.5 w-2.5 mr-0.5" />Relance {i + 1}</Badge>
                  après J+{step.delay_days}
                </Label>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSeqSteps(prev => prev.filter((_, j) => j !== i).map((s, j) => ({ ...s, step_order: j + 2 })))}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px]">Délai (jours) :</Label>
                <Input type="number" min={1} max={30} value={step.delay_days} onChange={(e) => setSeqSteps(prev => prev.map((s, j) => j === i ? { ...s, delay_days: parseInt(e.target.value) || 1 } : s))} className="w-16 h-7 text-xs" />
              </div>
              <Textarea value={step.message_template} onChange={(e) => setSeqSteps(prev => prev.map((s, j) => j === i ? { ...s, message_template: e.target.value } : s))} rows={2} className="text-xs" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setSeqSteps(prev => [...prev, { step_order: prev.length + 2, delay_days: (prev[prev.length - 1]?.delay_days || 0) + 3, message_template: "Bonjour {name},\n\nJe me permets de revenir vers vous.\n\nBien cordialement" }])} className="w-full border-dashed text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une relance
          </Button>

          {/* Advanced */}
          <div className="grid gap-4 md:grid-cols-2 p-3 rounded-lg border bg-muted/30">
            <div className="space-y-2">
              <Label className="text-xs">Délai entre messages : <span className="font-bold text-primary">{delayMsg}s</span></Label>
              <Slider value={[delayMsg]} onValueChange={(v) => setDelayMsg(v[0])} min={3} max={30} step={1} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5"><Flame className="h-3 w-3 text-orange-500" />Warm-up</Label>
                <Switch checked={warmup} onCheckedChange={setWarmup} />
              </div>
              {warmup && (
                <div className="space-y-1">
                  <Label className="text-[10px]">Délai : <span className="font-bold text-primary">{warmupDelay}h</span></Label>
                  <Slider value={[warmupDelay]} onValueChange={(v) => setWarmupDelay(v[0])} min={1} max={24} step={1} />
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Power className="h-4 w-4 mr-2" />}
            Sauvegarder la configuration
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function ProspectionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Search state
  const [searchTab, setSearchTab] = useState("profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<SearchResult[]>([]);
  const [maxResults, setMaxResults] = useState(25);

  // Comment extraction state
  const [postIdInput, setPostIdInput] = useState("");
  const [extracting, setExtracting] = useState(false);

  // Company search state
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyResult[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [extractingDeciders, setExtractingDeciders] = useState<string | null>(null);

  // Campaign config state
  const [campaignName, setCampaignName] = useState("");
  const [dailyContactLimit, setDailyContactLimit] = useState(20);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(5);
  const [warmupEnabled, setWarmupEnabled] = useState(false);
  const [warmupDelayHours, setWarmupDelayHours] = useState(2);
  const [messageTemplate, setMessageTemplate] = useState(
    "Bonjour {name},\n\nJ'ai vu votre profil ({headline}) et j'aimerais échanger avec vous.\n\nBien cordialement"
  );
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);

  const addSequenceStep = () => {
    const lastDelay = sequenceSteps.length > 0 ? sequenceSteps[sequenceSteps.length - 1].delay_days : 0;
    setSequenceSteps([
      ...sequenceSteps,
      { step_order: sequenceSteps.length + 2, delay_days: lastDelay + 3, message_template: `Bonjour {name},\n\nJe me permets de revenir vers vous suite à mon précédent message.\n\nBien cordialement` },
    ]);
  };

  const removeSequenceStep = (index: number) => {
    setSequenceSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 2 })));
  };

  const updateSequenceStep = (index: number, field: keyof SequenceStep, value: any) => {
    setSequenceSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

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

  // Profile search
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

  // Extract commenters
  const handleExtractCommenters = async () => {
    if (!postIdInput.trim()) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-commenters", {
        body: { post_id: postIdInput.trim(), limit: maxResults },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
      toast({ title: `${data?.results?.length || 0} profil(s) extraits` });
    } catch (e: any) {
      toast({ title: "Erreur d'extraction", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  // Company search
  const handleSearchCompanies = async () => {
    if (!companyQuery.trim()) return;
    setSearchingCompanies(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-companies", {
        body: { query: companyQuery.trim(), limit: maxResults },
      });
      if (error) throw error;
      setCompanyResults(data?.results || []);
    } catch (e: any) {
      toast({ title: "Erreur de recherche", description: e.message, variant: "destructive" });
    } finally {
      setSearchingCompanies(false);
    }
  };

  // Extract decision-makers from company
  const handleExtractDeciders = async (company: CompanyResult) => {
    setExtractingDeciders(company.id);
    try {
      const { data, error } = await supabase.functions.invoke("search-profiles", {
        body: { query: company.name, company_id: company.id, limit: maxResults },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
      setSearchTab("profiles"); // Switch to profiles tab to show results
      toast({ title: `${data?.results?.length || 0} décideur(s) trouvé(s) chez ${company.name}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setExtractingDeciders(null);
    }
  };

  const toggleProspect = (prospect: SearchResult) => {
    setSelectedProspects((prev) =>
      prev.some((p) => p.id === prospect.id) ? prev.filter((p) => p.id !== prospect.id) : [...prev, prospect]
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
          warmup_enabled: warmupEnabled,
          warmup_delay_hours: warmupDelayHours,
        } as any)
        .select("*")
        .single();
      if (campErr) throw campErr;

      const allSteps: SequenceStep[] = [
        { step_order: 1, delay_days: 0, message_template: messageTemplate },
        ...sequenceSteps,
      ];

      const { error: stepErr } = await supabase
        .from("prospection_sequence_steps" as any)
        .insert(
          allSteps.map((s) => ({
            campaign_id: (campaign as any).id,
            step_order: s.step_order,
            delay_days: s.delay_days,
            message_template: s.message_template,
          })) as any
        );
      if (stepErr) throw stepErr;

      const messages = selectedProspects.map((p) => ({
        campaign_id: (campaign as any).id,
        user_id: user.id,
        prospect_name: p.name,
        prospect_headline: p.headline,
        prospect_linkedin_url: p.linkedin_url,
        prospect_avatar_url: p.avatar_url,
        message_sent: messageTemplate.replace("{name}", p.name).replace("{headline}", p.headline),
        status: "pending",
        step_order: 1,
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
      setSequenceSteps([]);
      setWarmupEnabled(false);
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

        {/* Autopilot panel */}
        {user && <AutopilotPanel userId={user.id} />}


        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Trouver des prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={searchTab} onValueChange={setSearchTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profiles" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Profils
                </TabsTrigger>
                <TabsTrigger value="commenters" className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Commentaires
                </TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Entreprises
                </TabsTrigger>
              </TabsList>

              {/* Profile search tab */}
              <TabsContent value="profiles" className="space-y-4">
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
              </TabsContent>

              {/* Commenters extraction tab */}
              <TabsContent value="commenters" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Extrayez les personnes qui ont commenté ou réagi à un post LinkedIn.
                    Entrez l'ID du post Unipile ou l'URN LinkedIn.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={postIdInput}
                      onChange={(e) => setPostIdInput(e.target.value)}
                      placeholder="ID du post LinkedIn (ex: urn:li:activity:1234567890)"
                      onKeyDown={(e) => e.key === "Enter" && handleExtractCommenters()}
                      className="flex-1"
                    />
                    <Button onClick={handleExtractCommenters} disabled={extracting || !postIdInput.trim()}>
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      <span className="ml-1.5">Extraire</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Companies search tab */}
              <TabsContent value="companies" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    placeholder="Ex: startup IA, agence marketing, cabinet conseil..."
                    onKeyDown={(e) => e.key === "Enter" && handleSearchCompanies()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchCompanies} disabled={searchingCompanies || !companyQuery.trim()}>
                    {searchingCompanies ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                  </Button>
                </div>

                {companyResults.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {companyResults.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.industry}{c.employee_count ? ` · ${c.employee_count} employés` : ""}
                          </p>
                          {c.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtractDeciders(c)}
                          disabled={extractingDeciders === c.id}
                        >
                          {extractingDeciders === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Users className="h-3.5 w-3.5 mr-1" />
                          )}
                          Décideurs
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Shared results display (profiles from any source) */}
            {searchResults.length > 0 && searchTab !== "companies" && (
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

              {/* Step 1: Initial message */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Étape 1</Badge>
                  Message initial
                </Label>
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Follow-up steps */}
              {sequenceSteps.map((step, index) => (
                <div key={index} className="space-y-2 p-4 rounded-lg border border-dashed bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Relance {index + 1}
                      </Badge>
                      après J+{step.delay_days}
                    </Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSequenceStep(index)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Délai (jours) :</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={step.delay_days}
                      onChange={(e) => updateSequenceStep(index, "delay_days", parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                  <Textarea
                    value={step.message_template}
                    onChange={(e) => updateSequenceStep(index, "message_template", e.target.value)}
                    rows={3}
                    placeholder="Message de relance..."
                  />
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addSequenceStep} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une relance
              </Button>

              {/* Advanced settings */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2">
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

                {/* Warm-up settings */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <Label className="text-sm font-medium">Warm-up avant contact</Label>
                    </div>
                    <Switch checked={warmupEnabled} onCheckedChange={setWarmupEnabled} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visite le profil et like 1-2 posts du prospect avant d'envoyer le message. Augmente le taux d'acceptation de 30-40%.
                  </p>
                  {warmupEnabled && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm">Délai après warm-up : <span className="font-bold text-primary">{warmupDelayHours}h</span></Label>
                      <Slider
                        value={[warmupDelayHours]}
                        onValueChange={(v) => setWarmupDelayHours(v[0])}
                        min={1}
                        max={24}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">Temps d'attente entre le warm-up et l'envoi du message (1-24h)</p>
                    </div>
                  )}
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
                Lancer ({selectedProspects.length} prospects{sequenceSteps.length > 0 ? ` — ${sequenceSteps.length + 1} étapes` : ""}{warmupEnabled ? " — warm-up activé" : ""} — {Math.ceil(selectedProspects.length / dailyContactLimit)} jour(s))
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Campaign history */}
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
                    <WarmupBadge status={msg.warmup_status} />
                    <StepBadge stepOrder={msg.step_order || 1} />
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
