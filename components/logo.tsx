/** The supplied brand asset, used exactly as provided. */
export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src="/brand/logo.png"
      alt="Perfectgration. Your gateway to opportunities"
      className={`w-auto max-w-full ${className}`}
      width={681}
      height={151}
    />
  );
}
