import { prisma } from "@/lib/prisma";
import { toEventInfo } from "@/lib/po-event-info";
import { PoEventManager } from "@/components/admin/po-event-manager";

export default async function PoEventPage() {
  const events = await prisma.poEvent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true, orders: true } },
      products: {
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });
  return (
    <PoEventManager
      events={events.map((e) => ({
        ...toEventInfo(e),
        productCount: e._count.products,
        orderCount: e._count.orders,
        products: e.products,
      }))}
    />
  );
}
