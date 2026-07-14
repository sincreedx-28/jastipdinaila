import { prisma } from "@/lib/prisma";

// RajaOngkir (Komerce) shipping-cost API — server-side only, key never
// reaches the browser. Endpoint/auth shape confirmed against current docs
// (rajaongkir.com/docs, dev-collaborator.komerce.id) as of this build.
const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const COURIERS = "lion:wahana" as const;
// Starter plan free tier is 100 requests/day; keep a safety margin below it.
const QUOTA_SAFETY_THRESHOLD = 90;
const CACHE_TTL_HOURS = 24;
const WEIGHT_BUCKET_GRAMS = 100;

function apiKey() {
  const key = process.env.RAJAONGKIR_API_KEY;
  if (!key) throw new Error("RAJAONGKIR_API_KEY belum diset.");
  return key;
}

export type DestinationOption = {
  id: string;
  label: string;
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

export async function searchDestination(query: string): Promise<DestinationOption[]> {
  if (!query || query.trim().length < 3) return [];

  const url = new URL(`${BASE_URL}/destination/domestic-destination`);
  url.searchParams.set("search", query.trim());
  url.searchParams.set("limit", "10");

  const res = await fetch(url, { headers: { key: apiKey() } });
  if (!res.ok) return [];

  const json = await res.json();
  const data: Array<{
    id: number;
    label: string;
    subdistrict_name: string;
    district_name: string;
    city_name: string;
    province_name?: string;
    zip_code: string;
  }> = json?.data ?? [];

  return data.map((d) => ({
    id: String(d.id),
    label: d.label,
    subdistrict: d.subdistrict_name,
    district: d.district_name,
    city: d.city_name,
    province: d.province_name ?? "",
    postalCode: d.zip_code,
  }));
}

// Standard courier volumetric divisor (cm³ / 6000 = kg), converted to grams.
// Some couriers use 5000 — confirm against Lion Parcel/Wahana's own published
// rate card if their actual charged weight ever visibly diverges from this.
export function chargeableWeightGrams(
  actualWeightGrams: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
) {
  const volumetric = ((lengthCm * widthCm * heightCm) / 6000) * 1000;
  return Math.max(actualWeightGrams, volumetric);
}

function weightBucket(grams: number) {
  return Math.ceil(grams / WEIGHT_BUCKET_GRAMS) * WEIGHT_BUCKET_GRAMS;
}

async function underQuota(): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const counter = await prisma.apiUsageCounter.findUnique({ where: { date: today } });
  return (counter?.count ?? 0) < QUOTA_SAFETY_THRESHOLD;
}

async function incrementQuota() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.apiUsageCounter.upsert({
    where: { date: today },
    create: { date: today, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export type ShippingRateOption = {
  courierCode: string;
  courierName: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export type ShippingRateResult =
  | { ok: true; rates: ShippingRateOption[] }
  | { ok: false; reason: "quota_exceeded" | "api_error" };

export async function getShippingRates(
  destinationId: string,
  chargeableGrams: number
): Promise<ShippingRateResult> {
  const originId = process.env.RAJAONGKIR_ORIGIN_ID;
  if (!originId) throw new Error("RAJAONGKIR_ORIGIN_ID belum diset.");

  const bucket = weightBucket(chargeableGrams);
  const now = new Date();

  const cached = await prisma.shippingRateCache.findUnique({
    where: {
      destinationId_weightBucketGrams_courier: {
        destinationId,
        weightBucketGrams: bucket,
        courier: COURIERS,
      },
    },
  });

  if (cached && cached.expiresAt > now) {
    return { ok: true, rates: cached.responseJson as unknown as ShippingRateOption[] };
  }

  if (!(await underQuota())) {
    return { ok: false, reason: "quota_exceeded" };
  }

  const body = new URLSearchParams({
    origin: originId,
    destination: destinationId,
    weight: String(bucket),
    courier: COURIERS,
    price: "lowest",
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
      method: "POST",
      headers: {
        key: apiKey(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    return { ok: false, reason: "api_error" };
  }

  await incrementQuota();

  if (!res.ok) return { ok: false, reason: "api_error" };

  const json = await res.json();
  if (json?.meta?.status !== "success" || !Array.isArray(json?.data)) {
    return { ok: false, reason: "api_error" };
  }

  const rates: ShippingRateOption[] = json.data.map(
    (r: {
      name: string;
      code: string;
      service: string;
      description: string;
      cost: number;
      etd: string;
    }) => ({
      courierCode: r.code,
      courierName: r.name,
      service: r.service,
      description: r.description,
      cost: r.cost,
      etd: r.etd,
    })
  );

  await prisma.shippingRateCache.upsert({
    where: {
      destinationId_weightBucketGrams_courier: {
        destinationId,
        weightBucketGrams: bucket,
        courier: COURIERS,
      },
    },
    create: {
      originId,
      destinationId,
      weightBucketGrams: bucket,
      courier: COURIERS,
      responseJson: rates,
      expiresAt: new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000),
    },
    update: {
      responseJson: rates,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  return { ok: true, rates };
}
