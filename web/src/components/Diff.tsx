"use client";
import { diffWords } from "diff";

export function Diff({ from, to }: { from: string; to: string }) {
  const parts = diffWords(from, to);
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((p, i) =>
        p.added ? (
          <span key={i} className="diff-add">{p.value}</span>
        ) : p.removed ? (
          <span key={i} className="diff-del">{p.value}</span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </div>
  );
}
