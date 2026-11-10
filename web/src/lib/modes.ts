export type Mode = "improve" | "grammar" | "concise";

export const MODES: Record<Mode, { label: string; description: string }> = {
  improve: { label: "Improve", description: "Clarify, structure and add useful detail" },
  grammar: { label: "Grammar only", description: "Fix spelling and grammar, keep wording" },
  concise: { label: "Concise", description: "Shorter and sharper, same intent" },
};

export function isMode(v: unknown): v is Mode {
  return v === "improve" || v === "grammar" || v === "concise";
}
