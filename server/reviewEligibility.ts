export function canReviewStay(input: { status: string; checkOut: Date; now?: Date }) {
  const now = input.now ?? new Date();
  return input.status === "completed" && input.checkOut <= now;
}
