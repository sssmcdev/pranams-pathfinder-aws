import "./admin.css";
import { AdminShell } from "@/components/admin/AdminShell";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `${APP_NAME} Admin` };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
