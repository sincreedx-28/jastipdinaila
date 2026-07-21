import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { PromoBanner } from "@/components/storefront/promo-banner";
import { SiteHeader } from "@/components/storefront/site-header";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();
  const savedAddresses = customer
    ? await prisma.customerAddress.findMany({
        where: { customerId: customer.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <PromoBanner />
      <SiteHeader customer={customer} />
      <CheckoutForm isLoggedIn={Boolean(customer)} savedAddresses={savedAddresses} />
    </div>
  );
}
