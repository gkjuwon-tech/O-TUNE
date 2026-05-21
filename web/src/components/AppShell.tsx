"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Boxes, LayoutDashboard, Plus, Settings, FileText, ScrollText, LogOut } from "lucide-react";
import styles from "./AppShell.module.css";

const nav = [
  { href: "/dashboard", label: "Projects", icon: LayoutDashboard, match: "exact" as const },
  { href: "/dashboard/new", label: "New tune", icon: Plus, match: "prefix" as const },
  { href: "/dashboard/models", label: "Models", icon: Boxes, match: "prefix" as const },
  { href: "/dashboard/billing", label: "Billing", icon: ScrollText, match: "prefix" as const },
  { href: "/dashboard/docs", label: "Docs", icon: FileText, match: "prefix" as const },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, match: "prefix" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className={styles.wrap}>
      <aside className={styles.side}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark} />
          <span>O<span className={styles.apos}>&rsquo;</span>Tune</span>
        </Link>

        <nav className={styles.nav}>
          {nav.map(n => {
            const active = n.match === "exact" ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`${styles.link} ${active ? styles.active : ""}`}>
                <n.icon size={15} strokeWidth={1.75} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.tenant}>
          <div className={styles.tenantName}>Acme Corp</div>
          <div className={styles.tenantPlan}>Production · $24,800 credits</div>
        </div>

        {user && (
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>
              {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initials(user.name || user.email || "?")}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name || "Signed in"}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button
              className={styles.signOut}
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function initials(s: string) {
  return s
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join("") || "?";
}
