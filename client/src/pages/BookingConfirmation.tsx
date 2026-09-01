import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";

export default function BookingConfirmation() {
  const [, params] = useRoute("/bookings/:id");
  const [location] = useLocation();
  const cancelled = location.includes("payment=cancelled");
  return <div className="min-h-screen bg-[#fbfaf8] px-5 py-16 text-[#202320]"><main className="mx-auto max-w-xl rounded-[30px] border border-[#e7e4dc] bg-white p-8 text-center shadow-[0_18px_55px_rgba(48,57,42,.08)] sm:p-12">{cancelled ? <XCircle className="mx-auto h-14 w-14 text-[#a96449]" /> : <CheckCircle2 className="mx-auto h-14 w-14 text-[#47704f]" />}<p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-[#bc765a]">Booking #{params?.id}</p><h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[#234a44]">{cancelled ? "Payment was cancelled." : "Your stay is being confirmed."}</h1><p className="mt-5 text-sm leading-7 text-[#687168]">{cancelled ? "Your booking draft is still safe. You can return to payment whenever you are ready." : "Stripe has returned you to Domora. We will show confirmation after the webhook verifies the payment."}</p><div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#7d857d]"><Clock3 className="h-4 w-4" /> Payment status updates securely</div><Link href="/"><Button className="mt-8 rounded-full bg-[#234a44] text-white hover:bg-[#173b36]">Return to explore</Button></Link></main></div>;
}
