import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { SiteHeader } from "@/components/storefront/site-header";

export default async function AkunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect("/");
  }

  return (
    <div className="theme-shop flex min-h-screen flex-col">
      <SiteHeader customer={customer} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
