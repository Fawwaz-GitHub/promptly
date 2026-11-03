export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#6a45f5" />
      <path d="M10 22V10h6.2a4.3 4.3 0 0 1 0 8.6H13" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="21.5" r="2" fill="#c9f05a" />
    </svg>
  );
}
