import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Save, Loader2, Upload, X, Plus, Lightbulb, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function MemoirePage() {
  const queryClient = useQueryClient();

  // ---- Memory form state ----
  const [form, setForm] = useState({
    full_name: "", profession: "", company: "", industry: "",
    target_audience: "", offers_description: "", ambitions: "", values: "",
    tone_of_voice: "", content_themes: [] as string[], content_types: [] as string[],
    personal_story: "", expertise_areas: "", posting_frequency: "",
    preferred_formats: "", additional_notes: "",
  });
  const [themeInput, setThemeInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  const { data: memory, isLoading: memoryLoading } = useQuery({
    queryKey: ["user-memory"],
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
      });
    }
  }, [memory]);

  const saveMemory = useMutation({
    mutationFn: async () => {
      if (memory?.id) {
        const { error } = await supabase.from("user_memory").update(form).eq("id", memory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_memory").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Mémoire sauvegardée !");
      queryClient.invalidateQueries({ queryKey: ["user-memory"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTheme = () => {
    if (themeInput.trim() && !form.content_themes.includes(themeInput.trim())) {
      setForm(f => ({ ...f, content_themes: [...f.content_themes, themeInput.trim()] }));
      setThemeInput("");
    }
  };

  const addType = () => {
    if (typeInput.trim() && !form.content_types.includes(typeInput.trim())) {
      setForm(f => ({ ...f, content_types: [...f.content_types, typeInput.trim()] }));
      setTypeInput("");
    }
  };

  // ---- Photos ----
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ["user-photos"],
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
      });
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
    queryFn: async () => {
      const { data, error } = await supabase.from("content_ideas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newIdea, setNewIdea] = useState("");

  const addIdea = async () => {
    if (!newIdea.trim()) return;
    const { error } = await supabase.from("content_ideas").insert({ idea_text: newIdea.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Idée ajoutée !");
    setNewIdea("");
    queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
  };

  const deleteIdea = async (id: string) => {
    await supabase.from("content_ideas").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
  };

  const Field = ({ label, name, textarea = false, placeholder = "" }: { label: string; name: keyof typeof form; textarea?: boolean; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {textarea ? (
        <Textarea id={name} value={form[name] as string} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} placeholder={placeholder} rows={3} />
      ) : (
        <Input id={name} value={form[name] as string} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} placeholder={placeholder} />
      )}
    </div>
  );

  if (memoryLoading) return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Brain className="h-6 w-6" /> Mémoire</h1>
            <p className="text-muted-foreground">Vos informations personnelles pour des publications authentiques</p>
          </div>
          <Button onClick={() => saveMemory.mutate()} disabled={saveMemory.isPending}>
            {saveMemory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
        </div>

        {/* Profile form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mon Profil</CardTitle>
            <CardDescription>Ces informations seront utilisées pour personnaliser vos publications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nom complet" name="full_name" placeholder="Jean Dupont" />
              <Field label="Profession" name="profession" placeholder="Consultant en marketing digital" />
              <Field label="Entreprise" name="company" placeholder="Ma Société SAS" />
              <Field label="Industrie" name="industry" placeholder="Marketing / Tech / Finance…" />
            </div>
            <Field label="Audience cible" name="target_audience" textarea placeholder="Entrepreneurs, dirigeants PME, marketeurs…" />
            <Field label="Offres & services" name="offers_description" textarea placeholder="Décrivez vos offres, produits ou services…" />
            <Field label="Ambitions & objectifs" name="ambitions" textarea placeholder="Vos objectifs sur LinkedIn et dans votre activité…" />
            <Field label="Valeurs" name="values" textarea placeholder="Vos valeurs fondamentales…" />
            <Field label="Ton de voix" name="tone_of_voice" placeholder="Professionnel mais accessible, inspirant…" />
            <Field label="Histoire personnelle" name="personal_story" textarea placeholder="Votre parcours, anecdotes marquantes…" />
            <Field label="Domaines d'expertise" name="expertise_areas" textarea placeholder="Vos compétences et domaines de prédilection…" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fréquence souhaitée" name="posting_frequency" placeholder="3 fois par semaine" />
              <Field label="Formats préférés" name="preferred_formats" placeholder="Storytelling, listes, carrousels…" />
            </div>
            <Field label="Notes additionnelles" name="additional_notes" textarea placeholder="Toute information utile supplémentaire…" />

            {/* Themes */}
            <div className="space-y-1.5">
              <Label>Thèmes de contenu</Label>
              <div className="flex gap-2">
                <Input value={themeInput} onChange={e => setThemeInput(e.target.value)} placeholder="Ajouter un thème…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTheme())} />
                <Button variant="outline" size="icon" onClick={addTheme}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.content_themes.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, content_themes: f.content_themes.filter(x => x !== t) }))} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Content types */}
            <div className="space-y-1.5">
              <Label>Types de contenu</Label>
              <div className="flex gap-2">
                <Input value={typeInput} onChange={e => setTypeInput(e.target.value)} placeholder="Ajouter un type…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addType())} />
                <Button variant="outline" size="icon" onClick={addType}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.content_types.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, content_types: f.content_types.filter(x => x !== t) }))} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Uploader
                    </span>
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

        {/* Ideas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Idées de publications</CardTitle>
            <CardDescription>Notez vos idées, elles seront utilisées lors de la génération</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea value={newIdea} onChange={e => setNewIdea(e.target.value)} placeholder="Écrire une idée de publication…" rows={2} className="flex-1" />
              <Button onClick={addIdea} disabled={!newIdea.trim()} className="self-end"><Plus className="h-4 w-4" /> Ajouter</Button>
            </div>
            {ideasLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : ideas && ideas.length > 0 ? (
              <div className="space-y-2">
                {ideas.map(idea => (
                  <div key={idea.id} className="flex items-start gap-2 rounded-lg border p-3">
                    <p className="flex-1 text-sm">{idea.idea_text}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {idea.used && <Badge variant="outline" className="text-xs">Utilisée</Badge>}
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
