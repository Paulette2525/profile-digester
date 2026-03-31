import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

const CONTENT_TYPES = [
  { value: "auto", label: "Auto (mix)", emoji: "🔄" },
  { value: "news", label: "News & Veille", emoji: "📰" },
  { value: "tutorial", label: "Tutoriel", emoji: "🎓" },
  { value: "viral", label: "Viral", emoji: "🔥" },
  { value: "storytelling", label: "Storytelling", emoji: "📖" },
];

interface DailyPlanCardProps {
  dailyPlan: Record<string, string>;
  activeDays: string[];
  onSave: (plan: Record<string, string>) => void;
}

export function DailyPlanCard({ dailyPlan, activeDays, onSave }: DailyPlanCardProps) {
  const handleChange = (day: string, value: string) => {
    onSave({ ...dailyPlan, [day]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Planning hebdomadaire
        </CardTitle>
        <CardDescription>Définissez le type de contenu dominant par jour. "Auto" utilise le mix configuré.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DAYS.filter(d => activeDays.includes(d.key)).map((day) => (
            <div key={day.key} className="flex items-center gap-2">
              <span className="text-sm font-medium w-20 shrink-0">{day.label}</span>
              <Select
                value={dailyPlan[day.key] || "auto"}
                onValueChange={(v) => handleChange(day.key, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {activeDays.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Activez d'abord des jours ci-dessus</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
