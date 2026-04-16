import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb, CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const contentTypes = [
  { value: "tutorial", label: "📚 Tutoriel" },
  { value: "viral", label: "🔥 Viral" },
  { value: "storytelling", label: "📖 Storytelling" },
  { value: "news", label: "📰 News / Veille" },
  { value: "autre", label: "💡 Autre" },
];

export default function PublicIdeaPage() {
  const { userId } = useParams<{ userId: string }>();
  const [text, setText] = useState("");
  const [type, setType] = useState("autre");
  const [resourceUrl, setResourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim() || !userId) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("submit-idea", {
        body: {
          user_id: userId,
          idea_text: text.trim(),
          content_type: type,
          resource_url: resourceUrl.trim() || null,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setText("");
    setType("autre");
    setResourceUrl("");
    setSubmitted(false);
    setError("");
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Idée enregistrée ! ✨</h1>
          <p className="text-muted-foreground">Votre idée a bien été ajoutée à la boîte à idées.</p>
          <Button onClick={handleReset} variant="outline" className="mt-4">
            Soumettre une autre idée
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Lightbulb className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Nouvelle idée</h1>
          <p className="text-muted-foreground text-sm">
            Notez votre idée de publication rapidement
          </p>
        </div>

        <div className="space-y-4">
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
            <Label>Décrivez votre idée *</Label>
            <Textarea
              placeholder="Ex: Faire un tuto sur comment utiliser GPT-5 pour automatiser..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Lien / Ressource (optionnel)</Label>
            <Input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="text-base"
            />
            <p className="text-[10px] text-muted-foreground">
              Si renseigné, une règle DM sera automatiquement créée
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="w-full h-12 text-base"
          >
            {submitting ? "Envoi..." : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer l'idée
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
