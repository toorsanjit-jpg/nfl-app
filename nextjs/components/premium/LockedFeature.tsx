"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type LockedFeatureProps = {
  label: string;
};

export function LockedFeature({ label }: LockedFeatureProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Lock className="h-3 w-3" />
        <span>{label}</span>
      </button>
      {open ? (
        <div className="absolute z-10 mt-2 w-64 rounded-md border bg-background p-3 text-xs shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" />
            <span>Premium required</span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Upgrade to unlock this advanced control.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => router.push("/premium")}>
              Upgrade
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
