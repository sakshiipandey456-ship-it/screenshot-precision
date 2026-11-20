import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isoDate, parseDate } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Calendar date picker. Value is always a YYYY-MM-DD string.
 * Renders a hidden input named `name` so it works inside plain <form> + FormData.
 */
export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Pick a date",
  minDate,
  maxDate,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [inner, setInner] = useState(value ?? defaultValue);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (value !== undefined) setInner(value);
  }, [value]);
  const selected = inner ? parseDate(inner) : undefined;
  const disabled = [...(minDate ? [{ before: parseDate(minDate) }] : []), ...(maxDate ? [{ after: parseDate(maxDate) }] : [])];
  const now = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={inner} />}
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn("w-full justify-start gap-2 px-3 font-normal", !inner && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{inner ? formatDate(inner) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (maxDate && parseDate(maxDate) < now ? parseDate(maxDate) : now)}
          onSelect={(d) => {
            if (!d) return;
            const iso = isoDate(d);
            setInner(iso);
            onChange?.(iso);
            setOpen(false);
          }}
          disabled={disabled}
          captionLayout="dropdown"
          startMonth={new Date(now.getFullYear() - 10, 0)}
          endMonth={new Date(now.getFullYear() + 10, 11)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
