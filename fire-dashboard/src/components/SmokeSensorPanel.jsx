import { useEffect, useState } from "react";

// Bai 4 - Phan 10: Hien thi ADC, canh bao DEMO va lich su su kien.
const BASE_URL = "http://127.0.0.1:8000/api/smoke";
const NODE_ID = "NODE-02";
const REFRESH_MS = 5000;
const STALE_MS = 30000;

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Saigon",
    hour12: false,
  });
}

async function getJson(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

export default function SmokeSensorPanel() {
  const [reading, setReading] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;

    async function reload() {
      controller = new AbortController();
      try {
        const latest = await getJson(
          `${BASE_URL}/latest/${NODE_ID}`,
          controller.signal
        );
        if (!Number.isInteger(latest.adc_value)) {
          throw new Error("Dữ liệu API không hợp lệ");
        }
        if (!stopped) {
          setReading(latest);
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          setError(err.message || "Không lấy được dữ liệu");
        }
      } finally {
        if (!stopped) {
          setNow(Date.now());
          setLoading(false);
          timer = setTimeout(reload, REFRESH_MS);
        }
      }
    }

    reload();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, []);

  const timestamp = reading ? Date.parse(reading.received_at) : NaN;
  const stale = !Number.isFinite(timestamp) || now - timestamp > STALE_MS;
  const fresh = !!reading && !stale && !error;
  const active = fresh && reading.alarm_active === true;
  const label = loading
    ? "ĐANG TẢI"
    : !fresh
      ? "MẤT CẬP NHẬT"
      : active
        ? "CẢNH BÁO THỬ NGHIỆM"
        : "CHƯA CẢNH BÁO (DEMO)";
  const toneClass = !fresh
    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
    : active
      ? "border-red-500/50 bg-red-500/10 text-red-300"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            CẢM BIẾN KHÓI – NODE-02
          </h3>
          <p className="mt-1 text-xs text-slate-400">ADC giả lập · FastAPI / MongoDB</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${toneClass}`}>
          {label}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-[#263449] bg-slate-800/30 p-4">
        <p className="text-xs text-slate-400">Giá trị ADC lần cuối</p>
        <div className="mt-1 text-3xl font-bold">
          {reading?.adc_value ?? "--"}
          <span className="ml-2 text-sm font-medium text-slate-400">/ 4095</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Nhận lúc: {formatTime(reading?.received_at)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Ngưỡng demo: bắt đầu ≥ 1500 · kết thúc ≤ 1200
        </p>
        {stale && reading && (
          <p className="mt-2 text-xs font-medium text-amber-300">
            Dữ liệu cũ: không thể kết luận trạng thái hiện tại.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-amber-300">Lỗi API: {error}</p>}

      <p className="mt-3 text-xs text-slate-500">
        CHỈ MÔ PHỎNG PHẦN MỀM. ADC không phải ppm; ngưỡng thử nghiệm không thể
        dùng để xác định cháy thật. Cảnh báo tại chỗ phải hoạt động độc lập với Backend.
      </p>
    </section>
  );
}
