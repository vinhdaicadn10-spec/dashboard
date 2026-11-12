import { useEffect, useState } from "react";

// Backend FastAPI tren cung may voi trinh duyet Dashboard.
const API_URL = "http://127.0.0.1:8000/api/system/overview/GW-SIM-01";
const REFRESH_MS = 5000;

const STATUS_DISPLAY = {
  NORMAL: { text: "BÌNH THƯỜNG (DEMO)", badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  ALARM: { text: "ĐANG CẢNH BÁO (DEMO)", badge: "border-red-500/40 bg-red-500/10 text-red-300" },
  DEGRADED: { text: "CÓ NODE OFFLINE", badge: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  UNKNOWN: { text: "CHƯA XÁC ĐỊNH", badge: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
};

function timeSaigon(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Saigon", hour12: false });
}

function stateText(value, known) {
  if (!known || typeof value !== "boolean") return "CHƯA XÁC ĐỊNH";
  return value ? "BẬT" : "TẮT";
}

export default function SystemOverviewPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;

    async function load() {
      controller = new AbortController();
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json.gateway || !json.nodes || !json.smoke || !json.button || !json.actuator) {
          throw new Error("Backend tra ve du lieu khong hop le");
        }
        if (!stopped) {
          setData(json);
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          // Khong giu lai badge xanh neu mat ket noi Backend.
          setData(null);
          setError(err.message || "Khong ket noi duoc Backend");
        }
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(load, REFRESH_MS);
        }
      }
    }

    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, []);

  const overall = STATUS_DISPLAY[data?.overall_status] || STATUS_DISPLAY.UNKNOWN;

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            TỔNG QUAN HỆ THỐNG TỪ BACKEND
          </h3>
          <p className="mt-1 text-xs text-slate-400">GW-SIM-01 · FastAPI / MongoDB</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${error || !data ? STATUS_DISPLAY.UNKNOWN.badge : overall.badge}`}>
          {error ? "LỖI BACKEND" : !data ? "ĐANG TẢI" : overall.text}
        </span>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-400">Đang lấy dữ liệu...</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Không lấy được tổng quan: {error}. Kiểm tra FastAPI và API /api/system/overview/GW-SIM-01.
        </p>
      )}

      {data && !error && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Gateway" value={data.gateway.status} detail={`Wi-Fi RSSI: ${typeof data.gateway.wifi_rssi_dbm === "number" ? `${data.gateway.wifi_rssi_dbm} dBm` : "--"}`} />
            <Metric label="Nodes Online" value={`${data.nodes.online} / ${data.nodes.total}`} detail={`${data.nodes.offline} Offline · ${data.nodes.stale} mất cập nhật`} />
            <Metric label="Cảm biến khói · NODE-02" value={data.smoke.data_fresh ? (data.smoke.adc_value ?? "--") : "MẤT CẬP NHẬT"} detail={data.smoke.alarm_active ? "Đang có cảnh báo ADC (demo)" : "Không có cảnh báo đã chốt"} />
            <Metric label="Nút khẩn cấp · NODE-01" value={data.button.data_fresh ? (data.button.pressed ? "ĐANG NHẤN" : "ĐÃ NHẢ") : "MẤT CẬP NHẬT"} detail={data.button.alarm_active ? "ĐANG GIỮ CẢNH BÁO" : "Không giữ cảnh báo"} />
            <Metric label="Còi · NODE-03" value={stateText(data.actuator.siren_on, data.actuator.state_known)} detail="Trạng thái báo cáo từ Simulator" />
            <Metric label="Đèn · NODE-03" value={stateText(data.actuator.light_on, data.actuator.state_known)} detail="Trạng thái báo cáo từ Simulator" />
          </div>

          {data.reasons?.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <strong>Cần chú ý:</strong> {data.reasons.join("; ")}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Cập nhật: {timeSaigon(data.checked_at)} · Tự làm mới khoảng 5 giây/lần · Chỉ giám sát demo, không điều khiển thiết bị thật.
          </p>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-[#263449] bg-slate-800/30 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
