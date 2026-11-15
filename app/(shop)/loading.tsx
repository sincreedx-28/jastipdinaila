import { HomeSkeleton } from "@/components/storefront/skeletons";

// Lives in the (shop) route group so it only covers the home page — a
// loading.tsx directly in app/ would also replace the admin layout while
// admin pages load.
export default function Loading() {
  return <HomeSkeleton />;
}
