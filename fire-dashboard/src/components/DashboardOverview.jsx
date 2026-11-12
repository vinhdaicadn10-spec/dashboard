import { useEffect, useState } from "react";

// BAI 11: Header va 4 the tong quan chi doc FastAPI/MongoDB.
// Component nay giu API props cu de App.jsx khong phai thay doi.
// Khong dung temperature/smokeValue/online/systemStatus tu React Simulation.

function localTime(value, showDate = false) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    ...(showDate ? { day: "2-digit", month: "2-digit", year: "numeric" } : {}),
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function SummaryCard({ label, value, detail, badge, tone = "neutral" }) {
  const borders = { danger: "border-l-red-500", good: "border-l-emerald-500", warning: "border-l-amber-400", neutral: "border-l-slate-500" };
  const values = { danger: "text-red-300", good: "text-emerald-300", warning: "text-amber-300", neutral: "text-slate-100" };
  return (
    <div className={`min-w-0 rounded-2xl border border-[#263449] border-l-4 bg-[#101928] px-5 py-5 ${borders[tone] || borders.neutral}`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className={`mt-3 break-words text-2xl font-bold ${values[tone] || values.neutral}`}>{value}</p>
      {badge ? <p className="mt-2 text-xs font-semibold text-slate-300">{badge}</p> : null}
      <p className="mt-3 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default function DashboardOverview({ backendStatus }) {
  const [clock, setClock] = useState(() => localTime());
  useEffect(() => {
    const id = setInterval(() => setClock(localTime()), 1000);
    return () => clearInterval(id);
  }, []);

  const b = backendStatus;
  const ready = Boolean(b && !b.loading);
  const level = ready ? (b.overallStatus || "UNKNOWN") : "UNKNOWN";
  const mode = b?.mode === "AUTO" || b?.mode === "MANUAL" ? b.mode : "CHƯA RÕ";
  const gatewayOnline = b?.gateway?.status === "ONLINE" && !b?.errors?.overview;
  const knownSmoke = b?.smoke?.fresh === true && Number.isFinite(b?.smoke?.adc);
  const knownTemp = b?.temperature?.fresh === true && Number.isFinite(b?.temperature?.celsius);
  const smokeAlarm = b?.smoke?.alarmActive === true;
  const buttonAlarm = b?.button?.alarmActive === true;
  const operatorAlarm = b?.operator?.alarmActive === true;
  const alarmSources = [
    smokeAlarm ? "Cảm biến khói NODE-02" : null,
    buttonAlarm ? "Nút nhấn NODE-01" : null,
    operatorAlarm ? "Báo động từ Dashboard" : null,
  ].filter(Boolean);
  const system = {
    ALARM: { label: "ĐANG CẢNH BÁO", tone: "danger", banner: "border-red-500/40 bg-red-950/25 text-red-200" },
    NORMAL: { label: "BÌNH THƯỜNG", tone: "good", banner: "border-emerald-500/30 bg-emerald-950/15 text-emerald-200" },
    DEGRADED: { label: "KẾT NỐI KHÔNG ỔN ĐỊNH", tone: "warning", banner: "border-amber-500/40 bg-amber-950/20 text-amber-200" },
    UNKNOWN: { label: "CHƯA XÁC ĐỊNH", tone: "warning", banner: "border-amber-500/40 bg-amber-950/20 text-amber-200" },
  }[level] || { label: "CHƯA XÁC ĐỊNH", tone: "warning", banner: "border-amber-500/40 bg-amber-950/20 text-amber-200" };

  const description = level === "ALARM"
    ? `Nguồn cảnh báo: ${alarmSources.join(" · ") || "Backend ghi nhận cảnh báo"}.`
    : level === "NORMAL"
    ? "Gateway và các Node đang báo cáo bình thường."
    : (b?.reasons?.length ? b.reasons.join("; ") : "Chưa đủ báo cáo mới để xác định trạng thái hệ thống.");

  return (
    <section className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-[#263449] bg-[#101928] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-cyan-300">FIRE CONTROL / FASTAPI + MONGODB</p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">TRUNG TÂM GIÁM SÁT &amp; CẢNH BÁO CHÁY</h1>
            <p className="mt-2 text-sm text-slate-400">Giám sát và điều khiển hai chiều · GW-SIM-01 (DEMO)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full border px-4 py-2 font-semibold ${system.tone === "danger" ? "border-red-500/40 bg-red-600 text-white" : system.tone === "good" ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300" : "border-amber-500/40 bg-amber-950/30 text-amber-300"}`}>{system.label}</span>
            <span className="rounded-full border border-[#34445e] bg-[#1d2a3e] px-4 py-2 font-semibold">{mode}</span>
            <span className="rounded-full border border-[#34445e] px-4 py-2 font-mono text-slate-300">{clock}</span>
          </div>
        </div>
      </header>

      <div className={`rounded-2xl border px-5 py-4 ${system.banner}`} role={level === "ALARM" ? "alert" : "status"}>
        <p className="font-bold">{level === "ALARM" ? "⚠ CẢNH BÁO HIỆN TẠI" : "TRẠNG THÁI HỆ THỐNG"}</p>
        <p className="mt-2 text-sm">{description}</p>
        {b?.errors?.overview ? <p className="mt-2 text-xs">Không đọc được API tổng quan. Kiểm tra FastAPI /api/system/overview/GW-SIM-01.</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Trạng thái" value={system.label} tone={system.tone}
          badge={level === "ALARM" ? "Có nguồn cảnh báo đang hoạt động" : undefined}
          detail="Đánh giá từ dữ liệu FastAPI/MongoDB" />
        <SummaryCard label="Nhiệt độ · NODE-02"
          value={knownTemp ? `${Number(b.temperature.celsius).toLocaleString("vi-VN", {maximumFractionDigits: 1})} °C` : "—"}
          tone={knownTemp ? "good" : "warning"}
          badge={knownTemp ? "Báo cáo còn mới" : "CHƯA CÓ DỮ LIỆU MỚI"}
          detail={knownTemp ? `Cập nhật: ${localTime(b.temperature.lastReceivedAt)}` : "Không lấy số liệu ngẫu nhiên từ giao diện"} />
        <SummaryCard label="Khói · NODE-02"
          value={knownSmoke ? `${b.smoke.adc} ADC` : "—"}
          tone={smokeAlarm ? "danger" : knownSmoke ? "good" : "warning"}
          badge={smokeAlarm ? "ĐANG CẢNH BÁO" : knownSmoke ? "Dữ liệu mới" : "CHƯA CÓ DỮ LIỆU MỚI"}
          detail="ADC thô từ cảm biến; chưa quy đổi sang ppm" />
        <SummaryCard label="Kết nối Gateway"
          value={!ready || b?.errors?.overview ? "CHƯA RÕ" : gatewayOnline ? "ONLINE" : "OFFLINE"}
          tone={!ready || b?.errors?.overview ? "warning" : gatewayOnline ? "good" : "danger"}
          badge="GW-SIM-01 · Simulator"
          detail={b?.gateway?.lastSeen ? `Heartbeat: ${localTime(b.gateway.lastSeen)}` : "Chưa có heartbeat"} />
      </div>
      <p className="text-xs text-slate-500">Nguồn: FastAPI / MongoDB · Kiểm tra dữ liệu khoảng 5 giây/lần · {b?.checkedAt ? `Lần tải: ${localTime(b.checkedAt, true)}` : "Đang chờ kết quả Backend"}</p>
    </section>
  );
}
