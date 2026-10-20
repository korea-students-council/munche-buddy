import { requireAdmin } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-theme grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)]">
      <aside>
        <p className="font-display mb-2 hidden text-lg lg:block">어드민</p>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
