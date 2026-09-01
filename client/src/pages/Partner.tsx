import { useState } from "react";
import { ArrowLeft, Check, ImagePlus, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Partner() {
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const { data: uploadConfig } = trpc.partner.createUploadSignature.useQuery(undefined, { enabled: isAuthenticated });
  const createApplication = trpc.partner.createApplication.useMutation();
  const createCheckout = trpc.partner.createOnboardingCheckout.useMutation();
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) { startLogin(); return; }
    const form = new FormData(event.currentTarget);
    try {
      const result = await createApplication.mutateAsync({ name: String(form.get("name") ?? ""), slug: String(form.get("name") ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "-"), city: String(form.get("city") ?? ""), pincode: String(form.get("pincode") ?? ""), address: String(form.get("address") ?? ""), description: String(form.get("description") ?? ""), coverImageUrl: coverImageUrl || undefined, phone: String(form.get("phone") ?? "") || undefined });
      const checkout = await createCheckout.mutateAsync({ hotelId: result.hotelId });
      if (checkout.url) window.open(checkout.url, "_blank");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start onboarding");
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadConfig) return;
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", uploadConfig.apiKey);
    body.append("timestamp", String(uploadConfig.timestamp));
    body.append("folder", uploadConfig.folder);
    body.append("signature", uploadConfig.signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${uploadConfig.cloudName}/image/upload`, { method: "POST", body });
    if (!response.ok) { setMessage("Image upload failed"); return; }
    const result = await response.json() as { secure_url?: string };
    setCoverImageUrl(result.secure_url ?? "");
  };
  return <div className="min-h-screen bg-[#fbfaf8] text-[#202320]"><header className="border-b border-[#e8e4dc] bg-white/80"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-3 text-[#234a44]"><ArrowLeft className="h-4 w-4" /><span className="font-serif text-2xl font-semibold tracking-[-.04em]">domora</span></Link><div className="flex items-center gap-2 text-sm text-[#69736b]"><LockKeyhole className="h-4 w-4" /> Secure partner onboarding</div></div></header><main className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:py-20"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-[#bc765a]">For hotel partners</p><h1 className="font-serif text-6xl leading-[.92] tracking-[-.06em] text-[#234a44]">Put your rooms in the right conversation.</h1><p className="mt-7 max-w-md text-lg leading-8 text-[#687168]">Join Domora’s carefully reviewed hotel network. Your listing goes live only after payment and super-admin approval.</p><div className="mt-10 space-y-5">{["Reach guests searching with real intent", "Showcase policies, amenities, and room details", "One-time onboarding fee of exactly ₹10,000"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-medium text-[#455149]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f1df] text-[#47704f]"><Check className="h-4 w-4" /></span>{item}</div>)}</div></section><form onSubmit={handleSubmit} className="rounded-[30px] border border-[#e6e0d6] bg-white p-6 shadow-[0_18px_55px_rgba(48,57,42,.09)] sm:p-9"><div className="mb-8 flex items-start justify-between"><div><h2 className="font-serif text-3xl tracking-[-.04em] text-[#234a44]">Start your application</h2><p className="mt-2 text-sm text-[#7a837a]">A few details first. You can add rooms after approval.</p></div><Sparkles className="h-6 w-6 text-[#bc765a]" /></div><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-[#445047]">Hotel name<Input name="name" required className="mt-2 h-12 rounded-xl bg-[#fbfaf8]" placeholder="Your property name" /></label><label className="text-sm font-medium text-[#445047]">Contact person<Input className="mt-2 h-12 rounded-xl bg-[#fbfaf8]" placeholder="Full name" /></label><label className="text-sm font-medium text-[#445047]">Email address<Input type="email" className="mt-2 h-12 rounded-xl bg-[#fbfaf8]" placeholder="you@hotel.com" /></label><label className="text-sm font-medium text-[#445047]">Phone number<Input name="phone" type="tel" required className="mt-2 h-12 rounded-xl bg-[#fbfaf8]" placeholder="+91 98765 43210" /></label><label className="text-sm font-medium text-[#445047] sm:col-span-2">City and pincode<Input name="city" required className="mt-2 h-12 rounded-xl bg-[#fbfaf8]" placeholder="Search with city or pincode" /></label><label className="text-sm font-medium text-[#445047] sm:col-span-2">Property description<Textarea name="description" className="mt-2 min-h-28 rounded-xl bg-[#fbfaf8]" placeholder="What should guests know about the stay?" /></label></div><label className="mt-5 flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-[#cfcbc1] bg-[#fbfaf8] px-4 py-6 text-sm font-medium text-[#6d776e] transition-colors hover:bg-[#f3f0ea]"><ImagePlus className="h-5 w-5 text-[#bc765a]" /> {coverImageUrl ? "Property image uploaded" : "Add property image to Cloudinary"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} /></label><div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#eeeae2] pt-6 sm:flex-row"><div><p className="text-xs uppercase tracking-[.14em] text-[#899188]">Onboarding fee</p><p className="mt-1 text-2xl font-semibold text-[#234a44]">₹10,000 <span className="text-sm font-normal text-[#8a928b]">one time</span></p></div><Button type="submit" disabled={createApplication.isPending || createCheckout.isPending} className="h-12 rounded-full bg-[#d17b58] px-7 text-white hover:bg-[#b9684b]">{createApplication.isPending || createCheckout.isPending ? "Preparing checkout…" : "Continue to secure payment"}</Button></div>{message && <p className="mt-4 text-sm text-[#a96449]">{message}</p>}</form></main></div>;
}
