import { prisma } from "@/lib/prisma";

/** PO Events for dropdowns: open ones first (newest first), then archived. */
export async function listPoEventOptions() {
  const events = await prisma.poEvent.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, status: true },
  });
  return events.map((e) => ({ id: e.id, name: e.name, archived: e.status === "ARCHIVED" }));
}
