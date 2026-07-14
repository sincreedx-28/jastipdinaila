"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function formatThousands(digits: string) {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function CurrencyInput({
  id,
  name,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  defaultValue?: number;
  required?: boolean;
}) {
  const [digits, setDigits] = useState(
    defaultValue !== undefined ? String(defaultValue) : ""
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-9"
        value={formatThousands(digits)}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
        placeholder="0"
      />
      <input type="hidden" name={name} value={digits} required={required} />
    </div>
  );
}
