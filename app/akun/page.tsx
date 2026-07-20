import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { setDefaultAddress } from "@/lib/actions/customer-address";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteAddressButton } from "@/components/storefront/delete-address-button";

export default async function AkunPage() {
  // Layout already guarantees a customer is logged in.
  const customer = (await getCurrentCustomer())!;
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alamat Saya</h1>
        <Button render={<Link href="/akun/alamat/baru">+ Tambah Alamat</Link>} />
      </div>

      {addresses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada alamat tersimpan. Alamat yang disimpan akan muncul di checkout
          supaya tidak perlu diisi ulang tiap order.
        </p>
      )}

      <div className="space-y-3">
        {addresses.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.label}</span>
                  {a.isDefault && <Badge>Utama</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/akun/alamat/${a.id}`}>Edit</Link>}
                  />
                  <DeleteAddressButton addressId={a.id} addressLabel={a.label} />
                </div>
              </div>
              <p className="text-sm">
                {a.recipientName} · {a.recipientPhone}
              </p>
              <p className="text-sm text-muted-foreground">
                {a.address}, {a.district}, {a.city}, {a.province} {a.postalCode}
              </p>
              {!a.isDefault && (
                <form
                  action={async () => {
                    "use server";
                    await setDefaultAddress(a.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Jadikan alamat utama
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
