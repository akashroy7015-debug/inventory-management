"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) setTimeout(() => window.print(), 300);
  }, [auto]);
  return <button type="button" className="btn btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>;
}
