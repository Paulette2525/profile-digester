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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Copy, Trash2, Loader2, ExternalLink, Filter, StickyNote, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FormField {
  name: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  label: string;
  required: boolean;
  options?: string[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  contacted: { label: "Contacté", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  qualified: { label: "Qualifié", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  converted: { label: "Converti", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  lost: { label: "Perdu", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

function FormBuilder({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([
    { name: "name", type: "text", label: "Nom complet", required: true },
    { name: "email", type: "email", label: "Email", required: true },
    { name: "company", type: "text", label: "Entreprise", required: false },
    { name: "message", type: "textarea", label: "Message", required: false },
  ]);

  const addField = () => {
    setFields([...fields, { name: `field_${fields.length}`, type: "text", label: "", required: false }]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_forms" as any).insert({
        user_id: userId,
        name,
        description: description || null,
        fields_config: fields,
        form_slug: generateSlug(name || "form"),
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-forms"] });
      toast({ title: "Formulaire créé ✅" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du formulaire</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contact commercial" />
      </div>
      <div className="space-y-2">
        <Label>Description (optionnel)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Décrivez l'objectif de ce formulaire..." />
      </div>

      <div className="space-y-3">
        <Label>Champs du formulaire</Label>
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
            <Input
              value={field.label}
              onChange={(e) => setFields(prev => prev.map((f, j) => j === i ? { ...f, label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_") } : f))}
              placeholder="Label"
              className="flex-1 h-8 text-sm"
            />
            <Select value={field.type} onValueChange={(v: any) => setFields(prev => prev.map((f, j) => j === i ? { ...f, type: v } : f))}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texte</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Téléphone</SelectItem>
                <SelectItem value="textarea">Paragraphe</SelectItem>
              </SelectContent>
            </Select>
            <Switch checked={field.required} onCheckedChange={(v) => setFields(prev => prev.map((f, j) => j === i ? { ...f, required: v } : f))} />
            <span className="text-[10px] text-muted-foreground w-12">{field.required ? "Requis" : "Optionnel"}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFields(prev => prev.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addField} className="w-full border-dashed text-xs">
          <Plus className="h-3 w-3 mr-1" /> Ajouter un champ
        </Button>
      </div>

      <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="w-full">
        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Créer le formulaire
      </Button>
    </div>
  );
}

function LeadNotesDialog({ lead, onUpdate }: { lead: any; onUpdate: (notes: string) => void }) {
  const [notes, setNotes] = useState(lead.notes || "");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><StickyNote className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Notes — {(lead.data as any)?.name || lead.email || "Lead"}</DialogTitle></DialogHeader>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Ajoutez vos notes..." />
        <Button onClick={() => onUpdate(notes)} className="w-full">Sauvegarder</Button>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("leads");
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ["lead-forms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["leads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["leads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const toggleFormActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("lead_forms" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-forms"] }),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_forms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-forms"] });
      toast({ title: "Formulaire supprimé" });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads" as any).update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const updateLeadNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("leads" as any).update({ notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Notes sauvegardées" });
    },
  });

  const copyFormUrl = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié ! 📋" });
  };

  const filteredLeads = leads.filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (formFilter !== "all" && l.form_id !== formFilter) return false;
    return true;
  });

  const leadsByStatus = {
    new: leads.filter((l: any) => l.status === "new").length,
    contacted: leads.filter((l: any) => l.status === "contacted").length,
    qualified: leads.filter((l: any) => l.status === "qualified").length,
    converted: leads.filter((l: any) => l.status === "converted").length,
    lost: leads.filter((l: any) => l.status === "lost").length,
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Leads & Formulaires
          </h1>
          <p className="text-muted-foreground text-sm">
            Créez des formulaires et gérez vos leads entrants en temps réel
          </p>
        </div>
      </div>

      {/* KPI mini bar */}
      <div className="grid gap-3 grid-cols-5">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="p-3 rounded-lg border text-center">
            <p className="text-xl font-bold">{leadsByStatus[key as keyof typeof leadsByStatus]}</p>
            <Badge className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="forms">Formulaires ({forms.length})</TabsTrigger>
        </TabsList>

        {/* Leads tab */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formFilter} onValueChange={setFormFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Formulaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formulaires</SelectItem>
                {forms.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leadsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLeads.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun lead pour le moment. Créez un formulaire et partagez le lien !</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom / Email</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead: any) => {
                    const data = (lead.data || {}) as any;
                    const formName = forms.find((f: any) => f.id === lead.form_id)?.name || "—";
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{data.name || data.nom || "—"}</p>
                            <p className="text-xs text-muted-foreground">{lead.email || data.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{lead.company || data.company || data.entreprise || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{formName}</Badge></TableCell>
                        <TableCell>
                          <Select value={lead.status} onValueChange={(v) => updateLeadStatus.mutate({ id: lead.id, status: v })}>
                            <SelectTrigger className="h-7 w-[110px] text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <LeadNotesDialog lead={lead} onUpdate={(notes) => updateLeadNotes.mutate({ id: lead.id, notes })} />
                            {lead.linkedin_url && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Forms tab */}
        <TabsContent value="forms" className="space-y-4">
          <Dialog open={showFormBuilder} onOpenChange={setShowFormBuilder}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nouveau formulaire</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Créer un formulaire</DialogTitle></DialogHeader>
              {user && <FormBuilder userId={user.id} onClose={() => setShowFormBuilder(false)} />}
            </DialogContent>
          </Dialog>

          {forms.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun formulaire. Créez votre premier formulaire de capture de leads.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {forms.map((form: any) => (
                <Card key={form.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{form.name}</p>
                        <Badge variant={form.is_active ? "default" : "secondary"} className="text-[10px]">
                          {form.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {((form.fields_config as any[]) || []).length} champs
                        </Badge>
                      </div>
                      {form.description && <p className="text-xs text-muted-foreground mt-1">{form.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Créé le {format(new Date(form.created_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <a href={`/form/${form.form_slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" /> Voir
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => copyFormUrl(form.form_slug)}>
                        <Copy className="h-3 w-3 mr-1" /> Copier le lien
                      </Button>
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(v) => toggleFormActive.mutate({ id: form.id, is_active: v })}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteForm.mutate(form.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
