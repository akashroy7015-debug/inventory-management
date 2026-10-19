import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-600 ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", tone = "dark" }: { href?: string; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className={`flex min-h-11 items-center gap-2.5 ${tone === "light" ? "text-white" : "text-ink"}`}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-[-0.02em]">{APP_NAME}</span>
    </Link>
  );
}
