import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Linkedin } from "lucide-react";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms" as any)
        .select("*")
        .eq("form_slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-lead-form", {
        body: { form_slug: slug, data: formData },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Formulaire introuvable</p>
            <p className="text-sm text-muted-foreground mt-2">Ce formulaire n'existe pas ou a été désactivé.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-medium">Merci !</p>
            <p className="text-sm text-muted-foreground">Votre réponse a bien été envoyée. Nous vous recontacterons bientôt.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = (form.fields_config || []) as any[];

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Linkedin className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>{form.name}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field: any) => (
              <div key={field.name} className="space-y-1.5">
                <Label className="text-sm">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    required={field.required}
                    rows={3}
                  />
                ) : (
                  <Input
                    type={field.type === "phone" ? "tel" : field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Envoyer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
