import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { CartView } from "@/components/storefront/cart-view";

export default async function CartPage() {
  const customer = await getCurrentCustomer();

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <CartView />
    </div>
  );
}
