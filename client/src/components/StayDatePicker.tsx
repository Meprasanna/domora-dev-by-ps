import React from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type StayDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minDate?: Date;
  describedBy?: string;
};

function valueToDate(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function StayDatePicker({ label, value, onChange, placeholder, minDate = startOfDay(new Date()), describedBy }: StayDatePickerProps) {
  const selected = valueToDate(value);
  const [open, setOpen] = React.useState(false);
  const displayValue = selected ? format(selected, "EEE, d MMM") : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}${selected ? `: ${format(selected, "d MMMM yyyy")}` : ""}`}
          aria-describedby={describedBy}
          className="group flex min-h-[60px] w-full items-center gap-3 rounded-xl bg-[#f7f6f2] px-4 py-3 text-left outline-none transition-colors hover:bg-[#f0eee8] focus-visible:ring-2 focus-visible:ring-[#47704f] focus-visible:ring-offset-2"
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-[#bc765a]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[.12em] text-[#879087]">{label}</span>
            <span className={cn("mt-0.5 block truncate text-sm", selected ? "text-[#354139]" : "text-[#8a928b]")}>{displayValue}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#879087] transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl border-[#e4dfd5] bg-white p-0 shadow-[0_18px_50px_rgba(35,74,68,.18)]">
        <div className="border-b border-[#eeeae2] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#bc765a]">Choose your {label.toLowerCase()} date</p>
          <p className="mt-1 text-sm text-[#687168]">Flexible plans start with clear dates.</p>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          disabled={{ before: minDate }}
          initialFocus
          captionLayout="dropdown"
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 2}
          className="[--cell-size:2.45rem] p-4"
          classNames={{
            day: "text-[#354139]",
            today: "bg-[#eef5e9] text-[#234a44] rounded-lg",
            selected: "bg-[#234a44] text-white rounded-lg",
            outside: "text-[#c7cdc5]",
            disabled: "text-[#c7cdc5] opacity-50",
          }}
        />
        {value && (
          <div className="flex items-center justify-between border-t border-[#eeeae2] px-4 py-3">
            <span className="flex items-center gap-2 text-xs text-[#687168]"><Check className="h-3.5 w-3.5 text-[#47704f]" />{format(selected!, "EEEE, d MMMM yyyy")}</span>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#a96449] hover:text-[#8f513e]"><X className="h-3.5 w-3.5" />Clear</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
