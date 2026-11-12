// Chen vao ben trong DashboardSidebar.jsx thay cho khoi ONLINE/pin gia cu.
export default function BackendSidebarStatus({ backendStatus }) {
  const b = backendStatus;
  const gateway = b?.gateway?.status === "ONLINE" ? "ONLINE (DEMO)" : b?.gateway?.status === "OFFLINE" ? "OFFLINE" : "CHƯA CÓ DỮ LIỆU";
  const rows = [
    ["STM32", "CHƯA CÓ DỮ LIỆU"],
    ["Gateway", gateway],
    ["Pin cảm biến khói", b?.smokeBatteryPercent == null ? "CHƯA CÓ DỮ LIỆU" : `${b.smokeBatteryPercent}%`],
    ["Pin nút nhấn", b?.buttonBatteryPercent == null ? "CHƯA CÓ DỮ LIỆU" : `${b.buttonBatteryPercent}%`],
  ];
  return (
    <div className="rounded-2xl border border-[#263449] bg-[#101928] p-4 text-slate-100">
      <p className="mb-3 font-semibold">Thiết bị kết nối</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 py-2 text-xs">
          <span className="text-slate-300">{label}</span>
          <span className={`text-right font-bold ${value.startsWith("ONLINE") ? "text-emerald-300" : value === "OFFLINE" ? "text-red-300" : "text-amber-300"}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
