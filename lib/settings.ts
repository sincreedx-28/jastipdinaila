import { prisma } from "@/lib/prisma";

export const SETTINGS_KEYS = [
  "bank_name",
  "bank_account_number",
  "bank_account_holder",
  "whatsapp_number",
] as const;

export type SettingsMap = Record<(typeof SETTINGS_KEYS)[number], string>;

export async function getSettings(): Promise<SettingsMap> {
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...SETTINGS_KEYS] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SettingsMap>;

  return {
    bank_name: map.bank_name ?? "",
    bank_account_number: map.bank_account_number ?? "",
    bank_account_holder: map.bank_account_holder ?? "",
    whatsapp_number: map.whatsapp_number ?? "",
  };
}

export function whatsappLink(whatsappNumber: string, message?: string) {
  const digits = whatsappNumber.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const url = new URL(`https://wa.me/${normalized}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}
