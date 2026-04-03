import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SchedulePopoverProps {
  onSchedule: (date: Date) => void;
  existingDate?: string | null;
  children?: React.ReactNode;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

export default function SchedulePopover({ onSchedule, existingDate, children }: SchedulePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    existingDate ? new Date(existingDate) : undefined
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    existingDate ? String(new Date(existingDate).getHours()) : "9"
  );

  const handleConfirm = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setHours(parseInt(selectedHour), 0, 0, 0);
    onSchedule(d);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button size="sm" variant="outline">
            <CalendarIcon className="h-3.5 w-3.5" />
            {existingDate ? "Replanifier" : "Planifier"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("p-0 pointer-events-auto")}
            locale={fr}
          />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedHour} onValueChange={setSelectedHour}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Heure" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" size="sm" onClick={handleConfirm} disabled={!selectedDate}>
            {selectedDate
              ? `Planifier le ${format(selectedDate, "d MMM", { locale: fr })} à ${selectedHour}h`
              : "Choisir une date"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
