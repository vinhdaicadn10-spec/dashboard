import { useEffect, useState } from "react";

// Dung API moi cua Phan 14. Phan 12 Simulator khong can sua.
const GATEWAY_ID = "GW-SIM-01";
const API_BASE = "http://127.0.0.1:8000/api/events";
const REFRESH_MS = 5000;

const sourceOptions = [
  { value: "all", label: "Tất cả thiết bị" },
  { value: "smoke", label: "Cảm biến khói" },
  { value: "button", label: "Nút nhấn khẩn cấp" },
  { value: "actuator", label: "Còi và đèn" },
];

const eventNames = {
  ALARM_TRIGGERED: "Bắt đầu cảnh báo khói",
  ALARM_CLEARED: "Kết thúc cảnh báo khói",
  BUTTON_PRESSED: "Nhấn nút khẩn cấp",
  BUTTON_RESET: "Reset cảnh báo nút nhấn",
  ACTUATOR_ON: "Bật còi và đèn",
  ACTUATOR_OFF: "Tắt còi và đèn",
};

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Saigon",
    hour12: false,
  });
}

function eventAppearance(type) {
  if (["ALARM_TRIGGERED", "BUTTON_PRESSED", "ACTUATOR_ON"].includes(type)) {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }
  if (["ALARM_CLEARED", "BUTTON_RESET", "ACTUATOR_OFF"].includes(type)) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
  return "border-slate-600 bg-slate-800 text-slate-300";
}

function eventDetails(event) {
  if (event.source === "smoke" && typeof event.adc_value === "number") {
    return `ADC: ${event.adc_value}`;
  }
  if (event.source === "actuator") {
    if (typeof event.siren_on === "boolean" && typeof event.light_on === "boolean") {
      return `Còi: ${event.siren_on ? "BẬT" : "TẮT"} · Đèn: ${event.light_on ? "BẬT" : "TẮT"}`;
    }
  }
  return "--";
}

export default function EventHistoryPanel() {
  const [source, setSource] = useState("all");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId;
    let controller;

    // Khi doi bo loc, khong giu lai su kien cua bo loc cu.
    setLoading(true);
    setError("");
    setEvents([]);

    async function loadHistory() {
      controller = new AbortController();

      try {
        const url = `${API_BASE}/history/${GATEWAY_ID}?source=${source}&limit=30`;
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        if (!Array.isArray(json.events)) {
          throw new Error("Phản hồi Backend không có danh sách events");
        }

        if (!cancelled) {
          setEvents(json.events);
          setError("");
          setLastUpdated(new Date().toISOString());
        }
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          setError(err.message || "Không thể tải lịch sử sự kiện");
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timerId = setTimeout(loadHistory, REFRESH_MS);
        }
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
      controller?.abort();
    };
  }, [source]);

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            LỊCH SỬ SỰ KIỆN TOÀN HỆ THỐNG
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {GATEWAY_ID} · Dữ liệu demo từ MongoDB · Cập nhật khoảng 5 giây/lần
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span>Lọc sự kiện:</span>
          <select
            aria-label="Lọc lịch sử sự kiện"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-lg border border-slate-600 bg-[#111B2D] px-3 py-2 text-slate-100"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span>Số sự kiện hiển thị: <strong className="text-white">{events.length}</strong></span>
        <span>Lần tải thành công: {formatTime(lastUpdated)}</span>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-slate-300">Đang tải lịch sử sự kiện...</p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Không lấy được lịch sử sự kiện ({error}). Kiểm tra FastAPI và API Phần 14.
        </p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">Chưa có sự kiện phù hợp trong MongoDB.</p>
      )}

      {!error && !loading && events.length > 0 && (
        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-[#263449]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-[#111B2D] text-slate-400">
              <tr>
                <th className="px-3 py-2 font-semibold">THỜI GIAN (SAIGON)</th>
                <th className="px-3 py-2 font-semibold">THIẾT BỊ</th>
                <th className="px-3 py-2 font-semibold">SỰ KIỆN</th>
                <th className="px-3 py-2 font-semibold">CHI TIẾT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]">
              {events.map((event, index) => (
                <tr key={`${event.source}-${event.event_type}-${event.occurred_at}-${index}`}>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                    {formatTime(event.occurred_at)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-white">{event.node_id || "--"}</span>
                    <span className="ml-2 text-slate-400">{event.source_label || event.source}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-md border px-2 py-1 font-semibold ${eventAppearance(event.event_type)}`}>
                      {eventNames[event.event_type] || event.description || event.event_type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                    {eventDetails(event)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Chỉ hiển thị tối đa 30 sự kiện gần nhất của bộ lọc. Bảng này chỉ dùng để theo dõi thử nghiệm,
        không thay thế chức năng cảnh báo tại thiết bị.
      </p>
    </section>
  );
}
