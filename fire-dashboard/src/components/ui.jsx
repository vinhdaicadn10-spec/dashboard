import { createElement } from "react";
import { styles } from "../styles";

const toneClasses = {
  safe: { card: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  caution: { card: "border-amber-500/30 bg-amber-500/10 text-amber-300", badge: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  warning: { card: "border-orange-500/30 bg-orange-500/10 text-orange-300", badge: "border-orange-400/30 bg-orange-400/10 text-orange-300" },
  danger: { card: "border-red-500/30 bg-red-500/10 text-red-300", badge: "border-red-400/30 bg-red-400/10 text-red-300" },
  neutral: { card: "border-slate-600 bg-slate-800/60 text-slate-300", badge: "border-slate-600 bg-slate-800 text-slate-300" },
};

const statToneClasses = {
  safe: { accent: "#10b981", text: "text-emerald-300", icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", badge: "bg-emerald-400/10 text-emerald-300" },
  caution: { accent: "#f59e0b", text: "text-amber-300", icon: "border-amber-400/20 bg-amber-400/10 text-amber-300", badge: "bg-amber-400/10 text-amber-300" },
  warning: { accent: "#f97316", text: "text-orange-300", icon: "border-orange-400/20 bg-orange-400/10 text-orange-300", badge: "bg-orange-400/10 text-orange-300" },
  danger: { accent: "#dc2626", text: "text-red-300", icon: "border-red-400/20 bg-red-400/10 text-red-300", badge: "bg-red-400/10 text-red-300" },
  neutral: { accent: "#64748b", text: "text-slate-300", icon: "border-slate-600 bg-slate-800 text-slate-300", badge: "bg-slate-800 text-slate-300" },
};

export function Badge({ children, tone = "neutral", className = "", style }) {
  return <span className={`${styles.badge} ${toneClasses[tone].badge} ${className}`} style={style}>{children}</span>;
}

export function Button({ children, onClick, variant = "solid", className = "", type = "button", disabled = false, style }) {
  const variantClass = variant === "outline"
    ? "border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
    : variant === "muted"
      ? "border border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
      : "bg-cyan-400 text-slate-950 hover:bg-cyan-300";
  return <button type={type} onClick={onClick} disabled={disabled} className={`${styles.button} ${variantClass} ${className}`} style={style}>{children}</button>;
}

export function Toggle({ checked, onChange, disabled = false, checkedClassName = "bg-slate-900" }) {
  return <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled} aria-pressed={checked} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? checkedClassName : "bg-slate-300"} ${disabled ? "opacity-50" : ""}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} /></button>;
}

export function ProgressBar({ value, tone = "neutral" }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const barClass = { safe: "bg-emerald-500", caution: "bg-amber-500", warning: "bg-orange-500", danger: "bg-red-600", neutral: "bg-slate-500" }[tone];
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${safeValue}%` }} /></div>;
}

export function MiniLineChart({ data, dataKey, maxValue, threshold, thresholdLabel, stroke = "#0f172a", fill = "rgba(15,23,42,0.08)" }) {
  const width = 760;
  const height = 240;
  const pad = 24;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const values = data.map((item) => item[dataKey]);
  const max = Math.max(maxValue || 0, ...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = data.map((item, index) => [pad + (index * innerW) / Math.max(data.length - 1, 1), pad + innerH - ((item[dataKey] - min) / range) * innerH]);
  const linePath = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${pad + innerW} ${pad + innerH} L ${pad} ${pad + innerH} Z`;
  const thresholdY = threshold === undefined ? null : Math.max(pad, Math.min(pad + innerH, pad + innerH - ((threshold - min) / range) * innerH));

  return <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full"><rect x="0" y="0" width={width} height={height} fill="#0B1220" />{thresholdY !== null ? <rect x={pad} y={pad} width={innerW} height={thresholdY - pad} fill="rgba(220, 38, 38, 0.10)" /> : null}{[0, 1, 2, 3].map((tick) => { const y = pad + (tick * innerH) / 3; return <line key={tick} x1={pad} y1={y} x2={pad + innerW} y2={y} stroke="#263449" strokeDasharray="4 4" />; })}{thresholdY !== null ? <><line x1={pad} y1={thresholdY} x2={pad + innerW} y2={thresholdY} stroke="#fb7185" strokeWidth="2" strokeDasharray="7 5" /><text x={pad + 8} y={thresholdY - 7} fontSize="11" fontWeight="600" fill="#fda4af">{thresholdLabel}</text></> : null}<path d={areaPath} fill={fill} /><path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="3" fill={stroke} />)}{data.map((item, index) => { const x = pad + (index * innerW) / Math.max(data.length - 1, 1); return <text key={index} x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{item.time}</text>; })}</svg></div>;
}

export function StatCard({ title, value, status, subtitle, icon, tone = "neutral" }) {
  const toneClass = statToneClasses[tone];
  return <div className={`${styles.card} border-l-4 p-5`} style={{ borderLeftColor: toneClass.accent }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-wider text-slate-400">{title}</p><p className={`mt-2 text-2xl font-bold ${toneClass.text}`}>{value}</p>{status ? <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass.badge}`}>{status}</span> : null}<p className="mt-2 text-xs text-slate-400">{subtitle}</p></div><div className={`rounded-2xl border p-3 ${toneClass.icon}`}>{createElement(icon, { className: "w-5 h-5" })}</div></div></div>;
}

export function SensorRow({ name, value, unit, status, threshold, percent, icon, tone = "neutral" }) {
  const toneClass = statToneClasses[tone];
  return <div className="rounded-2xl border border-[#263449] bg-[#0B1220] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className={`rounded-xl border p-2 ${toneClass.icon}`}>{createElement(icon, { className: "w-4 h-4" })}</div><div><p className="font-medium text-slate-100">{name}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${toneClass.badge}`}>{status}</span></div></div><div className="text-right"><p className={`text-lg font-bold ${toneClass.text}`}>{value} {unit}</p>{threshold ? <p className="mt-1 text-xs text-slate-400">Ngưỡng: {threshold}</p> : null}</div></div><div className="mt-3"><ProgressBar value={percent} tone={tone} /></div></div>;
}
