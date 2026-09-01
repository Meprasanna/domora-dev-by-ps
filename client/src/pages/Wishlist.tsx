import { Heart, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: saved = [], isLoading } = trpc.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });
  const toggle = trpc.wishlist.toggle.useMutation({ onSuccess: () => utils.wishlist.list.invalidate() });
  if (!isAuthenticated) return <div className="min-h-screen bg-[#fbfaf8] p-10 text-center"><Heart className="mx-auto h-8 w-8 text-[#bc765a]" /><h1 className="mt-4 font-serif text-4xl text-[#234a44]">Keep a shortlist of stays.</h1><Button onClick={() => startLogin()} className="mt-6 rounded-full bg-[#234a44] text-white">Sign in to view wishlist</Button></div>;
  return <div className="min-h-screen bg-[#fbfaf8] text-[#202320]"><header className="border-b border-[#e8e4dc] bg-white"><div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#234a44]"><ArrowLeft className="h-4 w-4" /> Explore stays</Link><Heart className="h-5 w-5 text-[#bc765a]" /></div></header><main className="mx-auto max-w-5xl px-5 py-12 sm:px-8"><h1 className="font-serif text-5xl tracking-[-.05em] text-[#234a44]">Your wishlist</h1>{isLoading ? <p className="mt-8 text-sm text-[#7d857d]">Loading saved stays…</p> : saved.length === 0 ? <p className="mt-8 rounded-2xl border border-dashed border-[#d8d3c8] bg-white p-10 text-center text-sm text-[#7d857d]">You have not saved any stays yet.</p> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{saved.map((item) => <div key={item.id} className="rounded-2xl border border-[#e7e4dc] bg-white p-5"><p className="text-sm font-semibold text-[#39463c]">Hotel #{item.hotelId}</p><button onClick={() => toggle.mutate({ hotelId: item.hotelId })} className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#a96449]"><Trash2 className="h-4 w-4" /> Remove</button></div>)}</div>}</main></div>;
}
