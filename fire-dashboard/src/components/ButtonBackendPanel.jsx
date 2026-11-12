import { useEffect, useState } from "react";

// Bai 4 - Phan 12: NODE-01 EMERGENCY BUTTON (GIA LAP).
const API_BASE = "http://127.0.0.1:8000/api/button";
const NODE_ID = "NODE-01";
const REFRESH_MS = 5000;

function timeSaigon(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Saigon",
    hour12: false,
  });
}

async function readJson(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export default function ButtonBackendPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;

    async function load() {
      controller = new AbortController();
      try {
        const newStatus = await readJson(
          `${API_BASE}/status/${NODE_ID}`,
          controller.signal
        );
        if (!stopped) {
          setStatus(newStatus);
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          setError(err.message || "Khong lay duoc du lieu");
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

  const fresh = !error && status?.report_fresh === true;
  const latched = status?.alarm_active === true;
  const pressedLabel = !fresh
    ? "KHÔNG XÁC ĐỊNH"
    : status.pressed ? "ĐANG NHẤN" : "ĐÃ NHẢ";
  const alarmLabel = loading ? "ĐANG TẢI" : latched
    ? "CẢNH BÁO ĐÃ CHỐT (DEMO)"
    : !fresh ? "MẤT CẬP NHẬT" : "CHƯA CẢNH BÁO (DEMO)";
  const badgeColor = latched
    ? "border-red-500/50 bg-red-500/10 text-red-300"
    : !fresh
      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            NÚT NHẤN KHẨN CẤP – NODE-01
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Trạng thái giả lập · FastAPI / MongoDB
          </p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${badgeColor}`}>
          {alarmLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#263449] bg-slate-800/30 p-4">
          <p className="text-xs text-slate-400">Trạng thái nút nhấn mới nhất</p>
          <p className="mt-2 text-lg font-bold">{pressedLabel}</p>
        </div>
        <div className="rounded-xl border border-[#263449] bg-slate-800/30 p-4">
          <p className="text-xs text-slate-400">Cảnh báo được giữ (latch)</p>
          <p className="mt-2 text-lg font-bold">
            {latched ? "ĐANG GIỮ CẢNH BÁO" : fresh ? "KHÔNG CÓ" : "CHƯA XÁC ĐỊNH"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Báo cáo lúc: {timeSaigon(status?.last_reported_at)}
      </p>
      {!fresh && !loading && (
        <p className="mt-2 text-xs font-medium text-amber-300">
          Dữ liệu nút nhấn không mới: không thể xác nhận trạng thái vật lý.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-amber-300">Lỗi API: {error}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Nhả nút không tự tắt cảnh báo. Reset thủ công bằng Swagger sau khi đã nhả nút.
        Đây chỉ là bản thử nghiệm, không điều khiển phần cứng báo cháy.
      </p>
    </section>
  );
}
