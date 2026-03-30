import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Sparkles, ArrowRight, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarSlot {
  date: string;
  dayLabel: string;
  type: string;
  theme: string;
  scheduled_at: string;
}

interface EditorialCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  strategyVariant?: any;
}

const DAYS_OF_WEEK = [
  { key: 1, label: "Lun" },
  { key: 2, label: "Mar" },
  { key: 3, label: "Mer" },
  { key: 4, label: "Jeu" },
  { key: 5, label: "Ven" },
  { key: 6, label: "Sam" },
  { key: 0, label: "Dim" },
];

const POST_TYPES = ["Storytelling", "Viral", "Tuto", "Social Proof", "News"];

const typeColors: Record<string, string> = {
  Storytelling: "bg-pink-500/10 text-pink-600",
  Viral: "bg-red-500/10 text-red-600",
  Tuto: "bg-blue-500/10 text-blue-600",
  "Social Proof": "bg-amber-500/10 text-amber-600",
  News: "bg-emerald-500/10 text-emerald-600",
};

export function EditorialCalendarDialog({ open, onOpenChange, analysisId, strategyVariant }: EditorialCalendarDialogProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 5]); // Lun, Mar, Mer, Ven
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [step, setStep] = useState<"config" | "preview">("config");

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const generateCalendarSlots = () => {
    setIsGeneratingCalendar(true);
    const weeks = period === "weekly" ? 1 : 4;
    const slots: CalendarSlot[] = [];
    const today = new Date();
    const start = startOfWeek(addDays(today, 1), { weekStartsOn: 1 });

    // Get content types from strategy or default rotation
    const contentTypes = strategyVariant?.content_pillars?.map((p: any) => p.content_type || p.name) || POST_TYPES;
    const themes = strategyVariant?.themes_to_explore || [];

    let typeIndex = 0;
    let themeIndex = 0;

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(addWeeks(start, w), d);
        const dayOfWeek = date.getDay();
        if (!activeDays.includes(dayOfWeek)) continue;

        for (let p = 0; p < postsPerDay; p++) {
          const type = contentTypes[typeIndex % contentTypes.length];
          const theme = themes.length > 0 ? themes[themeIndex % themes.length] : type;
          typeIndex++;
          themeIndex++;

          // Schedule at 9h + p hours
          const scheduledDate = new Date(date);
          scheduledDate.setHours(9 + p * 3, 0, 0, 0);

          slots.push({
            date: format(date, "EEEE d MMMM", { locale: fr }),
            dayLabel: format(date, "EEE dd/MM", { locale: fr }),
            type,
            theme,
            scheduled_at: scheduledDate.toISOString(),
          });
        }
      }
    }

    setCalendarSlots(slots);
    setStep("preview");
    setIsGeneratingCalendar(false);
  };

  const handleGeneratePosts = async () => {
    if (!analysisId) {
      toast.error("Aucune analyse disponible");
      return;
    }
    setIsGeneratingPosts(true);
    try {
      const calendarData = calendarSlots.map(s => ({
        date: s.date,
        type: s.type,
        theme: s.theme,
        scheduled_at: s.scheduled_at,
      }));

      const { data, error } = await supabase.functions.invoke("generate-posts", {
        body: { analysis_id: analysisId, calendar: calendarData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.posts?.length || 0} posts générés et planifiés !`);
      onOpenChange(false);
      navigate("/posts-suggeres");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  const totalPosts = activeDays.length * postsPerDay * (period === "weekly" ? 1 : 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Planifier mon calendrier éditorial
          </DialogTitle>
          <DialogDescription>
            Configurez votre planning puis validez avant la génération
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5">
            {/* Period */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Période</Label>
              <RadioGroup value={period} onValueChange={(v) => setPeriod(v as "weekly" | "monthly")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="cursor-pointer">Hebdomadaire (1 semaine)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Mensuel (4 semaines)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Posts per day */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Posts par jour</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={postsPerDay}
                onChange={(e) => setPostsPerDay(Math.max(1, Math.min(3, Number(e.target.value))))}
                className="w-24"
              />
            </div>

            {/* Active days */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jours de publication</Label>
              <div className="flex flex-wrap gap-3">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.key} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={activeDays.includes(day.key)}
                      onCheckedChange={() => toggleDay(day.key)}
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="py-3 text-center">
                <p className="text-sm">
                  <span className="font-bold text-primary text-lg">{totalPosts}</span>{" "}
                  posts à générer sur {period === "weekly" ? "1 semaine" : "4 semaines"}
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={generateCalendarSlots}
              disabled={activeDays.length === 0 || isGeneratingCalendar}
              className="w-full"
            >
              {isGeneratingCalendar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              Générer le calendrier
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("config")}>
              ← Modifier la configuration
            </Button>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {calendarSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <span className="text-xs font-medium min-w-[80px] text-muted-foreground">{slot.dayLabel}</span>
                  <Badge variant="outline" className={`text-xs ${typeColors[slot.type] || ""}`}>
                    {slot.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate flex-1">{slot.theme}</span>
                </div>
              ))}
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-3 text-center">
                <p className="text-sm font-medium">{calendarSlots.length} posts prêts à être générés</p>
              </CardContent>
            </Card>

            <Button
              onClick={handleGeneratePosts}
              disabled={isGeneratingPosts || !analysisId}
              className="w-full"
            >
              {isGeneratingPosts ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Génération en cours…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Valider et générer les posts <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>

            {!analysisId && (
              <p className="text-xs text-destructive text-center">⚠️ Aucune analyse disponible. Lancez d'abord une analyse dans Traitement.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
