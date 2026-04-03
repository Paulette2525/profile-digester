import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Save, Loader2, Upload, X, Plus, Trash2, Image as ImageIcon, Target, User, Megaphone, BookOpen, Mic, MicOff, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

function SectionCard({ icon: Icon, title, children, defaultOpen = true }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-4 w-4" /> {title}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function MemoirePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    full_name: "", profession: "", company: "", industry: "",
    target_audience: "", offers_description: "", ambitions: "", values: "",
    tone_of_voice: "", content_themes: [] as string[], content_types: [] as string[],
    personal_story: "", expertise_areas: "", posting_frequency: "",
    preferred_formats: "", additional_notes: "", writing_instructions: "",
    achievements: "", unique_methodology: "", key_results: "", differentiators: "",
    audience_pain_points: "", call_to_action_style: "", linkedin_goals: "",
    target_followers: 0, target_connections: 0, target_engagement_rate: 0,
    goal_timeline: "", competitors: "", content_pillars: [] as string[], brand_keywords: [] as string[],
  });
  const [themeInput, setThemeInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  const { data: memory, isLoading: memoryLoading } = useQuery({
    queryKey: ["user-memory"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_memory").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (memory) {
      setForm({
        full_name: memory.full_name || "",
        profession: memory.profession || "",
        company: memory.company || "",
        industry: memory.industry || "",
        target_audience: memory.target_audience || "",
        offers_description: memory.offers_description || "",
        ambitions: memory.ambitions || "",
        values: (memory as any).values || "",
        tone_of_voice: memory.tone_of_voice || "",
        content_themes: (memory.content_themes as string[]) || [],
        content_types: (memory.content_types as string[]) || [],
        personal_story: memory.personal_story || "",
        expertise_areas: memory.expertise_areas || "",
        posting_frequency: memory.posting_frequency || "",
        preferred_formats: memory.preferred_formats || "",
        additional_notes: memory.additional_notes || "",
        achievements: (memory as any).achievements || "",
        unique_methodology: (memory as any).unique_methodology || "",
        key_results: (memory as any).key_results || "",
        differentiators: (memory as any).differentiators || "",
        audience_pain_points: (memory as any).audience_pain_points || "",
        call_to_action_style: (memory as any).call_to_action_style || "",
        linkedin_goals: (memory as any).linkedin_goals || "",
        target_followers: (memory as any).target_followers || 0,
        target_connections: (memory as any).target_connections || 0,
        target_engagement_rate: (memory as any).target_engagement_rate || 0,
        goal_timeline: (memory as any).goal_timeline || "",
        competitors: (memory as any).competitors || "",
        writing_instructions: (memory as any).writing_instructions || "",
        content_pillars: ((memory as any).content_pillars as string[]) || [],
        brand_keywords: ((memory as any).brand_keywords as string[]) || [],
      });
    }
  }, [memory]);

  const saveMemory = useMutation({
    mutationFn: async () => {
      if (memory?.id) {
        const { error } = await supabase.from("user_memory").update(form as any).eq("id", memory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_memory").insert({ ...form, user_id: user?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Mémoire sauvegardée !");
      queryClient.invalidateQueries({ queryKey: ["user-memory"] });
      queryClient.invalidateQueries({ queryKey: ["account-stats"] });
      queryClient.invalidateQueries({ queryKey: ["content-strategy"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTag = (field: 'content_themes' | 'content_types' | 'content_pillars' | 'brand_keywords', value: string, setter: (v: string) => void) => {
    if (value.trim() && !form[field].includes(value.trim())) {
      setForm(f => ({ ...f, [field]: [...f[field], value.trim()] }));
      setter("");
    }
  };

  const removeTag = (field: 'content_themes' | 'content_types' | 'content_pillars' | 'brand_keywords', value: string) => {
    setForm(f => ({ ...f, [field]: f[field].filter(x => x !== value) }));
  };

  // ---- Photos ----
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ["user-photos"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_photos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [photoDesc, setPhotoDesc] = useState("");
  const [photoCategory, setPhotoCategory] = useState<string>("general");
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("user-photos").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(path);
      const { error: insertErr } = await supabase.from("user_photos").insert({
        image_url: urlData.publicUrl,
        description: photoDesc || null,
        photo_category: photoCategory === "general" ? null : photoCategory,
        user_id: user?.id,
      } as any);
      if (insertErr) throw insertErr;
      toast.success("Photo ajoutée !");
      setPhotoDesc("");
      setPhotoCategory("general");
      queryClient.invalidateQueries({ queryKey: ["user-photos"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id: string, url: string) => {
    try {
      const path = url.split("/user-photos/").pop();
      if (path) await supabase.storage.from("user-photos").remove([path]);
      await supabase.from("user_photos").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["user-photos"] });
      toast.success("Photo supprimée");
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const [listeningField, setListeningField] = useState<string | null>(null);
  const [optimizingField, setOptimizingField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningField(null);
  }, []);

  const startListening = useCallback((fieldName: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome.");
      return;
    }
    if (listeningField) stopListening();

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setForm(f => {
          const current = (f as any)[fieldName] as string || "";
          return { ...f, [fieldName]: current ? current + " " + transcript : transcript };
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error !== "aborted") toast.error("Erreur de reconnaissance vocale");
      stopListening();
    };

    recognition.onend = () => {
      setListeningField(prev => prev === fieldName ? null : prev);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListeningField(fieldName);
  }, [listeningField, stopListening]);

  const optimizeField = useCallback(async (fieldName: string, fieldLabel: string) => {
    const text = (form as any)[fieldName] as string;
    if (!text?.trim()) return;
    setOptimizingField(fieldName);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-text", {
        body: { text, fieldContext: fieldLabel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.optimizedText) {
        setForm(f => ({ ...f, [fieldName]: data.optimizedText }));
        toast.success("Texte optimisé !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'optimisation");
    } finally {
      setOptimizingField(null);
    }
  }, [form]);

  const renderField = (label: string, name: string, textarea = false, placeholder = "", type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {textarea ? (
        <>
          <Textarea id={name} value={(form as any)[name] as string} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} placeholder={placeholder} rows={3} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant={listeningField === name ? "destructive" : "outline"}
              size="sm"
              onClick={() => listeningField === name ? stopListening() : startListening(name)}
            >
              {listeningField === name ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {listeningField === name ? "Arrêter" : "Dicter"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!((form as any)[name] as string)?.trim() || optimizingField === name}
              onClick={() => optimizeField(name, label)}
            >
              {optimizingField === name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Optimiser
            </Button>
          </div>
        </>
      ) : (
        <Input id={name} type={type} value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [name]: type === "number" ? Number(e.target.value) : e.target.value }))} placeholder={placeholder} />
      )}
    </div>
  );

  const renderTagInput = (label: string, field: 'content_themes' | 'content_types' | 'content_pillars' | 'brand_keywords', value: string, onChange: (v: string) => void, placeholder: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag(field, value, onChange))} />
        <Button variant="outline" size="icon" onClick={() => addTag(field, value, onChange)}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {form[field].map(t => (
          <Badge key={t} variant="secondary" className="gap-1">{t}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(field, t)} /></Badge>
        ))}
      </div>
    </div>
  );

  if (memoryLoading) return <><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Brain className="h-6 w-6" /> Mémoire</h1>
            <p className="text-muted-foreground">Votre profil complet pour des publications authentiques et virales</p>
          </div>
          <Button onClick={() => saveMemory.mutate()} disabled={saveMemory.isPending}>
            {saveMemory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
        </div>

        {/* Section 1: Identité & Expertise */}
        <SectionCard icon={User} title="Identité & Expertise">
          <div className="grid gap-4 md:grid-cols-2">
            {renderField("Nom complet", "full_name", false, "Jean Dupont")}
            {renderField("Profession / Titre", "profession", false, "CEO, Coach, Consultant…")}
            {renderField("Entreprise", "company", false, "Ma Société SAS")}
            {renderField("Industrie / Secteur", "industry", false, "Tech, Finance, Marketing…")}
          </div>
          {renderField("Expertise et réalisations", "expertise_areas", true, "Vos domaines d'expertise, réalisations majeures, résultats chiffrés, méthodologie unique, ce qui vous différencie…")}
        </SectionCard>

        {/* Section 2: Audience & Objectifs */}
        <SectionCard icon={Target} title="Audience & Objectifs">
          {renderField("Audience cible", "target_audience", true, "Entrepreneurs, dirigeants PME, marketeurs B2B… et leurs problèmes/frustrations")}
          {renderField("Objectifs LinkedIn", "linkedin_goals", true, "Devenir leader d'opinion, générer des leads, concurrents à observer…")}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderField("Objectif abonnés", "target_followers", false, "10000", "number")}
            {renderField("Objectif connexions", "target_connections", false, "5000", "number")}
            {renderField("Taux d'engagement (%)", "target_engagement_rate", false, "5", "number")}
            {renderField("Horizon temporel", "goal_timeline", false, "3 mois, 6 mois, 1 an…")}
          </div>
        </SectionCard>

        {/* Section 3: Contenu & Ton */}
        <SectionCard icon={Megaphone} title="Contenu & Ton">
          {renderTagInput("Thèmes de contenu", "content_themes", themeInput, setThemeInput, "Productivité, mindset, leadership, IA…")}
          {renderTagInput("Types de contenu", "content_types", typeInput, setTypeInput, "Storytelling, liste, carrousel…")}
          {renderField("Ton et style", "tone_of_voice", true, "Votre ton de voix, style de CTA, formats préférés, fréquence de publication…")}
        </SectionCard>

        {/* Section 4: Histoire & Offres */}
        <SectionCard icon={BookOpen} title="Histoire & Offres">
          {renderField("Mon histoire", "personal_story", true, "Votre parcours personnel, moments clés, anecdotes marquantes, valeurs, ambitions…")}
          {renderField("Instructions de rédaction", "writing_instructions", true, "Consignes obligatoires : style d'écriture, structure des posts, ton, longueur, mots interdits, expressions à utiliser…")}
          {renderField("Offres et notes", "offers_description", true, "Vos offres, produits, services et toute info utile supplémentaire…")}
        </SectionCard>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Mes Photos</CardTitle>
            <CardDescription>Photos personnelles à utiliser dans vos publications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label>Description (optionnelle)</Label>
                <Input value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} placeholder="Photo de conférence, portrait pro…" />
              </div>
              <div className="space-y-1.5">
                <Label>Usage</Label>
                <Select value={photoCategory} onValueChange={setPhotoCategory}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                    <SelectItem value="storytelling">Storytelling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Uploader</span>
                  </Button>
                </Label>
                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>
            {photosLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photos.map(p => (
                  <div key={p.id} className="relative group rounded-lg overflow-hidden border">
                    <img src={p.image_url} alt={p.description || "Photo"} className="w-full h-32 object-cover" />
                    <button onClick={() => deletePhoto(p.id, p.image_url)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="p-1.5">
                      {(p as any).photo_category && (
                        <Badge variant="secondary" className="text-xs mb-1">{(p as any).photo_category}</Badge>
                      )}
                      {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune photo ajoutée</p>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}
