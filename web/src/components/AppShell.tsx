"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Plus, Settings, FileText, ScrollText } from "lucide-react";
import styles from "./AppShell.module.css";

const nav = [
  { href: "/dashboard", label: "Projects", icon: LayoutDashboard },
  { href: "/dashboard/new", label: "New tune", icon: Plus },
  { href: "/dashboard/models", label: "Models", icon: Boxes },
  { href: "/dashboard/billing", label: "Billing", icon: ScrollText },
  { href: "/dashboard/docs", label: "Docs", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className={styles.wrap}>
      <aside className={styles.side}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark} />
          <span>O<span className={styles.apos}>&rsquo;</span>TUNE</span>
        </Link>
        <nav className={styles.nav}>
          {nav.map(n => {
            const active = n.href === "/dashboard"
              ? path === n.href
              : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`${styles.link} ${active ? styles.active : ""}`}>
                <n.icon size={16} strokeWidth={1.7} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.tenant}>
          <div className={styles.tenantName}>Acme Corp</div>
          <div className={styles.tenantPlan}>Production · $24,800 credits</div>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
