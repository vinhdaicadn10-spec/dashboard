import { useEffect, useState } from "react";

// PHAN 11: hien thi còi/den GIA LAP tu FastAPI, KHONG dieu khien phan cung.
const API_BASE = "http://127.0.0.1:8000/api/actuator";
const NODE_ID = "NODE-03";
const REFRESH_MS = 5000;

function vnTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Saigon",
    hour12: false,
  });
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export default function ActuatorBackendPanel() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;
    let timerId;
    let controller;

    async function reload() {
      controller = new AbortController();
      try {
        const newStatus = await fetchJson(
          `${API_BASE}/status/${NODE_ID}`,
          controller.signal
        );
        if (!stopped) {
          setStatus(newStatus);
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          setError(err.message || "Không kết nối được Backend");
        }
      } finally {
        if (!stopped) {
          setLoading(false);
          timerId = setTimeout(reload, REFRESH_MS);
        }
      }
    }

    reload();
    return () => {
      stopped = true;
      clearTimeout(timerId);
      controller?.abort();
    };
  }, []);

  // Trang thai cu / mat ket noi phai hien KHONG XAC DINH.
  const known = !error && status?.current_state_known === true;
  const badge = loading
    ? "ĐANG TẢI"
    : !known
      ? "MẤT CẬP NHẬT"
      : status.siren_on || status.light_on
        ? "ĐANG BẬT (DEMO)"
        : "ĐANG TẮT (DEMO)";
  const badgeColor = !known
    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
    : status.siren_on || status.light_on
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

  const stateLabel = (value) => !known ? "KHÔNG XÁC ĐỊNH" : value ? "BẬT" : "TẮT";

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            CÒI VÀ ĐÈN – NODE-03
          </h3>
          <p className="mt-1 text-xs text-slate-400">Điều khiển mô phỏng · FastAPI / MongoDB</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${badgeColor}`}>{badge}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#263449] bg-slate-800/30 p-4">
          <p className="text-xs text-slate-400">Còi cảnh báo</p>
          <p className="mt-2 text-xl font-bold">{stateLabel(status?.siren_on)}</p>
        </div>
        <div className="rounded-xl border border-[#263449] bg-slate-800/30 p-4">
          <p className="text-xs text-slate-400">Đèn cảnh báo</p>
          <p className="mt-2 text-xl font-bold">{stateLabel(status?.light_on)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Báo cáo gần nhất: {vnTime(status?.last_reported_at)}
      </p>
      {error && <p className="mt-2 text-xs text-amber-300">Lỗi API: {error}</p>}

      <p className="mt-3 text-xs text-slate-500">
        Chỉ mô phỏng phần mềm, không xác nhận thiết bị vật lý đã bật. Khi mất cập nhật,
        trạng thái thực tế không xác định. Báo cháy tại chỗ phải hoạt động độc lập.
      </p>
    </section>
  );
}
