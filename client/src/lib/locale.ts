export type AppLocale = "en-IN" | "hi-IN";

export function formatInr(value: number | string | null | undefined, locale: AppLocale = "en-IN") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatIndianDate(value: Date | string | number, locale: AppLocale = "en-IN") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatIndianDateRange(checkIn: Date | string | number, checkOut: Date | string | number, locale: AppLocale = "en-IN") {
  return `${formatIndianDate(checkIn, locale)} – ${formatIndianDate(checkOut, locale)}`;
}
