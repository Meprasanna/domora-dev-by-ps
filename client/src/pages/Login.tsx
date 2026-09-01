import React from "react";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { handleDomoraLoginClick } from "@/lib/loginAction";

export default function Login() {
  const returnTo = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("returnTo") || "/";
  return (
    <main className="min-h-screen bg-[#fbfaf8] px-5 py-8 text-[#202320] sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-[#234a44]"><ArrowLeft className="h-4 w-4" /><span className="font-serif text-2xl font-semibold tracking-[-.04em]">domora</span></Link>
        <span className="flex items-center gap-2 text-sm text-[#69736b]"><LockKeyhole className="h-4 w-4" /> Secure sign in</span>
      </div>
      <section className="mx-auto grid min-h-[calc(100vh-100px)] max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1fr_.8fr]">
        <div><p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-[#bc765a]">Welcome back</p><h1 className="max-w-xl font-serif text-6xl leading-[.94] tracking-[-.06em] text-[#234a44] sm:text-7xl">Your next stay is closer than it feels.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-[#687168]">Sign in to keep wishlists, booking details, and partner applications together in one calm place.</p></div>
        <div className="rounded-[30px] border border-[#e6e0d6] bg-white p-7 shadow-[0_18px_55px_rgba(48,57,42,.09)] sm:p-10"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f1df] text-[#47704f]"><Sparkles className="h-5 w-5" /></span><h2 className="mt-7 font-serif text-3xl tracking-[-.04em] text-[#234a44]">Continue with Domora</h2><p className="mt-3 text-sm leading-6 text-[#7a837a]">Use the secure OAuth sign-in provided by Domora. Your account role and saved stays will be restored after authentication.</p><Button type="button" onClick={() => handleDomoraLoginClick(() => startLogin(returnTo))} className="mt-8 h-12 w-full rounded-full bg-[#234a44] text-white hover:bg-[#173b36] active:scale-[.98]">Continue securely</Button><p className="mt-5 text-center text-xs leading-5 text-[#8a928b]">By continuing, you agree to use Domora’s secure account service.</p></div>
      </section>
    </main>
  );
}
