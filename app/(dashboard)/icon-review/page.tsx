import type { ComponentType } from "react";
import {
  LayersIcon,
  SettingsIcon,
  HomeIcon,
  CursorIcon,
  HandIcon,
  FrameIcon,
  ChatIcon,
  ComponentsIcon,
  ProjectsIcon,
} from "@/components/ui/icon";

type IconComp = ComponentType<{ className?: string; bare?: boolean }>;

const PRIMARY: { label: string; Icon: IconComp }[] = [
  { label: "Layers", Icon: LayersIcon },
  { label: "Settings", Icon: SettingsIcon },
  { label: "Home", Icon: HomeIcon },
  { label: "Cursor", Icon: CursorIcon },
  { label: "Hand", Icon: HandIcon },
  { label: "Frame", Icon: FrameIcon },
  { label: "Chat", Icon: ChatIcon },
  { label: "Components", Icon: ComponentsIcon },
];

export default function IconReviewPage() {
  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-1">
        <p className="mono-kicker">Internal</p>
        <h1 className="font-serif text-[28px] leading-tight text-[#1A1A1A]">
          App icon review
        </h1>
        <p className="max-w-xl text-[14px] leading-relaxed text-[#6B6B6B]">
          Studio OS custom icons from <code className="font-mono text-[13px]">components/ui/icon.tsx</code>.
          Shown at three sizes to match sidebar, panels, and the transport bar.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="mono-kicker">Set — light surface</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY.map(({ label, Icon }) => (
            <IconReviewCard key={label} label={label} Icon={Icon} variant="light" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="mono-kicker">Set — dark chrome (editor)</h2>
        <div className="rounded-[6px] border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRIMARY.map(({ label, Icon }) => (
              <IconReviewCard key={label} label={label} Icon={Icon} variant="dark" />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="mono-kicker">Reference — Projects (unchanged)</h2>
        <p className="text-[13px] text-[#6B6B6B]">
          Kept as-is for comparison with the rest of the set.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <IconReviewCard label="Projects" Icon={ProjectsIcon} variant="light" />
          <IconReviewCard label="Projects" Icon={ProjectsIcon} variant="dark" />
        </div>
      </section>
    </div>
  );
}

function IconReviewCard({
  label,
  Icon,
  variant,
}: {
  label: string;
  Icon: IconComp;
  variant: "light" | "dark";
}) {
  const fg = variant === "light" ? "text-[#1A1A1A]" : "text-[#FAFAF8]";
  const muted = variant === "light" ? "text-[#A0A0A0]" : "text-[#6B6B6B]";

  return (
    <div
      className={
        variant === "light"
          ? "flex flex-col items-center gap-4 rounded-[6px] border-[0.5px] border-[#EFEFEC] bg-white px-5 py-6"
          : "flex flex-col items-center gap-4 rounded-[6px] border border-[#2A2A2A] bg-[#141414] px-5 py-6"
      }
    >
      <span className={`text-center font-mono text-[10px] uppercase tracking-[1px] ${muted}`}>
        {label}
      </span>
      <div className={`flex items-end justify-center gap-6 ${fg}`}>
        <div className="flex flex-col items-center gap-1.5">
          <Icon className="h-9 w-9" />
          <span className={`font-mono text-[9px] ${muted}`}>36</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Icon className="h-6 w-6" />
          <span className={`font-mono text-[9px] ${muted}`}>24</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Icon className="h-[14px] w-[14px]" />
          <span className={`font-mono text-[9px] ${muted}`}>14</span>
        </div>
      </div>
    </div>
  );
}
