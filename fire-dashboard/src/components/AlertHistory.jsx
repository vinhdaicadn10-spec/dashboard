import { useEffect, useMemo, useState } from "react";

// BAI 11: Lich su tu MongoDB, khong nhan history React gia lap cua App.jsx.
const API = "http://127.0.0.1:8000";
const GATEWAY_ID = "GW-SIM-01";
const POLL_MS = 5000;

const eventTitles = {
  ALARM_TRIGGERED: "Bắt đầu cảnh báo khói",
  ALARM_CLEARED: "Kết thúc cảnh báo khói",
  BUTTON_PRESSED: "Nhấn nút khẩn cấp NODE-01",
  BUTTON_RESET: "Reset cảnh báo nút nhấn",
  ACTUATOR_ON: "Còi/đèn chuyển sang BẬT",
  ACTUATOR_OFF: "Còi/đèn chuyển sang TẮT",
  OPERATOR_ALARM_TRIGGERED: "Báo động thủ công từ Dashboard",
  OPERATOR_ALARM_RESET: "Reset báo động từ Dashboard",
  MANUAL_SIREN_ON: "Bật còi thủ công",
  MANUAL_SIREN_OFF: "Tắt còi thủ công",
  MANUAL_LIGHT_ON: "Bật đèn thủ công",
  MANUAL_LIGHT_OFF: "Tắt đèn thủ công",
};

function eventCategory(event) {
  if (event.event_type === "OPERATOR_ALARM_TRIGGERED") return "alert";
  if (event.source === "smoke" || event.source === "button") return "alert";
  if (event.source === "manual" || event.source === "operator") return "action";
  return "system";
}

function appearance(event) {
  const type = event.event_type;
  if (["ALARM_TRIGGERED", "BUTTON_PRESSED", "OPERATOR_ALARM_TRIGGERED"].includes(type))
    return { name: "ALERT", cls: "bg-red-600 text-white", row: "bg-[#fff0f1]" };
  if (["ALARM_CLEARED", "BUTTON_RESET", "OPERATOR_ALARM_RESET"].includes(type))
    return { name: "RESET", cls: "bg-emerald-700 text-white", row: "bg-white" };
  if (eventCategory(event) === "action")
    return { name: "MANUAL", cls: "bg-blue-700 text-white", row: "bg-white" };
  return { name: "SYSTEM", cls: "bg-slate-700 text-slate-100", row: "bg-white" };
}

function when(dateValue) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", hour12: false,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function saigonDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function eventDetail(e) {
  if (e.source === "smoke" && typeof e.adc_value === "number") return `ADC khói: ${e.adc_value}`;
  if (e.source === "actuator" && typeof e.siren_on === "boolean" && typeof e.light_on === "boolean")
    return `NODE-03 · Còi ${e.siren_on ? "BẬT" : "TẮT"} · Đèn ${e.light_on ? "BẬT" : "TẮT"}`;
  if (e.source === "manual" && typeof e.enabled === "boolean")
    return `Yêu cầu ${e.device === "siren" ? "còi" : "đèn"} ${e.enabled ? "BẬT" : "TẮT"} từ Dashboard`;
  if (e.source === "operator") return "Thao tác từ Dashboard · GW-SIM-01";
  return e.node_id ? `Thiết bị: ${e.node_id}` : "—";
}

export default function AlertHistory() {
  const [events, setEvents] = useState([]);
  const [kind, setKind] = useState("all");
  const [period, setPeriod] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let disposed = false;
    let timer;
    let controller;
    async function load() {
      controller = new AbortController();
      try {
        const response = await fetch(`${API}/api/events/history/${GATEWAY_ID}?source=all&limit=100`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!Array.isArray(result.events)) throw new Error("Dữ liệu API thiếu trường events");
        if (!disposed) {
          setEvents(result.events);
          setCheckedAt(new Date().toISOString());
          setError("");
          setNow(Date.now());
        }
      } catch (e) {
        if (!disposed && e.name !== "AbortError") {
          setEvents([]); // Khong hien du lieu cu nhu su kien hien tai khi mat Backend.
          setError(e.message || "Không kết nối được Backend");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
          timer = setTimeout(load, POLL_MS);
        }
      }
    }
    load();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); };
  }, []);

  const filtered = useMemo(() => {
    const today = saigonDateKey(new Date(now));
    return events.filter((e) => {
      const date = new Date(e.occurred_at);
      if (Number.isNaN(date.getTime())) return false;
      if (kind !== "all" && kind !== eventCategory(e)) return false;
      if (period === "today" && saigonDateKey(date) !== today) return false;
      if (period === "7d" && (date.getTime() < now - 7 * 86400000 || date.getTime() > now)) return false;
      if (period === "30d" && (date.getTime() < now - 30 * 86400000 || date.getTime() > now)) return false;
      return true;
    });
  }, [events, kind, period, now]);

  return (
    <section className="mt-6 rounded-2xl border border-[#263449] bg-[#101928] p-4 sm:p-5 text-slate-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-wide">LỊCH SỬ SỰ KIỆN</h3>
          <p className="mt-1 text-xs text-slate-400">Từ MongoDB · GW-SIM-01 · Tự cập nhật khoảng 5 giây/lần</p>
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="history-kind">Loại sự kiện</label>
          <select id="history-kind" value={kind} onChange={e => setKind(e.target.value)}
            className="rounded-xl border border-[#40506a] bg-[#172339] px-3 py-2 text-sm text-white">
            <option value="all">Tất cả</option>
            <option value="alert">Cảnh báo</option>
            <option value="action">Thao tác</option>
            <option value="system">Hệ thống</option>
          </select>
          <label className="sr-only" htmlFor="history-period">Khoảng thời gian</label>
          <select id="history-period" value={period} onChange={e => setPeriod(e.target.value)}
            className="rounded-xl border border-[#40506a] bg-[#172339] px-3 py-2 text-sm text-white">
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="all">Tất cả thời gian</option>
          </select>
        </div>
      </div>
      {error ? <p role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">Không tải được lịch sử từ FastAPI: {error}</p> : null}
      {loading ? <p className="p-4 text-sm text-slate-400">Đang tải lịch sử MongoDB...</p> : null}
      {!loading && !error && filtered.length === 0 ? <p className="p-4 text-sm text-slate-400">Chưa có sự kiện phù hợp với bộ lọc.</p> : null}
      {!error && !loading && filtered.length > 0 ? (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-[#dbe2eb]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#eef2f7] text-xs uppercase text-slate-700">
              <tr>
                <th className="px-4 py-4">Thời gian</th>
                <th className="px-4 py-4">Mức độ</th>
                <th className="px-4 py-4">Sự kiện</th>
                <th className="px-4 py-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7dee8]">
              {filtered.map((e, index) => {
                const look = appearance(e);
                return (
                  <tr key={`${e.source}-${e.event_type}-${e.occurred_at}-${index}`} className={look.row}>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">{when(e.occurred_at)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${look.cls}`}>{look.name}</span></td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{eventTitles[e.event_type] || e.description || e.event_type}</td>
                    <td className="px-4 py-4 text-slate-500">{eventDetail(e)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        {filtered.length} sự kiện hiển thị · Chỉ truy vấn tối đa 100 sự kiện gần nhất · {checkedAt ? `Đồng bộ: ${when(checkedAt)}` : "Chưa đồng bộ"}.
        Lịch sử lấy từ sự kiện đã lưu, không tạo cảnh báo giả theo chu kỳ.
      </p>
    </section>
  );
}
