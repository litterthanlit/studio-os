'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BriefIcon,
  VisionIcon,
  TypeIcon,
  ProjectsIcon,
  FlowIcon,
} from "@/components/icons/nav-icons";

const items = [
  { href: "/brief",    label: "Brief",    Icon: BriefIcon    },
  { href: "/vision",   label: "Vision",   Icon: VisionIcon   },
  { href: "/type",     label: "Type",     Icon: TypeIcon     },
  { href: "/projects", label: "Projects", Icon: ProjectsIcon },
  { href: "/flow",     label: "Flow",     Icon: FlowIcon     },
];

export function Dock() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
      <nav
        className={cn(
          "pointer-events-auto flex h-14 w-full max-w-[800px] items-center justify-between rounded-lg",
          "bg-black/70 backdrop-blur-[10px] border border-white/10"
        )}
      >
        <div className="px-3 text-[12px] font-medium uppercase tracking-[0.2em] text-gray-400">
          Studio OS
        </div>

        <div className="flex flex-1 items-center justify-center gap-6">
          {items.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 text-[11px] font-normal",
                  "transition-colors duration-200 ease-out",
                  active
                    ? "text-accent"
                    : "text-[#666666] hover:text-[#999999]"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="uppercase tracking-[0.15em]">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="w-[88px]" />
      </nav>
    </div>
  );
}
