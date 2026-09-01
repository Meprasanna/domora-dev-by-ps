import React from "react";
import { trpc } from "@/lib/trpc";

type Props = { hotelId: number; roomId?: number; checkIn?: string; checkOut?: string; guests: number };

export function LiveComparisonPrice({ hotelId, roomId, checkIn, checkOut, guests }: Props) {
  const enabled = Boolean(roomId && checkIn && checkOut && new Date(checkOut).getTime() > new Date(checkIn).getTime());
  const comparison = trpc.hotels.liveComparison.useQuery({ hotelId, roomId: roomId ?? 0, checkIn: checkIn ?? "", checkOut: checkOut ?? "", guests }, { enabled, staleTime: 60_000, refetchOnWindowFocus: false });
  if (!enabled) return <p className="mt-1 text-[11px] text-[#858d84]">Enter dates to see live provider prices.</p>;
  if (comparison.isLoading) return <p className="mt-1 text-[11px] text-[#858d84]">Checking live prices…</p>;
  if (comparison.isError) return <p className="mt-1 text-[11px] text-[#a96449]">Live comparison temporarily unavailable.</p>;
  const lowest = comparison.data?.lowestOffer;
  const symbol = lowest?.currency === "EUR" ? "€" : lowest?.currency === "USD" ? "$" : "₹";
  const unavailable = comparison.data?.providerStatuses.filter(provider => provider.status !== "success") ?? [];
  return <div className="mt-2 rounded-xl bg-[#eef5e9] px-3 py-2 text-[11px] text-[#47704f]"><div className="flex items-baseline justify-between gap-2"><span className="font-semibold">{lowest ? `${symbol}${lowest.totalPriceInr.toLocaleString("en-IN")} lowest live total` : "No live offer returned"}</span>{lowest && <span className="text-[10px]">{lowest.providerName}</span>}</div>{lowest && <p className="mt-1 text-[10px] text-[#687168]">{symbol}{lowest.nightlyPriceInr.toLocaleString("en-IN")}/night · checked {new Date(lowest.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}<p className="mt-1 text-[10px] text-[#687168]">{comparison.data?.providerStatuses.filter(provider => provider.status === "success").length ?? 0} provider(s) checked · display-only</p>{unavailable.map(provider => <p key={provider.providerKey} className="mt-1 text-[10px] text-[#a96449]">{provider.providerName}: {provider.error || "temporarily unavailable"}</p>)}</div>;
}
