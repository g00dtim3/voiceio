"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Tags,
  Columns3,
  Sparkles,
  FileText,
  Share2,
  HelpCircle,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/ui/tooltip";

interface NavItem {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Tags, label: "Topics", href: "/topics" },
  { icon: Columns3, label: "Smart Columns", href: "/smart-columns" },
  { icon: Sparkles, label: "Insight Agent", href: "/insight-agent" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Share2, label: "Share", href: "/share" },
];

interface GlobalSidebarProps {
  projectId?: string;
}

export function GlobalSidebar({ projectId }: GlobalSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const getHref = (item: NavItem) => {
    if (item.href === "/") return projectId ? `/projects/${projectId}` : "/";
    return projectId ? `/projects/${projectId}${item.href}` : item.href;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-[72px] flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center">
          <span className="text-lg font-bold text-[var(--color-brand-500)]">V</span>
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const href = getHref(item);
            const isActive =
              item.href === "/"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[120ms] ease-out",
                      isActive
                        ? "bg-[var(--bg-hover)] text-[var(--color-brand-500)]"
                        : "text-[var(--icon-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--icon-default)]"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-brand-500)]" />
                    )}
                    <item.icon size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom utility */}
        <div className="flex flex-col items-center gap-1 px-3 pb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--icon-muted)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)] hover:text-[var(--icon-default)]">
                <HelpCircle size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--icon-muted)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)] hover:text-[var(--icon-default)]"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--icon-default)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-hover)]">
                <User size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Account</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
