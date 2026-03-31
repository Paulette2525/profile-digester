import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Newspaper, GraduationCap, Flame, BookOpen } from "lucide-react";
import { useCallback } from "react";

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
  const handleChange = useCallback(
    (key: keyof ContentMix, newValue: number) => {
      const others = Object.keys(contentMix).filter((k) => k !== key) as (keyof ContentMix)[];
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

      // Ensure sum = 100
      const sum = Object.values(updated).reduce((s, v) => s + v, 0);
      if (sum !== 100) {
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
          Répartissez les types de publications générées (total = 100%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CONTENT_TYPES.map(({ key, label, description, icon: Icon, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-sm font-bold tabular-nums w-10 text-right">
                {contentMix[key as keyof ContentMix]}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{description}</p>
            <Slider
              value={[contentMix[key as keyof ContentMix]]}
              onValueChange={([v]) => handleChange(key as keyof ContentMix, v)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        ))}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Total : {Object.values(contentMix).reduce((s, v) => s + v, 0)}%
        </div>
      </CardContent>
    </Card>
  );
}
