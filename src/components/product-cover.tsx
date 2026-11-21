import { cn } from "@/lib/cn";

export function ProductCover({ title, subtitle, accent, className }: { title: string; subtitle?: string; accent: string; className?: string }) {
  const color = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#17604f";
  return (
    <div className={cn("flex aspect-[4/5] flex-col overflow-hidden rounded-xl border border-line bg-surface", className)}>
      <div className="flex flex-[0_0_52%] items-end p-5" style={{ backgroundColor: color }}>
        <p className="font-display text-2xl leading-[1.05] text-white">{title}</p>
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <p className="line-clamp-3 text-[13px] leading-snug text-muted">{subtitle}</p>
        <span className="h-1.5 w-14 rounded bg-line" aria-hidden />
      </div>
    </div>
  );
}
