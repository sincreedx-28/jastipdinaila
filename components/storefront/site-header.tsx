import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          Jastip Store
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/produk" className="text-muted-foreground hover:text-foreground">
            Semua Produk
          </Link>
          <Link href="/keranjang" className="text-muted-foreground hover:text-foreground">
            Keranjang
          </Link>
        </nav>
      </div>
    </header>
  );
}
