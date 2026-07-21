export function SiteFooter() {
  return (
    <footer className="mt-6 bg-foreground px-4 py-9 text-white/90">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="font-heading text-xl font-bold">jastipdinaila</div>
        <div className="text-[13px] text-white/75">
          © {new Date().getFullYear()} jastipdinaila. Titip beli tepercaya, kualitas terjaga.
        </div>
      </div>
    </footer>
  );
}
