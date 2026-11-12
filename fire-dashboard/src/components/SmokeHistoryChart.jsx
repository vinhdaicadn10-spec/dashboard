import { useEffect, useMemo, useState } from "react";

// PHAN 15: Bieu do lich su ADC tu MongoDB qua FastAPI.
// Khong can cai thu vien ve bieu do: su dung SVG cua trinh duyet.
const API_BASE = "http://127.0.0.1:8000/api/smoke";
const GATEWAY_ID = "GW-SIM-01";
const NODE_ID = "NODE-02";
const REFRESH_MS = 5000;
const STALE_MS = 30000;
const GAP_MS = 35000; // Mat hon ~3 chu ky 10s thi ngat duong noi.

const SIZE = { width: 900, height: 310, left: 58, right: 24, top: 20, bottom: 50 };
const WINDOWS = [
  { minutes: 5, label: "5 phút" },
  { minutes: 15, label: "15 phút" },
  { minutes: 60, label: "1 giờ" },
  { minutes: 180, label: "3 giờ" },
];

function timeSaigon(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Saigon", hour12: false });
}

function shortTime(ms) {
  return new Date(ms).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Saigon", hour: "2-digit", minute: "2-digit",
  });
}

export default function SmokeHistoryChart() {
  const [minutes, setMinutes] = useState(15);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;

    async function reload() {
      controller = new AbortController();
      try {
        const url = `${API_BASE}/history/${NODE_ID}?gateway_id=${GATEWAY_ID}&minutes=${minutes}&limit=1200`;
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!Array.isArray(result.points) || !result.stats || !result.demo_thresholds) {
          throw new Error("Dữ liệu API không đúng cấu trúc");
        }
        if (!stopped) {
          setPayload(result);
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          setError(err.message || "Không tải được dữ liệu");
          setPayload(null);
        }
      } finally {
        if (!stopped) {
          setNow(Date.now());
          setLoading(false);
          timer = setTimeout(reload, REFRESH_MS);
        }
      }
    }

    setLoading(true);
    setPayload(null);
    reload();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [minutes]);

  const graph = useMemo(() => {
    if (!payload) return null;

    const startMs = Date.parse(payload.window_start);
    const endMs = Date.parse(payload.window_end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

    const width = SIZE.width - SIZE.left - SIZE.right;
    const height = SIZE.height - SIZE.top - SIZE.bottom;
    const maxValue = Math.max(
      2000,
      payload.demo_thresholds.alarm_on_adc + 200,
      ...payload.points.map(p => typeof p.adc_value === "number" ? p.adc_value : 0)
    );
    const yMax = Math.min(4500, Math.ceil(maxValue / 500) * 500);
    const toX = t => SIZE.left + Math.max(0, Math.min(1, (t - startMs) / (endMs - startMs))) * width;
    const toY = v => SIZE.top + height - Math.max(0, Math.min(1, v / yMax)) * height;

    const valid = payload.points
      .map(p => ({ t: Date.parse(p.received_at), v: p.adc_value }))
      .filter(p => Number.isFinite(p.t) && typeof p.v === "number" && p.v >= 0 && p.v <= 4095)
      .sort((a, b) => a.t - b.t);

    // Gap >35s -> tach duong, tranh hieu nham la da do lien tuc.
    const segments = [];
    let current = [];
    for (const p of valid) {
      if (current.length > 0 && p.t - current[current.length - 1].t > GAP_MS) {
        segments.push(current);
        current = [];
      }
      current.push(p);
    }
    if (current.length > 0) segments.push(current);

    const paths = segments.map(segment => segment.map((p, i) =>
      `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.v).toFixed(1)}`
    ).join(" "));
    const last = valid[valid.length - 1] || null;
    const yTicks = Array.from({ length: 5 }, (_, i) => (i * yMax) / 4);
    const xTicks = [startMs, (startMs + endMs) / 2, endMs];
    return { toX, toY, paths, last, valid, yTicks, xTicks, yMax };
  }, [payload]);

  const latestTime = graph?.last?.t;
  const stale = !latestTime || now - latestTime > STALE_MS;
  const stats = payload?.stats;

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            BIỂU ĐỒ ADC CẢM BIẾN KHÓI – NODE-02
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Lịch sử từ MongoDB · giờ Asia/Saigon · dữ liệu mô phỏng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="smoke-chart-window" className="text-xs text-slate-400">Khoảng xem</label>
          <select
            id="smoke-chart-window"
            value={minutes}
            onChange={event => setMinutes(Number(event.target.value))}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white"
          >
            {WINDOWS.map(w => <option key={w.minutes} value={w.minutes}>{w.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Số mẫu", value: payload?.count_returned ?? "--" },
          { label: "ADC thấp nhất", value: stats?.min_adc ?? "--" },
          { label: "ADC cao nhất", value: stats?.max_adc ?? "--" },
          { label: "ADC trung bình", value: stats?.avg_adc ?? "--" },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-[#263449] bg-slate-800/30 p-3">
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/30 p-3 text-xs text-red-300">
          Không lấy được lịch sử ADC: {error}. Kiểm tra FastAPI và API /api/smoke/history/NODE-02.
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-slate-400">Đang tải biểu đồ...</p>}
      {!loading && !error && payload?.points?.length === 0 && (
        <p className="mt-4 text-sm text-amber-300">
          Không có giá trị ADC trong khoảng thời gian này. Bạn có thể chọn khoảng dài hơn hoặc chạy Gateway Simulator.
        </p>
      )}

      {!loading && !error && graph && payload.points.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#263449] bg-slate-800/20 p-2">
          <svg viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Biểu đồ đường giá trị ADC theo thời gian, với ngưỡng cảnh báo thử nghiệm">
            {graph.yTicks.map(v => (
              <g key={v}>
                <line x1={SIZE.left} x2={SIZE.width - SIZE.right} y1={graph.toY(v)} y2={graph.toY(v)} stroke="#334155" strokeWidth="1" strokeDasharray="2 5" />
                <text x={SIZE.left - 10} y={graph.toY(v) + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{Math.round(v)}</text>
              </g>
            ))}
            {graph.xTicks.map((t, i) => (
              <text key={i} x={graph.toX(t)} y={SIZE.height - 17} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fill="#94a3b8" fontSize="12">{shortTime(t)}</text>
            ))}
            <line x1={SIZE.left} x2={SIZE.width - SIZE.right} y1={graph.toY(payload.demo_thresholds.alarm_on_adc)} y2={graph.toY(payload.demo_thresholds.alarm_on_adc)} stroke="#f87171" strokeDasharray="7 5" strokeWidth="1.6" />
            <line x1={SIZE.left} x2={SIZE.width - SIZE.right} y1={graph.toY(payload.demo_thresholds.alarm_off_adc)} y2={graph.toY(payload.demo_thresholds.alarm_off_adc)} stroke="#fbbf24" strokeDasharray="5 5" strokeWidth="1.4" />
            {graph.paths.map((d, i) => (
              <path key={i} d={d} stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {graph.valid.length <= 100 && graph.valid.map((p, i) => (
              <circle key={i} cx={graph.toX(p.t)} cy={graph.toY(p.v)} r="3" fill="#67e8f9">
                <title>{`ADC ${p.v} · ${timeSaigon(p.t)}`}</title>
              </circle>
            ))}
            {graph.last && (
              <circle cx={graph.toX(graph.last.t)} cy={graph.toY(graph.last.v)} r="5" fill="#67e8f9" stroke="#0B1220" strokeWidth="2">
                <title>{`Mẫu mới nhất: ADC ${graph.last.v} · ${timeSaigon(graph.last.t)}`}</title>
              </circle>
            )}
          </svg>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
        <span><span className="mr-1 text-cyan-300">━━</span> ADC theo thời gian</span>
        <span><span className="mr-1 text-red-300">┄┄</span> Bắt đầu cảnh báo demo ≥ 1500</span>
        <span><span className="mr-1 text-amber-300">┄┄</span> Kết thúc demo ≤ 1200</span>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <span>Mẫu cuối: {latestTime ? timeSaigon(latestTime) : "--"}</span>
        {stale && <span className="font-semibold text-amber-300">Không có mẫu mới trong 30 giây gần nhất</span>}
      </div>
      {payload?.truncated && (
        <p className="mt-2 text-xs text-amber-300">Có nhiều hơn 1200 mẫu trong khoảng chọn; biểu đồ chỉ hiển thị 1200 mẫu mới nhất.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Trục đứng là ADC (0–4095), trục ngang là thời gian Asia/Saigon. Đường biểu đồ bị ngắt nếu thiếu mẫu quá 35 giây.
        Chỉ là dữ liệu giả lập; không dùng biểu đồ hay ngưỡng demo để kết luận cháy thật.
      </p>
    </section>
  );
}
