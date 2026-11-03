/**
 * Single source of truth for usage limits.
 *
 * To launch a paid tier later:
 *   1. Set a limit for "free" (e.g. { daily: 20 }) and keep "pro" unlimited (or vice versa).
 *   2. Set profiles.plan = 'pro' from a Stripe webhook.
 * Nothing else in the code needs to change.
 */
export type PlanId = "anonymous" | "free" | "pro";

export interface PlanLimits {
  /** Max refinements ever (used for anonymous devices). null = no lifetime cap. */
  lifetime: number | null;
  /** Max refinements per UTC day. null = no daily cap. */
  daily: number | null;
  /** Max characters accepted per request. */
  maxChars: number;
  label: string;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  anonymous: { lifetime: 5, daily: null, maxChars: 4000, label: "Guest" },
  free: { lifetime: null, daily: null, maxChars: 4000, label: "Free" },
  pro: { lifetime: null, daily: null, maxChars: 12000, label: "Pro" },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "anonymous" || v === "free" || v === "pro";
}
