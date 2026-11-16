import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { WaCheckout } from "@/components/storefront/wa-checkout";

export default async function WaCheckoutPage() {
  const customer = await getCurrentCustomer();
  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <div className="flex-1">
        <WaCheckout defaultName={customer?.name ?? ""} />
      </div>
      <SiteFooter />
    </div>
  );
}
