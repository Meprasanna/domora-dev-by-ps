import { useMemo, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function InviteAccept() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const token = useMemo(() => new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "", [location]);
  const [message, setMessage] = useState("");
  const accept = trpc.invites.accept.useMutation({ onSuccess: (result) => setMessage(`Invite accepted. You are now a ${result.role.replace("_", " ")}.`) });
  const handleAccept = async () => {
    if (!isAuthenticated) { startLogin(); return; }
    if (!token) { setMessage("This invite link is missing its token."); return; }
    try { await accept.mutateAsync({ token }); } catch (error) { setMessage(error instanceof Error ? error.message : "Invite could not be accepted"); }
  };
  return <div className="min-h-screen bg-[#fbfaf8] px-5 py-16"><main className="mx-auto max-w-lg rounded-[30px] border border-[#e7e4dc] bg-white p-8 text-center shadow-[0_18px_55px_rgba(48,57,42,.08)]"><Mail className="mx-auto h-12 w-12 text-[#bc765a]" /><h1 className="mt-6 font-serif text-4xl text-[#234a44]">Accept your Domora invite.</h1><p className="mt-4 text-sm leading-7 text-[#687168]">Sign in with the invited email through Manus OAuth, then activate your partner or super-admin role.</p>{message && <p className="mt-5 flex items-center justify-center gap-2 text-sm text-[#47704f]"><CheckCircle2 className="h-4 w-4" /> {message}</p>}<Button onClick={handleAccept} disabled={accept.isPending} className="mt-8 rounded-full bg-[#234a44] text-white">{accept.isPending ? "Activating…" : isAuthenticated ? "Activate invite" : "Sign in with Manus"}</Button></main></div>;
}
