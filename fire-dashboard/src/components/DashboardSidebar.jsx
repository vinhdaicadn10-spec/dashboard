import { createElement } from "react";
import { ActivityIcon, AlertIcon, BellIcon, SettingsIcon, ShieldIcon, ThermometerIcon } from "./icons";
import { Badge, Toggle } from "./ui";
import { styles } from "../styles";

const menuItems = [
  ["Tổng quan", ActivityIcon],
  ["Giám sát cảm biến", ThermometerIcon],
  ["Cảnh báo & sự cố", AlertIcon],
  ["Nhật ký hệ thống", BellIcon],
  ["Cấu hình hệ thống", SettingsIcon],
];

export default function DashboardSidebar({ online, lastUpdate, modeAuto, onModeChange, sourceMode, wsState, smokeSensorBattery, buttonBattery, testsPassed }) {
  const sourceBadgeTone = sourceMode === "sim" ? "neutral" : wsState === "connected" ? "safe" : wsState === "connecting" ? "caution" : wsState === "error" ? "danger" : "neutral";
  const deviceBadgeStyle = online
    ? { backgroundColor: "#16A34A", borderColor: "#16A34A", color: "#FFFFFF" }
    : { backgroundColor: "#DC2626", borderColor: "#DC2626", color: "#FFFFFF" };

  return <aside className={`${styles.side} rounded-3xl shadow-xl shadow-slate-950/20`} style={{ backgroundColor: "#0F172A" }}>
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-[#DC2626] p-3 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-400/30">
        <ShieldIcon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-[0.08em] text-white">FIRE CONTROL</h1>
        <p className="text-sm text-[#94A3B8]">Giám sát &amp; cảnh báo cháy</p>
      </div>
    </div>

    <div className="my-7 h-px bg-slate-700/70" />

    <nav className="space-y-2 text-sm">
      {menuItems.map(([label, icon], index) => (
        <div key={label} className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition-colors ${index === 0 ? "bg-[#DC2626] text-white shadow-md shadow-red-950/30" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}>
          {createElement(icon, { className: "h-4 w-4" })}
          <span>{label}</span>
        </div>
      ))}
    </nav>

    <div className="my-7 h-px bg-slate-700/70" />

    <p className="mb-3 px-1 text-[11px] font-bold tracking-[0.14em] text-[#94A3B8]">TRẠNG THÁI HỆ THỐNG</p>

    <div className="space-y-5">
      <div className="rounded-xl border border-[#243247] bg-[#111827] p-4">
        <p className="text-sm font-semibold text-white">Thiết bị kết nối</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#CBD5E1]">STM32</p>
            <Badge tone={online ? "safe" : "danger"} style={deviceBadgeStyle}>{online ? "ONLINE" : "OFFLINE"}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#CBD5E1]">ESP32</p>
            <Badge tone={online ? "safe" : "danger"} style={deviceBadgeStyle}>{online ? "ONLINE" : "OFFLINE"}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#CBD5E1]">Pin cảm biến khói</p>
            <p className={`text-xs font-bold ${smokeSensorBattery >= 50 ? "text-emerald-400" : smokeSensorBattery >= 20 ? "text-amber-400" : "text-red-400"}`}>{smokeSensorBattery}%</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#CBD5E1]">Pin nút nhấn</p>
            <p className={`text-xs font-bold ${buttonBattery >= 50 ? "text-emerald-400" : buttonBattery >= 20 ? "text-amber-400" : "text-red-400"}`}>{buttonBattery}%</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">Cập nhật cuối: {lastUpdate}</p>
      </div>

      <div className="rounded-xl border border-[#243247] bg-[#111827] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Chế độ vận hành</p>
            <p className={`mt-1 text-xs font-bold tracking-wide ${modeAuto ? "text-emerald-400" : "text-slate-200"}`}>{modeAuto ? "AUTO" : "MANUAL"}</p>
          </div>
          <Toggle checked={modeAuto} onChange={onModeChange} checkedClassName="bg-emerald-500" />
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">{modeAuto ? "Hệ thống tự xử lý cảnh báo" : "Điều khiển bởi người vận hành"}</p>
      </div>

      <div className="rounded-xl border border-[#243247] bg-[#111827] p-4">
        <p className="text-sm font-semibold text-white">Nguồn dữ liệu</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-[#94A3B8]">Trạng thái</p>
          <Badge tone={sourceBadgeTone} className={sourceMode === "live" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-slate-600 bg-slate-700 text-slate-100"}>{sourceMode === "live" ? "LIVE" : "SIMULATION"}</Badge>
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">{sourceMode === "live" ? "Đang nhận dữ liệu thời gian thực" : "Đang dùng dữ liệu mô phỏng"}</p>
      </div>

      <div className="rounded-xl border border-[#243247] bg-[#111827] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Tự kiểm tra hệ thống</p>
          <Badge tone={testsPassed ? "safe" : "danger"}>{testsPassed ? "PASS" : "FAIL"}</Badge>
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">Kiểm tra cảm biến, dữ liệu và logic cảnh báo</p>
      </div>
    </div>
  </aside>;
}
