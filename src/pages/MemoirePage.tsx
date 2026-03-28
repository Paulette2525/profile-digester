import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Save, Loader2, Upload, X, Plus, Lightbulb, Trash2, Image as ImageIcon, Target, User, Award, Users, Megaphone, BookOpen, Briefcase, Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

export default function MemoirePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    full_name: "", profession: "", company: "", industry: "",
    target_audience: "", offers_description: "", ambitions: "", values: "",
    tone_of_voice: "", content_themes: [] as string[], content_types: [] as string[],
    personal_story: "", expertise_areas: "", posting_frequency: "",
    preferred_formats: "", additional_notes: "",
    achievements: "", unique_methodology: "", key_results: "", differentiators: "",
    audience_pain_points: "", call_to_action_style: "", linkedin_goals: "",
    target_followers: 0, target_connections: 0, target_engagement_rate: 0,
    goal_timeline: "", competitors: "", content_pillars: [] as string[], brand_keywords: [] as string[],
  });
  const [themeInput, setThemeInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [pillarInput, setPillarInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

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
        user_id: user?.id,
      } as any);
      if (insertErr) throw insertErr;
      toast.success("Photo ajoutée !");
      setPhotoDesc("");
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

  // ---- Ideas ----
  const { data: ideas, isLoading: ideasLoading } = useQuery({
    queryKey: ["content-ideas"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_ideas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newIdea, setNewIdea] = useState("");
  const [ideaUploading, setIdeaUploading] = useState(false);

  const addIdea = async (imageFile?: File) => {
    if (!newIdea.trim()) return;
    let imageUrl: string | null = null;
    if (imageFile) {
      setIdeaUploading(true);
      try {
        const ext = imageFile.name.split(".").pop();
        const path = `ideas/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("user-photos").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } catch (err: any) {
        toast.error("Erreur upload image: " + err.message);
        setIdeaUploading(false);
        return;
      }
    }
    const { error } = await supabase.from("content_ideas").insert({ idea_text: newIdea.trim(), image_url: imageUrl, user_id: user?.id } as any);
    if (error) { toast.error(error.message); setIdeaUploading(false); return; }
    toast.success("Idée ajoutée !");
    setNewIdea("");
    setIdeaUploading(false);
    queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
  };

  const uploadIdeaImage = async (ideaId: string, file: File) => {
    try {
      const ext = file.name.split(".").pop();
      const path = `ideas/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("user-photos").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(path);
      await supabase.from("content_ideas").update({ image_url: urlData.publicUrl } as any).eq("id", ideaId);
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
      toast.success("Image associée !");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteIdea = async (id: string) => {
    await supabase.from("content_ideas").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
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

  const Field = ({ label, name, textarea = false, placeholder = "", type = "text" }: { label: string; name: string; textarea?: boolean; placeholder?: string; type?: string }) => (
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

  const TagInput = ({ label, field, value, onChange, placeholder }: { label: string; field: 'content_themes' | 'content_types' | 'content_pillars' | 'brand_keywords'; value: string; onChange: (v: string) => void; placeholder: string }) => (
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

  const Section = ({ icon: Icon, title, children, defaultOpen = true }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
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
  };

  if (memoryLoading) return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
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

        {/* Section 1: Identité */}
        <Section icon={User} title="Identité">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom complet" name="full_name" placeholder="Jean Dupont" />
            <Field label="Profession / Titre" name="profession" placeholder="CEO, Coach, Consultant…" />
            <Field label="Entreprise" name="company" placeholder="Ma Société SAS" />
            <Field label="Industrie / Secteur" name="industry" placeholder="Tech, Finance, Marketing…" />
          </div>
        </Section>

        {/* Section 2: Expertise & Réalisations */}
        <Section icon={Award} title="Expertise & Réalisations">
          <Field label="Domaines d'expertise" name="expertise_areas" textarea placeholder="Marketing digital, leadership, IA, growth hacking…" />
          <Field label="Réalisations majeures" name="achievements" textarea placeholder="Projets créés, entreprises fondées, résultats obtenus, prix, certifications…" />
          <Field label="Résultats marquants (chiffres)" name="key_results" textarea placeholder="Ex: +200% de CA en 1 an, 10k abonnés en 3 mois, 50 clients accompagnés…" />
          <Field label="Méthodologie unique" name="unique_methodology" textarea placeholder="Votre approche ou méthode distinctive qui vous différencie…" />
          <Field label="Ce qui vous différencie" name="differentiators" textarea placeholder="Pourquoi les gens devraient vous suivre plutôt qu'un autre ?" />
        </Section>

        {/* Section 3: Audience & Marché */}
        <Section icon={Users} title="Audience & Marché">
          <Field label="Audience cible" name="target_audience" textarea placeholder="Entrepreneurs, dirigeants PME, marketeurs B2B…" />
          <Field label="Problèmes de votre audience" name="audience_pain_points" textarea placeholder="Quels sont les problèmes, frustrations, besoins de votre audience ?" />
          <Field label="Concurrents / Leaders dans votre domaine" name="competitors" textarea placeholder="Qui sont les leaders ou concurrents que vous observez ?" />
        </Section>

        {/* Section 4: Objectifs LinkedIn */}
        <Section icon={Target} title="Objectifs LinkedIn">
          <Field label="Objectifs LinkedIn (qualitatifs)" name="linkedin_goals" textarea placeholder="Devenir leader d'opinion, générer des leads, recruter…" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Objectif abonnés" name="target_followers" type="number" placeholder="10000" />
            <Field label="Objectif connexions" name="target_connections" type="number" placeholder="5000" />
            <Field label="Objectif taux d'engagement (%)" name="target_engagement_rate" type="number" placeholder="5" />
            <Field label="Horizon temporel" name="goal_timeline" placeholder="3 mois, 6 mois, 1 an…" />
          </div>
        </Section>

        {/* Section 5: Stratégie de contenu */}
        <Section icon={Megaphone} title="Stratégie de contenu">
          <TagInput label="Piliers de contenu stratégiques" field="content_pillars" value={pillarInput} onChange={setPillarInput} placeholder="Leadership, IA, Entrepreneuriat…" />
          <TagInput label="Thèmes de contenu" field="content_themes" value={themeInput} onChange={setThemeInput} placeholder="Productivité, mindset, vente…" />
          <TagInput label="Mots-clés de marque" field="brand_keywords" value={keywordInput} onChange={setKeywordInput} placeholder="Innovation, impact, authentique…" />
          <TagInput label="Types de contenu" field="content_types" value={typeInput} onChange={setTypeInput} placeholder="Storytelling, liste, carrousel…" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fréquence de publication" name="posting_frequency" placeholder="3 fois par semaine" />
            <Field label="Formats préférés" name="preferred_formats" placeholder="Texte long, carrousel, vidéo…" />
          </div>
          <Field label="Ton de voix" name="tone_of_voice" placeholder="Professionnel mais accessible, inspirant, provocateur…" />
          <Field label="Style de CTA préféré" name="call_to_action_style" textarea placeholder="Question ouverte, invitation au commentaire, partage d'expérience…" />
        </Section>

        {/* Section 6: Histoire & Valeurs */}
        <Section icon={BookOpen} title="Histoire & Valeurs">
          <Field label="Histoire personnelle" name="personal_story" textarea placeholder="Votre parcours, moments décisifs, anecdotes marquantes…" />
          <Field label="Valeurs fondamentales" name="values" textarea placeholder="Authenticité, excellence, partage, innovation…" />
          <Field label="Ambitions" name="ambitions" textarea placeholder="Vos ambitions à court et long terme…" />
        </Section>

        {/* Section 7: Offres & Notes */}
        <Section icon={Briefcase} title="Offres & Notes">
          <Field label="Offres & services" name="offers_description" textarea placeholder="Décrivez vos offres, produits ou services…" />
          <Field label="Notes additionnelles" name="additional_notes" textarea placeholder="Toute information utile supplémentaire…" />
        </Section>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Mes Photos</CardTitle>
            <CardDescription>Photos personnelles à utiliser dans vos publications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Description (optionnelle)</Label>
                <Input value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} placeholder="Photo de conférence, portrait pro…" />
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
                    {p.description && <p className="text-xs p-1.5 text-muted-foreground truncate">{p.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune photo ajoutée</p>
            )}
          </CardContent>
        </Card>

        {/* Ideas with images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Idées de publications</CardTitle>
            <CardDescription>Notez vos idées avec des images optionnelles, elles seront utilisées lors de la génération</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea value={newIdea} onChange={e => setNewIdea(e.target.value)} placeholder="Écrire une idée de publication…" rows={2} />
              <div className="flex gap-2">
                <Button onClick={() => addIdea()} disabled={!newIdea.trim() || ideaUploading}><Plus className="h-4 w-4" /> Ajouter</Button>
                <Label htmlFor="idea-image-upload" className="cursor-pointer">
                  <Button variant="outline" asChild disabled={!newIdea.trim() || ideaUploading}>
                    <span><ImageIcon className="h-4 w-4" /> Ajouter avec image</span>
                  </Button>
                </Label>
                <input id="idea-image-upload" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addIdea(f); }} />
              </div>
            </div>
            {ideasLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : ideas && ideas.length > 0 ? (
              <div className="space-y-2">
                {ideas.map(idea => (
                  <div key={idea.id} className="flex items-start gap-3 rounded-lg border p-3">
                    {(idea as any).image_url && (
                      <img src={(idea as any).image_url} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                    )}
                    <p className="flex-1 text-sm">{idea.idea_text}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {idea.used && <Badge variant="outline" className="text-xs">Utilisée</Badge>}
                      {!(idea as any).image_url && (
                        <Label htmlFor={`idea-img-${idea.id}`} className="cursor-pointer">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <span><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          </Button>
                        </Label>
                      )}
                      <input id={`idea-img-${idea.id}`} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadIdeaImage(idea.id, f); }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteIdea(idea.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune idée enregistrée</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
