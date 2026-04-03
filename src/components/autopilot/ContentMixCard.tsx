import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Newspaper, GraduationCap, Flame, BookOpen } from "lucide-react";
import { useCallback, useMemo } from "react";

const CONTENT_TYPES = [
  {
    key: "news",
    label: "News & Veille",
    description: "Actualités, analyses, comparatifs (via Perplexity)",
    icon: Newspaper,
    color: "text-blue-500",
  },
  {
    key: "tutorial",
    label: "Tuto",
    description: "Guides step-by-step, comment faire X avec Y",
    icon: GraduationCap,
    color: "text-emerald-500",
  },
  {
    key: "viral",
    label: "Viral",
    description: "Hooks percutants, opinions tranchées, engagement max",
    icon: Flame,
    color: "text-orange-500",
  },
  {
    key: "storytelling",
    label: "Storytelling",
    description: "Histoire personnelle, parcours, leçons apprises",
    icon: BookOpen,
    color: "text-purple-500",
  },
] as const;

type ContentMix = { news: number; tutorial: number; viral: number; storytelling: number };

interface ContentMixCardProps {
  contentMix: ContentMix;
  onSave: (mix: ContentMix) => void;
}

export function ContentMixCard({ contentMix, onSave }: ContentMixCardProps) {
  const activeTypes = useMemo(
    () => (Object.keys(contentMix) as (keyof ContentMix)[]).filter((k) => contentMix[k] > 0),
    [contentMix]
  );

  const toggleType = useCallback(
    (key: keyof ContentMix, enabled: boolean) => {
      const updated = { ...contentMix };
      if (!enabled) {
        // Disable: set to 0, redistribute among remaining active
        const freed = updated[key];
        updated[key] = 0;
        const others = (Object.keys(updated) as (keyof ContentMix)[]).filter((k) => k !== key && updated[k] > 0);
        if (others.length > 0) {
          const perOther = Math.floor(freed / others.length);
          let remainder = freed - perOther * others.length;
          others.forEach((k) => {
            updated[k] += perOther;
            if (remainder > 0) { updated[k]++; remainder--; }
          });
        }
      } else {
        // Enable: give 25% from active types proportionally
        const activeKeys = (Object.keys(updated) as (keyof ContentMix)[]).filter((k) => updated[k] > 0);
        const share = 25;
        if (activeKeys.length > 0) {
          const totalActive = activeKeys.reduce((s, k) => s + updated[k], 0);
          activeKeys.forEach((k) => {
            const take = Math.round((updated[k] / totalActive) * share);
            updated[k] = Math.max(0, updated[k] - take);
          });
        }
        updated[key] = share;
        // Fix sum to 100
        const sum = Object.values(updated).reduce((s, v) => s + v, 0);
        if (sum !== 100 && activeKeys.length > 0) {
          const biggest = [...activeKeys, key].reduce((a, b) => (updated[a] >= updated[b] ? a : b));
          updated[biggest] += 100 - sum;
        }
      }
      onSave(updated);
    },
    [contentMix, onSave]
  );

  const handleChange = useCallback(
    (key: keyof ContentMix, newValue: number) => {
      const others = (Object.keys(contentMix) as (keyof ContentMix)[]).filter(
        (k) => k !== key && contentMix[k] > 0
      );
      const oldValue = contentMix[key];
      const diff = newValue - oldValue;
      const othersTotal = others.reduce((s, k) => s + contentMix[k], 0);

      const updated = { ...contentMix, [key]: newValue };

      if (othersTotal > 0) {
        others.forEach((k) => {
          const ratio = contentMix[k] / othersTotal;
          updated[k] = Math.max(0, Math.round(contentMix[k] - diff * ratio));
        });
      }

      const sum = Object.values(updated).reduce((s, v) => s + v, 0);
      if (sum !== 100 && others.length > 0) {
        const biggest = others.reduce((a, b) => (updated[a] >= updated[b] ? a : b));
        updated[biggest] += 100 - sum;
      }

      onSave(updated);
    },
    [contentMix, onSave]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4" /> Mix de contenu
        </CardTitle>
        <CardDescription>
          Activez/désactivez les types et ajustez la répartition (total = 100%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CONTENT_TYPES.map(({ key, label, description, icon: Icon, color }) => {
          const isActive = contentMix[key as keyof ContentMix] > 0;
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => toggleType(key as keyof ContentMix, checked)}
                  />
                  <Icon className={`h-4 w-4 ${isActive ? color : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${!isActive ? "text-muted-foreground" : ""}`}>{label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums w-10 text-right">
                  {contentMix[key as keyof ContentMix]}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1 pl-12">{description}</p>
              {isActive && (
                <Slider
                  value={[contentMix[key as keyof ContentMix]]}
                  onValueChange={([v]) => handleChange(key as keyof ContentMix, v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              )}
            </div>
          );
        })}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Total : {Object.values(contentMix).reduce((s, v) => s + v, 0)}% — {activeTypes.length} type{activeTypes.length > 1 ? "s" : ""} actif{activeTypes.length > 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  );
}
