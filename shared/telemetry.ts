export type RefreshHistoryRow = { id: number; providerKey: string; status: string; startedAt: Date; finishedAt: Date | null; durationMs: number | null; offerCount: number; errorMessage: string | null };

export function toRefreshHistoryCsv(rows: RefreshHistoryRow[]) {
  const header = "id,provider,status,startedAt,finishedAt,durationMs,offerCount,errorMessage";
  return [header, ...rows.map(run => [run.id, run.providerKey, run.status, run.startedAt.toISOString(), run.finishedAt?.toISOString() ?? "", run.durationMs ?? "", run.offerCount, JSON.stringify(run.errorMessage ?? "")].join(","))].join("\n");
}
