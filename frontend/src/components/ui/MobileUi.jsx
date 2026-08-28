/** Shared iOS 17 / Whoop-style mobile UI primitives */

export function ProgressRing({ value = 0, size = 160, stroke = 10, color = "#00D9B5", label, sublabel }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {label != null && <span className="text-3xl font-bold text-white tracking-tight">{label}</span>}
        {sublabel && <span className="text-[11px] text-white/50 uppercase tracking-widest mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

export function GlassCard({ children, className = "", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`ios-card rounded-2xl p-4 ${onClick ? "active:scale-[0.98] transition-transform text-left w-full" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function MetricTile({ label, value, unit, accent = false, icon }) {
  return (
    <div className={`ios-card rounded-2xl p-4 flex flex-col gap-1 min-h-[88px] ${accent ? "ring-1 ring-[#00D9B5]/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
        {icon && <span className="material-symbols-outlined text-[18px] text-white/30">{icon}</span>}
      </div>
      <div className="mt-auto">
        <span className={`text-2xl font-bold tracking-tight ${accent ? "text-[#00D9B5]" : "text-white"}`}>{value}</span>
        {unit && <span className="text-sm text-white/40 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3 px-0.5">
      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white/45">{title}</h3>
      {action && (
        <button type="button" onClick={onAction} className="text-[13px] font-medium text-[#00D9B5]">
          {action}
        </button>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";

export function BottomTabBar({ items, activePath }) {
  return (
    <nav className="ios-tabbar fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around px-2 max-w-lg mx-auto">
      {items.map((item) => {
        const active =
          item.path === "/patient"
            ? activePath === "/patient"
            : activePath === item.path || activePath.startsWith(`${item.path}/`);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors ${
              active ? "text-[#00D9B5]" : "text-white/40"
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({ greeting, title, subtitle, badge }) {
  return (
    <header className="mb-6">
      {greeting && <p className="text-sm text-white/50 mb-1">{greeting}</p>}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/45 mt-1">{subtitle}</p>}
        </div>
        {badge}
      </div>
    </header>
  );
}
