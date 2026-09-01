export function isValidAvailabilityBatch(startDate: Date, endDate: Date) {
  return endDate.getTime() >= startDate.getTime();
}

export function isHotelbedsMappingUpdateAllowed(actorRole: string, ownsHotel: boolean) {
  return actorRole === "partner" && ownsHotel;
}

export function shouldSkipRefreshRun(lastRunKey: string | null | undefined, currentRunKey: string, lastSuccessAt: Date | null | undefined, now = Date.now()) {
  return lastRunKey === currentRunKey && Boolean(lastSuccessAt) && now - lastSuccessAt!.getTime() < 10 * 60_000;
}

export function shouldSendRefreshFailureAlert(statuses: string[], threshold: number) {
  if (threshold < 1 || statuses.length < threshold) return false;
  return statuses.slice(0, threshold).every(status => status === "failed");
}
