import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const contentTypes = [
  { value: "tutorial", label: "📚 Tutoriel", color: "bg-blue-100 text-blue-800" },
  { value: "viral", label: "🔥 Viral", color: "bg-orange-100 text-orange-800" },
  { value: "storytelling", label: "📖 Storytelling", color: "bg-purple-100 text-purple-800" },
  { value: "news", label: "📰 News / Veille", color: "bg-green-100 text-green-800" },
  { value: "autre", label: "💡 Autre", color: "bg-muted text-muted-foreground" },
];

const typeMap = Object.fromEntries(contentTypes.map((t) => [t.value, t]));

export default function IdeasPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [type, setType] = useState("autre");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resourceUrl, setResourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["content-ideas", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_ideas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("used", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("user-photos").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("content_ideas").insert({
        user_id: user.id,
        idea_text: text.trim(),
        content_type: type,
        image_url: imageUrl,
        resource_url: resourceUrl.trim() || null,
      } as any);
      if (error) throw error;
      setText("");
      setType("autre");
      setImageFile(null);
      setResourceUrl("");
      qc.invalidateQueries({ queryKey: ["content-ideas"] });
      toast({ title: "Idée enregistrée ✨" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-ideas"] });
      toast({ title: "Idée supprimée" });
    },
  });

  return (
    <>
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Boîte à idées
          </h1>
          <p className="text-muted-foreground text-sm">
            Vos idées seront automatiquement utilisées par l'Autopilote pour générer des publications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nouvelle idée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de contenu</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image (optionnel)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  {imageFile && <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lien / Ressource à partager (optionnel)</Label>
                <Input
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="https://... (lien guide, PDF, outil…)"
                />
                <p className="text-[10px] text-muted-foreground">Si renseigné, une règle DM automatique sera créée pour distribuer ce lien</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Décrivez votre idée</Label>
              <Textarea
                placeholder="Ex: Faire un tuto sur comment utiliser GPT-5 pour automatiser la prospection LinkedIn..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
              />
            </div>
            <Button onClick={handleSubmit} disabled={!text.trim() || submitting}>
              {submitting ? "Enregistrement..." : "Ajouter l'idée"}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Idées en attente ({ideas.length})
          </h2>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : ideas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune idée en attente</p>
                <p className="text-xs mt-1">Ajoutez vos premières idées ci-dessus</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {ideas.map((idea: any) => {
                const cfg = typeMap[idea.content_type] || typeMap.autre;
                return (
                  <Card key={idea.id} className="group">
                    <CardContent className="p-4 flex gap-4">
                      {idea.image_url && (
                        <img src={idea.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge className={`${cfg.color} text-[10px] mb-1`}>{cfg.label}</Badge>
                            <p className="text-sm">{idea.idea_text}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMutation.mutate(idea.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(idea.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
