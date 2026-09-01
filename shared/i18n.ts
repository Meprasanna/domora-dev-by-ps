export type Locale = "en" | "hi";

export const messages = {
  en: { explore: "Explore stays", howItWorks: "How Domora works", listHotel: "List your hotel", search: "Search", guests: "Guests", dates: "Dates", where: "Where", partner: "For hotel partners", secureBooking: "Secure booking" },
  hi: { explore: "ठहरने की जगहें देखें", howItWorks: "Domora कैसे काम करता है", listHotel: "अपना होटल जोड़ें", search: "खोजें", guests: "मेहमान", dates: "तारीखें", where: "कहाँ", partner: "होटल पार्टनर्स के लिए", secureBooking: "सुरक्षित बुकिंग" },
} as const;

export function t(locale: Locale, key: keyof typeof messages.en) {
  return messages[locale][key];
}
