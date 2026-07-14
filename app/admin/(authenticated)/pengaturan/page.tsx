import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Info ini ditampilkan ke pelanggan di halaman pembayaran & status pesanan.
        </p>
      </div>
      <SettingsForm defaultValues={settings} />
    </div>
  );
}
