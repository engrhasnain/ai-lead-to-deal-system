export default function LeadLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#0f172a" />
      {/* Lead dot */}
      <circle cx="8" cy="16" r="3" fill="#6366f1" />
      {/* Arrow shaft */}
      <line x1="13" y1="16" x2="20" y2="16" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrow head */}
      <path d="M18 13.5 L21 16 L18 18.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Deal check circle */}
      <circle cx="24" cy="16" r="4" fill="#10b981" fillOpacity="0.2" />
      <path d="M22.2 16.2 L23.5 17.5 L26 14.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
