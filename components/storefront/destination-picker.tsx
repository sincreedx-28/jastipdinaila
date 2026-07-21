"use client";

import { useEffect, useRef, useState } from "react";
import { searchDestinationAction } from "@/lib/actions/shipping";
import { Input } from "@/components/ui/input";
import type { DestinationOption } from "@/lib/rajaongkir";

export function DestinationPicker({
  onSelect,
  defaultValue,
}: {
  onSelect: (destination: DestinationOption) => void;
  defaultValue?: DestinationOption;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DestinationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DestinationOption | null>(defaultValue ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 3) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchDestinationAction(query);
      setResults(data);
      setOpen(true);
      setLoading(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  return (
    <div className="relative">
      <Input
        placeholder="Type destination district/city/postal code..."
        value={selected ? selected.label : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setSelected(d);
                setResults([]);
                setOpen(false);
                onSelect(d);
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
