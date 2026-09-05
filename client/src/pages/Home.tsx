import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDays, parseISO } from "date-fns";
import { ArrowRight, Bookmark, CalendarDays, Globe2, Heart, History, MapPin, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { t } from "@shared/i18n";
import { normalizeGuestCount, isValidStayRange, buildSearchResultsPath } from "@/lib/homeSearch";
import { LiveComparisonPrice } from "@/components/LiveComparisonPrice";
import { StayDatePicker } from "@/components/StayDatePicker"; 
import { SavedSearch, clearRecentSearches, loadRecentSearches, removeRecentSearch, saveRecentSearch } from "@/lib/savedSearch";

const CITY_METADATA: Record<string, Record<"en" | "hi", { description: string; seasonalHighlight: string }>> = {
  Bengaluru: { en: { description: "A green, design-forward base for slow mornings and easy city plans.", seasonalHighlight: "Rainy months suit unhurried weekends and cozy indoor stays." }, hi: { description: "धीमी सुबहों और आसान शहर की योजनाओं के लिए हरा-भरा, आधुनिक ठिकाना।", seasonalHighlight: "बारिश का मौसम आरामदेह इनडोर ठहराव और शांत सप्ताहांत के लिए अच्छा है।" } },
  Mumbai: { en: { description: "A lively coastal city for long lunches, late walks, and a full calendar.", seasonalHighlight: "Winter brings especially comfortable days for exploring by the water." }, hi: { description: "लंबे लंच, शाम की सैर और हमेशा व्यस्त रहने वाले कार्यक्रमों का जीवंत तटीय शहर।", seasonalHighlight: "सर्दियों में समुद्र के किनारे घूमने के लिए मौसम खासा सुहावना रहता है।" } },
  Delhi: { en: { description: "A layered capital where old neighbourhoods meet new restaurants and galleries.", seasonalHighlight: "Cooler months are a natural fit for long heritage walks." }, hi: { description: "पुराने इलाकों, नए रेस्तरां और गैलरियों से सजा बहुरंगी राजधानी शहर।", seasonalHighlight: "ठंडे महीने लंबे विरासत-भ्रमण के लिए सबसे सहज रहते हैं।" } },
  Goa: { en: { description: "A softer pace of palms, open-air meals, and stays made for switching off.", seasonalHighlight: "The dry season is ideal for beach time and outdoor plans." }, hi: { description: "ताड़ के पेड़ों, खुले आसमान के नीचे भोजन और सुकून भरे ठहरावों की धीमी दुनिया।", seasonalHighlight: "सूखा मौसम समुद्र तट और बाहरी गतिविधियों के लिए उपयुक्त है।" } },
  Hyderabad: { en: { description: "A warm, flavourful city where heritage courtyards meet a modern creative scene.", seasonalHighlight: "Milder winter days are well suited to food trails and old-city walks." }, hi: { description: "विरासत भरे आंगनों और आधुनिक रचनात्मक माहौल वाला स्वादिष्ट, गर्मजोशी से भरा शहर।", seasonalHighlight: "सर्दियों के सुहावने दिन खाने की खोज और पुराने शहर की सैर के लिए अच्छे हैं।" } },
  Jaipur: { en: { description: "A rose-toned escape of craft, courtyards, and thoughtful slow travel.", seasonalHighlight: "Cooler months make palace visits and market walks especially comfortable." }, hi: { description: "शिल्प, आंगनों और धीमी यात्रा से भरा गुलाबी रंगों वाला ठिकाना।", seasonalHighlight: "ठंडे महीने महलों और बाजारों में घूमने के लिए खासे आरामदायक रहते हैं।" } },
  Kolkata: { en: { description: "A soulful city of books, food, architecture, and generous everyday rituals.", seasonalHighlight: "Autumn and winter bring an easy rhythm for neighbourhood discoveries." }, hi: { description: "किताबों, भोजन, वास्तुकला और रोज़मर्रा की आत्मीय परंपराओं से भरा शहर।", seasonalHighlight: "शरद और सर्दियों में मोहल्लों को आराम से जानने का अच्छा समय रहता है।" } },
  Chennai: { en: { description: "A coastal base for music, morning walks, and deeply rooted local culture.", seasonalHighlight: "The cooler season is a comfortable window for the coast and temple trails." }, hi: { description: "संगीत, सुबह की सैर और गहरी स्थानीय संस्कृति वाला तटीय ठिकाना।", seasonalHighlight: "ठंडा मौसम तट और मंदिरों की यात्राओं के लिए आरामदायक रहता है।" } },
  Pune: { en: { description: "A relaxed, leafy city with independent cafés, hills, and an unhurried pace.", seasonalHighlight: "The monsoon turns the surrounding hills especially lush and inviting." }, hi: { description: "स्वतंत्र कैफे, पहाड़ियों और धीमी रफ्तार वाला शांत, हराभरा शहर।", seasonalHighlight: "मानसून में आसपास की पहाड़ियां हरी-भरी और बेहद आकर्षक हो जाती हैं।" } },
  Udaipur: { en: { description: "A luminous lakeside retreat for artful stays, quiet mornings, and long dinners.", seasonalHighlight: "Winter evenings are made for lake views and open-air plans." }, hi: { description: "कला, शांत सुबहों और लंबी शामों के लिए झीलों से घिरा उजला ठिकाना।", seasonalHighlight: "सर्दियों की शामें झील के नज़ारों और खुले आसमान के नीचे योजनाओं के लिए बनी हैं।" } },
};

function cityMetadata(city: string, locale: "en" | "hi") {
  return CITY_METADATA[city]?.[locale] ?? { description: locale === "hi" ? `${city} में आपके अगले ठहराव के लिए Domora की स्वीकृत जगह।` : `A Domora-approved starting point for your next ${city} stay.`, seasonalHighlight: locale === "hi" ? "मौसम के अनुसार उपलब्धता देखें और अपनी यात्रा की योजना बनाएं।" : "Check current availability for the best seasonal fit." };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"EN" | "हि">("EN");
  const [guests, setGuests] = useState(2);
  const [showGuests, setShowGuests] = useState(false);
  const [maxPrice, setMaxPrice] = useState(15000);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("free");
  const [dateError, setDateError] = useState("");
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SavedSearch[]>([]);
  const [saveNotice, setSaveNotice] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const copyLanguage = language === "EN" ? "en" : "hi";
  const searchCopy = copyLanguage === "hi" ? {
    whereTitle: "कहाँ जाना है?", searchHint: "उपलब्ध ठहरावों की तुलना करने के लिए तारीखें और मेहमान जोड़ें।", prices: "कीमतें INR में", locationPlaceholder: "शहर या पिनकोड", checkIn: "चेक-इन", checkOut: "चेक-आउट", selectDate: "तारीख चुनें", guestSuffix: "मेहमान", moreFilters: "अधिक फ़िल्टर:", maxNightly: "अधिकतम प्रति रात कीमत", freeCancellation: "मुफ़्त रद्दीकरण", anyPolicy: "कोई भी नीति", locationSuggestions: "स्थान सुझाव", lookingUp: "शहर या पिनकोड खोज रहे हैं…", lookupError: "स्थान खोज फिलहाल उपलब्ध नहीं है। आप फिर भी शहर के नाम से खोज सकते हैं।", noLocations: "कोई मिलती-जुलती जगह नहीं मिली।", recent: "हाल की खोजें", clear: "सब साफ़ करें", flexible: "लचीली तारीखें", addDates: "तारीखें जोड़ें", searchStays: "ठहराव खोजें", change: "बदलें", saveSearch: "यह खोज सहेजें", savedForLater: "बाद के लिए सहेजा गया", savedToast: "आपकी खोज सहेज ली गई है", removedToast: "सहेजी गई खोज हटा दी गई है", restoredToast: "हाल की खोज बहाल कर दी गई है", clearedToast: "हाल की खोजें साफ़ कर दी गई हैं", destinationEyebrow: "आपके अगले सफर के लिए चुना गया", destinationHeading: "गंतव्य के अनुसार देखें", destinationDescription: "वे जगहें देखें जहाँ Domora के स्वीकृत ठहराव पहले से उपलब्ध हैं।", collection: "कलेक्शन", collections: "कलेक्शन", approvedStay: "स्वीकृत ठहराव", approvedStays: "स्वीकृत ठहराव", seasonalNote: "मौसमी जानकारी:", viewStaysIn: "में ठहराव देखें", inspirationEyebrow: "थोड़ी प्रेरणा", staysHeading: "अपना अगला ठहराव खोजें", staysDescription: "स्वीकृत ठहरावों का चुना हुआ संग्रह, लाइव कीमत और कमरे की जानकारी के साथ।", viewAllStays: "सभी ठहराव देखें", checkingStays: "उपलब्ध ठहराव जाँचे जा रहे हैं…", refreshError: "अभी ठहराव अपडेट नहीं हो सके। कृपया फिर कोशिश करें।", noMatch: "इस खोज से मेल खाते स्वीकृत ठहराव अभी नहीं हैं।", exploreRooms: "कमरे देखें", liveChecked: "लाइव कीमत जाँची गई", comparisonUnavailable: "तुलना डेटा उपलब्ध नहीं है", comparedFrom: "तुलना स्रोत", lowestTotal: "सबसे कम कुल", domoraRates: "Domora दरें", taxesFees: "कर और शुल्क"
  } : {
    whereTitle: "Where are you going?", searchHint: "Add dates and guests to compare available stays.", prices: "Prices shown in INR", locationPlaceholder: "City or pincode", checkIn: "Check-in", checkOut: "Check-out", selectDate: "Select a date", guestSuffix: "guests", moreFilters: "More filters:", maxNightly: "Max nightly price", freeCancellation: "Free cancellation", anyPolicy: "Any policy", locationSuggestions: "Location suggestions", lookingUp: "Looking up that city or pincode…", lookupError: "Location lookup is temporarily unavailable. You can still search by city text.", noLocations: "No matching locations found.", recent: "Recent searches", clear: "Clear all", flexible: "Flexible dates", addDates: "Add dates", searchStays: "Search stays", change: "Change", saveSearch: "Save this search", savedForLater: "Saved for later", savedToast: "Your search has been saved", removedToast: "Saved search removed", restoredToast: "Recent search restored", clearedToast: "Recent searches cleared", destinationEyebrow: "Curated for your next escape", destinationHeading: "Explore by destination", destinationDescription: "Browse the places where Domora already has approved stays ready to explore.", collection: "collection", collections: "collections", approvedStay: "approved stay", approvedStays: "approved stays", seasonalNote: "Seasonal note:", viewStaysIn: "View stays in", inspirationEyebrow: "A little inspiration", staysHeading: "Find your next stay", staysDescription: "A small, considered collection of approved stays with live price context and room details ready when you are.", viewAllStays: "View all stays", checkingStays: "Checking available stays…", refreshError: "We could not refresh stays right now. Please try again.", noMatch: "No approved stays match this search yet.", exploreRooms: "Explore rooms", liveChecked: "Live price checked", comparisonUnavailable: "Comparison data unavailable", comparedFrom: "Compared from", lowestTotal: "lowest total", domoraRates: "Domora rates", taxesFees: "taxes & fees"
  };
  const pageCopy = copyLanguage === "hi" ? {
    verifiedBadge: "बेहतर ठहराव, समझदारी से तय कीमतें", heroTitle: "ऐसा ठहराव खोजें", heroAccent: "जो आपकी योजना के मुताबिक हो।", heroDescription: "शहर, तारीख और मेहमानों के आधार पर स्वीकृत ठहराव खोजें। Domora विवरण जाँचता है और बुकिंग से पहले पूरी कीमत स्पष्ट रखता है।", calmEyebrow: "योजना बनाने का आसान तरीका", calmTitle: "उन विवरणों से शुरुआत करें जो ठहराव को सही बनाते हैं।", calmOne: "सिर्फ शुरुआती दर नहीं, पूरी कीमत की तुलना करें।", calmTwo: "कमरा चुनने से पहले रद्दीकरण की शर्तें देखें।", calmThree: "तैयार होने पर सीधे Domora से बुक करें।", signIn: "साइन इन", whyEyebrow: "Domora क्यों", whyTitle: "बुकिंग का सबसे अच्छा हिस्सा है—आपका ध्यान रखा जाना।", howOneTitle: "जो ज़रूरी है, बताएं", howOneBody: "तारीखें, लोग, कमरे की ज़रूरत और रद्दीकरण की सुविधा से शुरुआत करें।", howTwoTitle: "हम सावधानी से तुलना करते हैं", howTwoBody: "तुलनीय कमरे, अनिवार्य शुल्क और लाइव उपलब्धता को प्रतिबद्ध होने से पहले जाँचा जाता है।", howThreeTitle: "स्पष्टता के साथ बुक करें", howThreeBody: "पूरी कीमत और आपके ठहराव के साथ आने वाली नीति देखें।", anywhere: "कोई भी जगह", guests: "मेहमान", partnerWithUs: "हमारे साथ पार्टनर बनें", wishlist: "विशलिस्ट", about: "हमारे बारे में", languagePair: "English / हिंदी", stayIntelligently: "समझदारी से ठहरें।"
  } : {
    verifiedBadge: "Better stays, intelligently priced", heroTitle: "Find a stay that", heroAccent: "fits your plan.", heroDescription: "Search verified stays by city, dates, and guests. Domora checks the details and keeps the full price clear before you book.", calmEyebrow: "A calmer way to plan", calmTitle: "Start with the details that make a stay feel right.", calmOne: "Compare the full stay price, not just the headline rate.", calmTwo: "See cancellation terms before you choose a room.", calmThree: "Book directly with Domora when you are ready.", signIn: "Sign in", whyEyebrow: "Why Domora", whyTitle: "The best part of booking is feeling looked after.", howOneTitle: "Tell us what matters", howOneBody: "Dates, people, room needs, cancellation comfort. Start with the details.", howTwoTitle: "We compare carefully", howTwoBody: "Comparable rooms, mandatory fees, and live availability are checked before you commit.", howThreeTitle: "Book with clarity", howThreeBody: "See the full breakdown and the policy that comes with your stay.", anywhere: "Anywhere", guests: "guests", partnerWithUs: "Partner with us", wishlist: "Wishlist", about: "About", languagePair: "English / हिंदी", stayIntelligently: "Stay intelligently."
  };
  const { data: listings = [], isLoading, isError } = trpc.hotels.list.useQuery({ city: query || undefined, guests, maxPriceInr: maxPrice ? String(maxPrice) : undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined, cancellationPolicy: cancellationPolicy || undefined });
  const geocodeQuery = trpc.hotels.geocode.useQuery({ query }, { enabled: query.trim().length >= 2 });
  const destinationCollections = useMemo(() => {
    const byCity = new Map<string, { city: string; count: number; image: string | null; description: string; seasonalHighlight: string }>();
    listings.forEach((listing) => {
      const current = byCity.get(listing.city);
      const metadata = cityMetadata(listing.city, copyLanguage);
      byCity.set(listing.city, { city: listing.city, count: (current?.count ?? 0) + 1, image: current?.image ?? listing.coverImageUrl, description: metadata.description, seasonalHighlight: metadata.seasonalHighlight });
    });
    return Array.from(byCity.values()).sort((a, b) => b.count - a.count);
  }, [copyLanguage, listings]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
    const latest = loadRecentSearches()[0];
    if (latest) {
      setQuery(latest.city);
      setGuests(latest.guests);
      setMaxPrice(latest.maxPriceInr);
      setCheckIn(latest.checkIn);
      setCheckOut(latest.checkOut);
      setCancellationPolicy(latest.cancellationPolicy);
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !heroRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setShowStickySearch(!entry.isIntersecting), { threshold: 0.1 });
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2400);
  };

  const applySavedSearch = (saved: SavedSearch) => {
    setQuery(saved.city);
    setGuests(saved.guests);
    setMaxPrice(saved.maxPriceInr);
    setCheckIn(saved.checkIn);
    setCheckOut(saved.checkOut);
    setCancellationPolicy(saved.cancellationPolicy);
    document.getElementById("stays")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(searchCopy.restoredToast);
  };

  const handleManualSave = () => {
    setRecentSearches(saveRecentSearch({ city: query, guests, maxPriceInr: maxPrice, checkIn, checkOut, cancellationPolicy }));
    setSaveNotice(searchCopy.savedForLater);
    showToast(searchCopy.savedToast);
  };

  const runSearch = () => {
    if (!isValidStayRange(checkIn, checkOut)) {
      setDateError("Check-out must be after check-in.");
      return;
    }
    setDateError("");
    setRecentSearches(saveRecentSearch({ city: query, guests, maxPriceInr: maxPrice, checkIn, checkOut, cancellationPolicy }));
    setLocation(buildSearchResultsPath({ city: query, guests, maxPriceInr: maxPrice, checkIn, checkOut, cancellationPolicy }));
  };

  return <div className="min-h-screen overflow-x-hidden bg-[#f7f5f0] text-[#202320]">
    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-black/10 text-white backdrop-blur-md">
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl transition group-hover:bg-white/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-serif text-2xl font-semibold tracking-[-0.05em]">domora</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
          <a href="#stays" className="transition hover:text-white">{t(copyLanguage, "explore")}</a>
          <a href="#how-it-works" className="transition hover:text-white">{t(copyLanguage, "howItWorks")}</a>
          <Link href="/partner" className="transition hover:text-white">{t(copyLanguage, "listHotel")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:flex" onClick={() => setLanguage(language === "EN" ? "हि" : "EN")}>
            <Globe2 className="mr-2 h-4 w-4" />{language}
          </Button>
          <Link href="/login?returnTo=%2F">
            <Button size="sm" className="rounded-full bg-white px-5 text-[#234a44] shadow-lg hover:bg-white/90 active:scale-[.97]">{pageCopy.signIn}</Button>
          </Link>
        </div>
      </div>
    </header>

    <main>
      {toastMessage && <div role="status" className="fixed right-4 top-24 z-[60] flex items-center gap-2 rounded-2xl border border-[#c9dbc5] bg-white/95 px-4 py-3 text-sm font-semibold text-[#47704f] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300"><Bookmark className="h-4 w-4" />{toastMessage}</div>}

      <section ref={heroRef} className="relative isolate min-h-[760px] overflow-visible px-5 pb-12 pt-32 sm:px-8 lg:min-h-[820px] lg:px-12 lg:pt-40">
        <img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=2200&q=88" alt="Luxury hotel interior" className="absolute inset-0 -z-30 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-20 bg-[#102f2a]/65" />
        <div className="absolute inset-0 -z-20 bg-gradient-to-r from-[#102f2a]/90 via-[#102f2a]/55 to-[#102f2a]/25" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-[#f7f5f0] via-[#f7f5f0]/60 to-transparent" />

        <div className="mx-auto max-w-[1440px]">
          <div className="grid items-end gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
            <div className="max-w-3xl text-white">
              <Badge className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white shadow-lg backdrop-blur-xl hover:bg-white/15">
                <Sparkles className="mr-2 h-3.5 w-3.5" />{pageCopy.verifiedBadge}
              </Badge>
              <h1 className="mt-7 font-serif text-[clamp(3.5rem,7vw,7.4rem)] font-medium leading-[.88] tracking-[-.075em]">
                {pageCopy.heroTitle}<br /><em className="font-normal text-[#f0c4a7]">{pageCopy.heroAccent}</em>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">{pageCopy.heroDescription}</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[.13em] text-white/75">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">Verified stays</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">Clear total pricing</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">Live comparison</span>
              </div>
            </div>

            <aside className="hidden rounded-[30px] border border-white/20 bg-white/10 p-7 text-white shadow-2xl backdrop-blur-2xl lg:block">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#f0c4a7]">{pageCopy.calmEyebrow}</p>
              <p className="mt-4 max-w-sm font-serif text-3xl leading-tight tracking-[-.04em]">{pageCopy.calmTitle}</p>
              <div className="mt-7 divide-y divide-white/15">
                <div className="flex items-start gap-3 py-4 first:pt-0"><span className="mt-0.5 text-sm font-semibold text-[#f0c4a7]">01</span><p className="text-sm leading-6 text-white/72">{pageCopy.calmOne}</p></div>
                <div className="flex items-start gap-3 py-4"><span className="mt-0.5 text-sm font-semibold text-[#f0c4a7]">02</span><p className="text-sm leading-6 text-white/72">{pageCopy.calmTwo}</p></div>
                <div className="flex items-start gap-3 py-4 last:pb-0"><span className="mt-0.5 text-sm font-semibold text-[#f0c4a7]">03</span><p className="text-sm leading-6 text-white/72">{pageCopy.calmThree}</p></div>
              </div>
            </aside>
          </div>

          <div className="relative z-30 mt-12 rounded-[30px] border border-white/50 bg-white/90 p-2 shadow-[0_30px_80px_rgba(10,37,32,.28)] backdrop-blur-2xl sm:p-3 lg:mt-16">
            <div className="flex flex-col gap-2 border-b border-[#e8e4dc] px-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div><p className="text-sm font-semibold text-[#234a44]">{searchCopy.whereTitle}</p><p className="mt-0.5 text-xs text-[#8a928b]">{searchCopy.searchHint}</p></div>
              <p className="text-xs font-medium text-[#8a928b]">{searchCopy.prices}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-transparent bg-[#f5f4ef] px-4 py-3 transition focus-within:border-[#cadbc7] focus-within:bg-[#eef5e9]">
                <MapPin className="h-5 w-5 shrink-0 text-[#bc765a]" />
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#879087]">{t(copyLanguage, "where")}</span><Input ref={locationInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchCopy.locationPlaceholder} className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0" /></span>
              </label>
              <StayDatePicker label={searchCopy.checkIn} value={checkIn} onChange={setCheckIn} placeholder={searchCopy.selectDate} describedBy={dateError ? "search-date-error" : undefined} />
              <StayDatePicker label={searchCopy.checkOut} value={checkOut} onChange={setCheckOut} placeholder={searchCopy.selectDate} minDate={checkIn ? addDays(parseISO(checkIn), 1) : undefined} describedBy={dateError ? "search-date-error" : undefined} />
              <button type="button" onClick={() => setShowGuests(!showGuests)} className="relative flex min-h-14 items-center gap-3 rounded-2xl bg-[#f5f4ef] px-4 py-3 text-left transition hover:bg-[#eef5e9]">
                <Users className="h-5 w-5 shrink-0 text-[#bc765a]" /><span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#879087]">{t(copyLanguage, "guests")}</span><span className="text-sm text-[#606760]">{guests} {searchCopy.guestSuffix}</span></span>
                {showGuests && <span className="absolute right-0 top-[66px] z-50 flex items-center gap-3 rounded-2xl border border-[#e4dfd5] bg-white p-3 shadow-2xl"><button type="button" className="h-9 w-9 rounded-full bg-[#eef5e9] text-lg" onClick={(event) => { event.stopPropagation(); setGuests(normalizeGuestCount(guests - 1)); }}>−</button><span className="min-w-5 text-center text-sm font-semibold">{guests}</span><button type="button" className="h-9 w-9 rounded-full bg-[#eef5e9] text-lg" onClick={(event) => { event.stopPropagation(); setGuests(normalizeGuestCount(guests + 1)); }}>+</button></span>}
              </button>
              <Button type="button" onClick={runSearch} className="min-h-14 rounded-2xl bg-[#c87553] px-7 text-white shadow-lg hover:bg-[#b9684b] active:scale-[.97]"><Search className="mr-2 h-5 w-5" />{searchCopy.searchStays}</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
              <span className="text-xs font-semibold text-[#879087]">{searchCopy.moreFilters}</span>
              <label className="flex items-center gap-2 text-xs text-[#606760]">{searchCopy.maxNightly}<Input type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(Math.max(0, Number(event.target.value)))} className="h-8 w-24 rounded-lg border-[#e4dfd5] bg-[#fbfaf8] px-2 text-xs" /></label>
              <select value={cancellationPolicy} onChange={(event) => setCancellationPolicy(event.target.value)} className="h-8 rounded-lg border border-[#e4dfd5] bg-[#fbfaf8] px-2 text-xs text-[#606760]"><option value="free">{searchCopy.freeCancellation}</option><option value="">{searchCopy.anyPolicy}</option></select>
              <button type="button" onClick={handleManualSave} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cadbc7] bg-[#eef5e9] px-3 text-xs font-semibold text-[#47704f] transition hover:bg-[#dcebd7] active:scale-[.98]" aria-label={searchCopy.saveSearch}><Bookmark className="h-3.5 w-3.5" />{saveNotice || searchCopy.saveSearch}</button>
            </div>
          </div>

          {dateError && <p id="search-date-error" role="alert" className="relative z-30 mt-3 rounded-xl bg-[#fff2ed] px-3 py-2 text-sm font-medium text-[#a96449]">{dateError}</p>}
          {query.trim().length >= 2 && <div className="relative z-40 mt-3 rounded-2xl border border-[#e4dfd5] bg-white p-3 shadow-2xl"><p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[.12em] text-[#8a928b]">{searchCopy.locationSuggestions}</p>{geocodeQuery.isLoading ? <p className="px-3 py-2 text-sm text-[#7a837a]">{searchCopy.lookingUp}</p> : geocodeQuery.isError ? <p className="px-3 py-2 text-sm text-[#a96449]">{searchCopy.lookupError}</p> : geocodeQuery.data?.length ? <div className="grid gap-1 sm:grid-cols-2">{geocodeQuery.data.map((place) => <button type="button" key={`${place.lat}-${place.lon}`} onClick={() => setQuery(place.display_name.split(",")[0] ?? place.display_name)} className="rounded-xl px-3 py-2 text-left text-sm text-[#536057] hover:bg-[#eef5e9]">{place.display_name}</button>)}</div> : <p className="px-3 py-2 text-sm text-[#7a837a]">{searchCopy.noLocations}</p>}</div>}
          {recentSearches.length > 0 && <div className="relative z-30 mt-4 rounded-2xl border border-[#d9e3d4] bg-[#eef5e9]/95 p-4 shadow-lg backdrop-blur"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#47704f]"><History className="h-3.5 w-3.5" />{searchCopy.recent}</p><button type="button" onClick={() => { setRecentSearches(clearRecentSearches()); showToast(searchCopy.clearedToast); }} className="text-xs font-semibold text-[#7b837b] hover:text-[#234a44]">{searchCopy.clear}</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{recentSearches.map((saved) => <div key={saved.id} className="flex items-center gap-2 rounded-xl border border-[#d9e3d4] bg-white px-3 py-2"><button type="button" onClick={() => applySavedSearch(saved)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-[#354139]">{saved.city || "Anywhere"}</span><span className="mt-0.5 block truncate text-xs text-[#7b837b]">{saved.checkIn && saved.checkOut ? `${saved.checkIn} → ${saved.checkOut}` : searchCopy.flexible} · {saved.guests} {searchCopy.guestSuffix}</span></button><button type="button" aria-label={`Remove ${saved.city || "recent search"}`} onClick={() => { setRecentSearches(removeRecentSearch(saved.id)); showToast(searchCopy.removedToast); }} className="rounded-full p-1.5 text-[#9aa29b] hover:bg-[#eef5e9] hover:text-[#234a44]"><X className="h-4 w-4" /></button></div>)}</div></div>}
        </div>
      </section>

      <section id="stays" className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-[#bc765a]">{searchCopy.inspirationEyebrow}</p><h2 className="font-serif text-4xl tracking-[-.05em] text-[#234a44] sm:text-5xl">{searchCopy.staysHeading}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#707970]">{searchCopy.staysDescription}</p></div>
          <button type="button" onClick={() => window.scrollTo({ top: document.getElementById("stays")?.offsetTop ?? 0, behavior: "smooth" })} className="flex items-center gap-2 text-sm font-semibold text-[#5f6b61] hover:text-[#234a44]">{searchCopy.viewAllStays} <ArrowRight className="h-4 w-4" /></button>
        </div>
        {isLoading ? <div className="rounded-[30px] border border-[#e4dfd5] bg-white px-6 py-24 text-center text-[#6b756d] shadow-sm">{searchCopy.checkingStays}</div> : isError ? <div className="rounded-[30px] border border-dashed border-[#d8d3c8] bg-white px-6 py-24 text-center text-[#6b756d]">{searchCopy.refreshError}</div> : listings.length === 0 ? <div className="rounded-[30px] border border-dashed border-[#d8d3c8] bg-white px-6 py-24 text-center text-[#6b756d]">{searchCopy.noMatch} {copyLanguage === "hi" ? "किसी दूसरे शहर या पिनकोड से खोजें।" : "Try another city or pincode."}</div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{listings.map((item) => <Link href={`/hotel/${item.slug}`} key={item.id} className="group block overflow-hidden rounded-[28px] border border-[#e8e4dc] bg-white shadow-[0_12px_35px_rgba(35,74,68,.06)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(35,74,68,.13)]"><div className="relative aspect-[4/3] overflow-hidden bg-[#e8e4dc]"><img src={item.coverImageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1100&q=88"} alt={item.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.055]" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" /><span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#47704f] shadow-lg backdrop-blur"><ShieldCheck className="h-3.5 w-3.5" />Domora verified</span><span className="absolute right-4 top-4 rounded-full bg-black/20 p-2.5 text-white backdrop-blur-md"><Heart className="h-4 w-4" /></span><div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-white"><p className="font-serif text-2xl leading-tight tracking-[-.02em]">{item.name}</p><p className="mt-1 text-sm text-white/75">{item.city}</p></div></div><div className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#354139]">{searchCopy.exploreRooms}</span>{item.lowestSupplierOffer && <span className="rounded-full bg-[#eef5e9] px-2 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#47704f]">{searchCopy.liveChecked}</span>}</div><LiveComparisonPrice hotelId={item.id} roomId={item.rooms?.[0]?.id} checkIn={checkIn} checkOut={checkOut} guests={guests} />{item.lowestSupplierOffer ? <p className="mt-1 text-xs text-[#7c857c]">{searchCopy.comparedFrom} {item.lowestSupplierOffer.providerName}{item.lowestSupplierOffer.isDemo ? (copyLanguage === "hi" ? " · डेमो ऑफर" : " · demo offer") : ""}</p> : <p className="mt-1 text-xs text-[#7c857c]">{searchCopy.comparisonUnavailable}</p>}{item.lowestSupplierOffer && <p className="mt-1 text-[11px] leading-4 text-[#858d84]">{item.lowestSupplierOffer.currency === "EUR" ? "€" : "₹"}{item.lowestSupplierOffer.nightlyPriceInr.toLocaleString("en-IN")}/night · {item.lowestSupplierOffer.currency === "EUR" ? "€" : "₹"}{(item.lowestSupplierOffer.taxesInr + item.lowestSupplierOffer.feesInr).toLocaleString("en-IN")} {searchCopy.taxesFees}</p>}</div>{item.lowestSupplierOffer ? <span className="shrink-0 text-right"><strong className="block text-lg text-[#bc765a]">{item.lowestSupplierOffer.currency === "EUR" ? "€" : "₹"}{item.lowestSupplierOffer.totalPriceInr.toLocaleString("en-IN")}</strong><small className="block text-[10px] text-[#858d84]">{searchCopy.lowestTotal} · {new Date(item.lowestSupplierOffer.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></span> : <span className="shrink-0 text-xs font-semibold uppercase tracking-[.1em] text-[#858d84]">{searchCopy.domoraRates}</span>}</div></div></Link>)}</div>}
      </section>

      <section id="destinations" className="border-y border-[#e8e4dc] bg-[#efede7] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-[#bc765a]">{searchCopy.destinationEyebrow}</p><h2 className="font-serif text-4xl tracking-[-.05em] text-[#234a44] sm:text-5xl">{searchCopy.destinationHeading}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#707970]">{searchCopy.destinationDescription}</p></div><span className="text-sm text-[#7b837b]">{destinationCollections.length} {destinationCollections.length === 1 ? searchCopy.collection : searchCopy.collections}</span></div>
          {destinationCollections.length === 0 ? <div className="mt-8 rounded-[30px] border border-dashed border-[#d8d3c8] bg-white px-6 py-12 text-center text-sm text-[#6b756d]">Curated destinations will appear as approved stays are published.</div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{destinationCollections.map((collection) => <button type="button" key={collection.city} onClick={() => { setQuery(collection.city); document.getElementById("stays")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="group relative min-h-[320px] overflow-hidden rounded-[30px] bg-[#234a44] text-left shadow-[0_15px_35px_rgba(35,74,68,.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(35,74,68,.2)] active:scale-[.99]"><img src={collection.image || `https://picsum.photos/seed/domora-${encodeURIComponent(collection.city)}/900/700`} alt={`${collection.city} destination collection`} className="absolute inset-0 h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-[1.06]" /><div className="absolute inset-0 bg-gradient-to-t from-[#102f2a] via-[#102f2a]/15 to-transparent" /><div className="relative flex min-h-[320px] flex-col justify-end p-6 text-white"><span className="mb-3 inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] backdrop-blur">{collection.count} {collection.count === 1 ? searchCopy.approvedStay : searchCopy.approvedStays}</span><span className="font-serif text-3xl tracking-[-.03em]">{collection.city}</span><span className="mt-2 max-w-sm text-sm leading-5 text-white/82">{collection.description}</span><span className="mt-3 translate-y-2 border-t border-white/20 pt-3 text-xs leading-5 text-white/75 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"><span className="font-semibold text-[#f0c4a7]">{searchCopy.seasonalNote}</span> {collection.seasonalHighlight}</span><span className="mt-2 text-sm text-white/75">{searchCopy.viewStaysIn} {collection.city} <ArrowRight className="ml-1 inline h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></button>)}</div>}
        </div>
      </section>

      <section id="how-it-works" className="bg-[#183f39] px-5 py-16 text-[#eef5e9] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-[#d7a084]">{pageCopy.whyEyebrow}</p><h2 className="font-serif text-5xl leading-[.95] tracking-[-.05em]">{pageCopy.whyTitle}</h2></div>
          <div className="grid gap-8 sm:grid-cols-[1.1fr_.9fr_1.1fr]"><div className="border-t border-white/20 pt-5"><span className="font-serif text-4xl text-[#d7a084]">01</span><h3 className="mt-5 text-lg font-semibold">{pageCopy.howOneTitle}</h3><p className="mt-3 text-sm leading-6 text-white/65">{pageCopy.howOneBody}</p></div><div className="border-t border-white/20 pt-5"><span className="font-serif text-4xl text-[#d7a084]">02</span><h3 className="mt-5 text-lg font-semibold">{pageCopy.howTwoTitle}</h3><p className="mt-3 text-sm leading-6 text-white/65">{pageCopy.howTwoBody}</p></div><div className="border-t border-white/20 pt-5"><span className="font-serif text-4xl text-[#d7a084]">03</span><h3 className="mt-5 text-lg font-semibold">{pageCopy.howThreeTitle}</h3><p className="mt-3 text-sm leading-6 text-white/65">{pageCopy.howThreeBody}</p></div></div>
        </div>
      </section>
    </main>

    {showStickySearch && <div className="fixed inset-x-0 bottom-4 z-50 px-4 md:hidden"><button type="button" onClick={() => { heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => locationInputRef.current?.focus(), 350); }} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-left shadow-[0_14px_36px_rgba(35,74,68,.2)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300"><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#879087]">{searchCopy.searchStays}</span><span className="mt-0.5 block truncate text-sm font-medium text-[#234a44]">{query || pageCopy.anywhere} · {checkIn && checkOut ? `${checkIn} to ${checkOut}` : searchCopy.addDates} · {guests} {pageCopy.guests}</span></span><span className="shrink-0 rounded-full bg-[#234a44] px-3 py-1.5 text-xs font-semibold text-white">{searchCopy.change}</span></button></div>}

    <footer className="border-t border-[#e8e4dc] bg-[#fbfaf8] px-5 py-9 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 text-sm text-[#7b837b] sm:flex-row"><span>© 2026 Domora. {pageCopy.stayIntelligently}</span><div className="flex flex-wrap gap-5"><Link href="/partner" className="hover:text-[#234a44]">{pageCopy.partnerWithUs}</Link><Link href="/wishlist" className="hover:text-[#234a44]">{pageCopy.wishlist}</Link><a href="#how-it-works" className="hover:text-[#234a44]">{pageCopy.about}</a><span>{pageCopy.languagePair}</span></div></div></footer>
  </div>;
}
