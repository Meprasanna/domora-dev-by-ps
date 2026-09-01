import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, LockKeyhole, Users } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatInr, formatIndianDateRange } from "@/lib/locale";

export default function Booking() {
  const [, params] = useRoute("/book/:hotelId/:roomId");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [message, setMessage] = useState("");
  const nights = checkIn && checkOut ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)) : 0;
  const { data: room } = trpc.rooms.byId.useQuery({ id: Number(params?.roomId ?? 0) }, { enabled: Boolean(params?.roomId) });
  const { data: quote } = trpc.pricing.quote.useQuery({ nightlyRateInr: Number(room?.basePriceInr ?? 0), nights: Math.max(1, nights) }, { enabled: Boolean(room) && nights > 0 });
  const createDraft = trpc.bookings.createDraft.useMutation();
  const createCheckout = trpc.bookings.createCheckout.useMutation();
  const submit = async () => {
    if (!isAuthenticated) { startLogin(); return; }
    if (!params?.hotelId || !params.roomId || nights < 1) { setMessage("Choose valid check-in and check-out dates."); return; }
    try {
      const result = await createDraft.mutateAsync({ hotelId: Number(params.hotelId), roomId: Number(params.roomId), checkIn: new Date(checkIn), checkOut: new Date(checkOut), guests });
      if (!result.bookingId) throw new Error("Booking draft was not created");
      const checkout = await createCheckout.mutateAsync({ bookingId: result.bookingId });
      if (checkout.url) window.open(checkout.url, "_blank");
      navigate(`/bookings/${result.bookingId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the booking draft");
    }
  };
  return <div className="min-h-screen bg-[#fbfaf8] text-[#202320]"><header className="border-b border-[#e8e4dc] bg-white/85"><div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5 sm:px-8"><Link href={`/hotel/${params?.hotelId ?? ""}`} className="flex items-center gap-2 text-sm font-semibold text-[#234a44]"><ArrowLeft className="h-4 w-4" /> Back to stay</Link><span className="flex items-center gap-2 text-sm text-[#69736b]"><LockKeyhole className="h-4 w-4" /> Secure booking</span></div></header><main className="mx-auto grid max-w-4xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_320px]"><section><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#bc765a]">Your stay</p><h1 className="mt-3 font-serif text-5xl tracking-[-.05em] text-[#234a44]">Review the details.</h1><div className="mt-10 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-[#445047]"><span className="flex items-center gap-2"> <CalendarDays className="h-4 w-4 text-[#bc765a]" /> Check-in</span><Input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-2 h-12 rounded-xl bg-white" /></label><label className="text-sm font-medium text-[#445047]"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#bc765a]" /> Check-out</span><Input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-2 h-12 rounded-xl bg-white" /></label><label className="text-sm font-medium text-[#445047] sm:col-span-2"><span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#bc765a]" /> Guests</span><Input type="number" min={1} value={guests} onChange={(event) => setGuests(Math.max(1, Number(event.target.value)))} className="mt-2 h-12 rounded-xl bg-white" /></label></div><div className="mt-10 rounded-2xl border border-[#d9e3d4] bg-[#eef5e9] p-5 text-sm leading-6 text-[#536057]"><div className="flex items-center gap-2 font-semibold text-[#47704f]"><Check className="h-4 w-4" /> Pre-booking verification</div>{checkIn && checkOut && <p className="mt-2 font-semibold text-[#234a44]">{formatIndianDateRange(checkIn, checkOut, "hi-IN")}</p>}<p className="mt-2">Domora rechecks room availability, guest capacity, taxes, and mandatory fees before a booking is confirmed.</p>{room && <p className="mt-2">{room.cancellationPolicy || "Cancellation terms are shown by the partner before confirmation."}{room.inventory.length ? ` Inventory records available for ${room.inventory.length} date(s).` : " Live inventory is being prepared for this room."}</p>}</div>{message && <p className="mt-5 text-sm text-[#a96449]">{message}</p>}</section><aside className="h-fit rounded-3xl border border-[#e7e4dc] bg-white p-6 shadow-[0_14px_36px_rgba(42,52,43,.08)]"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#bc765a]">Price breakdown</p><p className="mt-3 text-sm font-semibold text-[#234a44]">{room?.name ?? "Selected room"}</p><div className="mt-6 space-y-4 text-sm text-[#69736b]"><div className="flex justify-between"><span>Stay length</span><span>{nights || "—"} night{nights === 1 ? "" : "s"}</span></div><div className="flex justify-between"><span>Room subtotal</span><span>{quote ? formatInr(quote.subtotalInr, "hi-IN") : "—"}</span></div><div className="flex justify-between"><span>Taxes</span><span>{quote ? formatInr(quote.taxInr, "hi-IN") : "—"}</span></div><div className="flex justify-between"><span>Service fee</span><span>{quote ? formatInr(quote.feeInr, "hi-IN") : "—"}</span></div><div className="border-t border-[#eeeae2] pt-4 text-base font-semibold text-[#234a44]"><div className="flex justify-between"><span>Total</span><span>{quote ? formatInr(quote.totalInr, "hi-IN") : "—"}</span></div></div></div><Button onClick={submit} disabled={createDraft.isPending || createCheckout.isPending || nights < 1} className="mt-7 w-full rounded-xl bg-[#d17b58] text-white hover:bg-[#b9684b]">{createDraft.isPending || createCheckout.isPending ? "Preparing secure payment…" : "Continue to payment"}</Button></aside></main></div>;
}
