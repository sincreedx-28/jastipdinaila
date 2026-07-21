import { getCurrentCustomer } from "@/lib/customer-auth";
import { PromoBanner } from "@/components/storefront/promo-banner";
import { SiteHeader } from "@/components/storefront/site-header";
import { CartView } from "@/components/storefront/cart-view";

export default async function CartPage() {
  const customer = await getCurrentCustomer();

  return (
    <div className="flex min-h-screen flex-col">
      <PromoBanner />
      <SiteHeader customer={customer} />
      <CartView />
    </div>
  );
}
