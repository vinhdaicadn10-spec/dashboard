import { useEffect, useMemo, useState } from "react";

// BAI 4 - PHAN 16: Theo doi 2 luong gia lap tu FastAPI/MongoDB.
// Gio hien thi Asia/Saigon. Khong chuyen ADC thanh ppm.
const API = "http://127.0.0.1:8000";
const GATEWAY_ID = "GW-SIM-01";
const NODE_ID = "NODE-02";
const POLL_MS = 5000;
const STALE_MS = 30000;
const GAP_MS = 35000;
const W = 760;
const H = 250;
const PAD = { left: 55, right: 20, top: 18, bottom: 36 };

function displayTime(value) {
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return "--";
  return time.toLocaleString("vi-VN", {
    timeZone: "Asia/Saigon", hour12: false,
  });
}

function labelTime(time) {
  return new Date(time).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Saigon", hour: "2-digit", minute: "2-digit",
  });
}

async function readJSON(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function latestPoint(payload, field) {
  const valid = payload?.points?.filter((p) =>
    Number.isFinite(Date.parse(p.received_at)) &&
    typeof p[field] === "number" && Number.isFinite(p[field])
  ) ?? [];
  return valid.length ? valid[valid.length - 1] : null;
}

function TimeSeries({ title, payload, field, unit, color, referenceLines = [] }) {
  const graph = useMemo(() => {
    if (!payload?.points?.length) return null;
    const start = Date.parse(payload.window_start);
    const end = Date.parse(payload.window_end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

    const points = payload.points.map((point) => ({
      t: Date.parse(point.received_at), v: point[field],
    })).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
      .sort((a, b) => a.t - b.t);
    if (!points.length) return null;

    const values = points.map(p => p.v).concat(referenceLines.map(l => l.value));
    const min = field === "adc_value" ? 0 : Math.floor((Math.min(...values) - 4) / 5) * 5;
    const max = field === "adc_value"
      ? Math.max(2000, Math.ceil((Math.max(...values) + 50) / 200) * 200)
      : Math.ceil((Math.max(...values) + 4) / 5) * 5;
    const domainMax = max <= min ? min + 10 : max;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const x = t => PAD.left + ((Math.max(start, Math.min(end, t)) - start) / (end - start)) * plotW;
    const y = v => PAD.top + (1 - (v - min) / (domainMax - min)) * plotH;
    const pieces = [];
    let current = [];
    for (const point of points) {
      if (current.length && point.t - current[current.length - 1].t > GAP_MS) {
        pieces.push(current);
        current = [];
      }
      current.push(point);
    }
    if (current.length) pieces.push(current);
    const paths = pieces.map(section => section.map((p, i) =>
      `${i ? "L" : "M"} ${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`
    ).join(" "));
    return {
      paths, points, x, y, min, max: domainMax,
      ticks: [0, 0.25, 0.5, 0.75, 1].map(a => min + (domainMax - min) * a),
      xTicks: [start, (start + end) / 2, end],
    };
  }, [payload, field, referenceLines]);

  return (
    <div className="rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      {!graph ? (
        <p className="mt-5 text-sm text-amber-300">Chưa có dữ liệu trong khoảng thời gian này.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}
          className="mt-3 h-auto w-full min-w-[380px]">
          {graph.ticks.map(tick => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={graph.y(tick)} y2={graph.y(tick)}
                stroke="#334155" strokeDasharray="3 5" />
              <text x={PAD.left - 10} y={graph.y(tick) + 4} textAnchor="end"
                fontSize="12" fill="#94a3b8">{Math.round(tick)}</text>
            </g>
          ))}
          {graph.xTicks.map((tick, index) => (
            <text key={index} x={graph.x(tick)} y={H - 9}
              textAnchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}
              fontSize="12" fill="#94a3b8">{labelTime(tick)}</text>
          ))}
          {referenceLines.map(line => (
            <line key={line.value} x1={PAD.left} x2={W - PAD.right}
              y1={graph.y(line.value)} y2={graph.y(line.value)}
              stroke={line.color} strokeDasharray="6 5" strokeWidth="1.5" />
          ))}
          {graph.paths.map((path, i) => (
            <path key={i} d={path} fill="none" stroke={color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {graph.points.length <= 80 && graph.points.map((point, index) => (
            <circle key={index} cx={graph.x(point.t)} cy={graph.y(point.v)} r="3.2" fill={color}>
              <title>{`${point.v} ${unit} · ${displayTime(point.t)}`}</title>
            </circle>
          ))}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
        <span>Đơn vị: {unit}</span>
        {referenceLines.map(line => (
          <span key={line.value} style={{ color: line.color }}>
            {line.label}: {line.value} {unit}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BackendMonitoringPanel() {
  const [minutes, setMinutes] = useState(15);
  const [temperature, setTemperature] = useState(null);
  const [smoke, setSmoke] = useState(null);
  const [errors, setErrors] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;
    async function refresh() {
      controller = new AbortController();
      const suffix = `/${NODE_ID}?gateway_id=${GATEWAY_ID}&minutes=${minutes}&limit=1200`;
      const endpoints = [
        `${API}/api/temperature/history${suffix}`,
        `${API}/api/smoke/history${suffix}`,
      ];
      const results = await Promise.allSettled(
        endpoints.map(url => readJSON(url, controller.signal))
      );
      if (stopped) return;
      setTemperature(results[0].status === "fulfilled" ? results[0].value : null);
      setSmoke(results[1].status === "fulfilled" ? results[1].value : null);
      setErrors({
        temperature: results[0].status === "rejected" ? String(results[0].reason) : "",
        smoke: results[1].status === "rejected" ? String(results[1].reason) : "",
      });
      setNow(Date.now());
      timer = setTimeout(refresh, POLL_MS);
    }
    refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [minutes]);

  const tempLast = latestPoint(temperature, "temperature_c");
  const smokeLast = latestPoint(smoke, "adc_value");
  const tempFresh = tempLast && (now - Date.parse(tempLast.received_at) <= STALE_MS);
  const smokeFresh = smokeLast && (now - Date.parse(smokeLast.received_at) <= STALE_MS);
  const smokeThresholds = smoke?.demo_thresholds;

  return (
    <section className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold tracking-[0.12em] text-cyan-300">
            GIÁM SÁT CẢM BIẾN TỪ MONGODB
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            NODE-02 · Dữ liệu mô phỏng · Giờ Asia/Saigon
          </p>
        </div>
        <label className="text-xs text-slate-300">
          Khoảng xem{" "}
          <select value={minutes} onChange={e => setMinutes(Number(e.target.value))}
            className="ml-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-white">
            {[5, 15, 60, 180].map(n => (
              <option key={n} value={n}>{n < 60 ? `${n} phút` : `${n / 60} giờ`}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]">
        <div className="grid min-w-0 gap-4">
          <div className="min-w-0 overflow-x-auto">
            <TimeSeries title="NHIỆT ĐỘ THEO THỜI GIAN (DEMO)" payload={temperature}
              field="temperature_c" unit="°C" color="#10b981"
              referenceLines={[{value:40, label:"Mốc hiển thị tham khảo (không ra lệnh)", color:"#fb7185"}]} />
          </div>
          <div className="min-w-0 overflow-x-auto">
            <TimeSeries title="GIÁ TRỊ ADC KHÓI THEO THỜI GIAN (DEMO)" payload={smoke}
              field="adc_value" unit="ADC" color="#22d3ee"
              referenceLines={smokeThresholds ? [
                {value:smokeThresholds.alarm_on_adc,label:"Bắt đầu cảnh báo demo",color:"#f87171"},
                {value:smokeThresholds.alarm_off_adc,label:"Kết thúc cảnh báo demo",color:"#fbbf24"},
              ] : []} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#263449] p-4">
          <h3 className="text-xs font-bold tracking-[0.1em] text-cyan-300">
            GIÁM SÁT CẢM BIẾN
          </h3>
          <div className="mt-4 rounded-xl border border-slate-700 p-3">
            <p className="text-sm text-slate-300">Nhiệt độ (giả lập)</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {tempLast ? `${tempLast.temperature_c} °C` : "--"}
            </p>
            <p className={`mt-1 text-xs ${tempFresh ? "text-emerald-300" : "text-amber-300"}`}>
              {tempFresh ? "DỮ LIỆU MỚI" : "CHƯA CÓ / MẤT CẬP NHẬT"}
            </p>
            <p className="mt-1 text-xs text-slate-400">{tempLast ? displayTime(tempLast.received_at) : "--"}</p>
            {errors.temperature && <p className="mt-2 text-xs text-red-300">Lỗi nhiệt độ: {errors.temperature}</p>}
          </div>
          <div className="mt-3 rounded-xl border border-slate-700 p-3">
            <p className="text-sm text-slate-300">Cảm biến khói (ADC giả lập)</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {smokeLast ? `${smokeLast.adc_value} / 4095` : "--"}
            </p>
            <p className={`mt-1 text-xs ${smokeFresh ? "text-emerald-300" : "text-amber-300"}`}>
              {smokeFresh ? "DỮ LIỆU MỚI" : "CHƯA CÓ / MẤT CẬP NHẬT"}
            </p>
            <p className="mt-1 text-xs text-slate-400">{smokeLast ? displayTime(smokeLast.received_at) : "--"}</p>
            {errors.smoke && <p className="mt-2 text-xs text-red-300">Lỗi khói: {errors.smoke}</p>}
          </div>
          <p className="mt-4 text-xs leading-5 text-amber-300">
            Không hiển thị ppm: ADC không thể quy đổi trực tiếp thành nồng độ khói khi chưa hiệu chuẩn.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Panel này chỉ đọc MongoDB qua FastAPI, không điều khiển còi/đèn. Các nút AUTO/MANUAL của Dashboard cũ chưa được kết nối trong bài này.
          </p>
        </div>
      </div>
    </section>
  );
}
