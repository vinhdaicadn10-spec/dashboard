import { useEffect, useState } from "react";
import { ActivityIcon, WifiIcon } from "./icons";

// Backend FastAPI dang chay tren cung may voi Dashboard.
// Neu mo Dashboard tren dien thoai/may khac, doi 127.0.0.1 thanh IP may Backend.
const API_BASE = "http://127.0.0.1:8000";
const GATEWAY_ID = "GW-SIM-01";
const POLL_INTERVAL_MS = 5000;
const NODE_STALE_MS = 30000;

const tones = {
  good: {
    text: "text-cyan-300",
    badge: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    bar: "bg-cyan-400",
  },
  medium: {
    text: "text-amber-300",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    bar: "bg-amber-400",
  },
  poor: {
    text: "text-red-300",
    badge: "border-red-400/30 bg-red-400/10 text-red-200",
    bar: "bg-red-400",
  },
  critical: {
    text: "text-red-200",
    badge: "border-red-500/40 bg-red-950/70 text-red-200",
    bar: "bg-red-500",
  },
  muted: {
    text: "text-slate-300",
    badge: "border-slate-600 bg-slate-800 text-slate-400",
    bar: "bg-slate-600",
  },
};

// Ho tro timestamp dang ISO (MongoDB/FastAPI), giay Unix, mili-giay Unix.
const getTimestamp = (lastSeen) => {
  if (typeof lastSeen === "number" && Number.isFinite(lastSeen)) {
    return lastSeen < 100000000000 ? lastSeen * 1000 : lastSeen;
  }
  if (typeof lastSeen !== "string" || !lastSeen.trim()) return null;
  const numericValue = Number(lastSeen);
  if (Number.isFinite(numericValue)) {
    return numericValue < 100000000000 ? numericValue * 1000 : numericValue;
  }
  const timestamp = Date.parse(lastSeen);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getLastSeenLabel = (timestamp, now) => {
  if (timestamp === null) return "N/A";
  const ageSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s trước`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m trước`;
  return `${Math.floor(ageSeconds / 3600)}h trước`;
};

// Backend bao cao "online/offline" la trang thai node tai lan gui gan nhat.
// Neu qua 30 giay khong co bao cao moi, hien "MAT CAP NHAT" thay vi
// khang dinh node van online/offline.
const getNodeState = (node, now) => {
  const timestamp = getTimestamp(node.last_reported_at);
  const lastSeen = getLastSeenLabel(timestamp, now);

  if (timestamp === null) {
    return { label: "CHƯA CÓ DỮ LIỆU", tone: "muted", state: "unknown", lastSeen };
  }
  if (now - timestamp > NODE_STALE_MS) {
    return { label: "MẤT CẬP NHẬT", tone: "medium", state: "stale", lastSeen };
  }
  if (node.status === "offline") {
    return { label: "OFFLINE", tone: "poor", state: "offline", lastSeen };
  }
  if (node.status === "online") {
    return { label: "ONLINE", tone: "good", state: "online", lastSeen };
  }
  return { label: "CHƯA XÁC ĐỊNH", tone: "muted", state: "unknown", lastSeen };
};

const getRssiQuality = (rssi, nodeState = "online") => {
  if (nodeState === "offline") return { label: "OFFLINE", tone: "poor", progress: 0 };
  if (nodeState === "stale" || nodeState === "unknown") {
    return { label: "N/A", tone: "muted", progress: 0 };
  }
  if (typeof rssi !== "number") return { label: "N/A", tone: "muted", progress: 0 };
  if (rssi >= -55) return { label: "RẤT TỐT", tone: "good", progress: 100 };
  if (rssi >= -65) return { label: "TỐT", tone: "good", progress: 75 };
  if (rssi >= -75) return { label: "TRUNG BÌNH", tone: "medium", progress: 50 };
  return { label: "YẾU", tone: "poor", progress: 25 };
};

const getMetricQuality = (metric, value) => {
  if (typeof value !== "number") return { label: "N/A", tone: "muted", progress: 0 };
  if (metric === "snr") {
    if (value >= 25) return { label: "TỐT", tone: "good", progress: 100 };
    if (value >= 15) return { label: "TRUNG BÌNH", tone: "medium", progress: 55 };
    return { label: "YẾU", tone: "poor", progress: 25 };
  }
  if (metric === "packet") {
    if (value >= 98) return { label: "TỐT", tone: "good", progress: 100 };
    if (value >= 95) return { label: "TRUNG BÌNH", tone: "medium", progress: 60 };
    return { label: "YẾU", tone: "poor", progress: 25 };
  }
  if (value < 50) return { label: "TỐT", tone: "good", progress: 100 };
  if (value <= 150) return { label: "TRUNG BÌNH", tone: "medium", progress: 55 };
  return { label: "KÉM", tone: "poor", progress: 25 };
};

const metricValue = (value, unit = "") =>
  typeof value === "number" ? (
    <>
      <span>{value}</span>
      {unit ? <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span> : null}
    </>
  ) : (
    "--"
  );

const average = (values) => {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!numbers.length) return null;
  return Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10;
};

async function getJson(url, signal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ConnectionPanel.jsx co the giu nguyen <NodeNetworkPanel ... />.
// React se bo qua cac prop cu; trang thai lay tu FastAPI/MongoDB.
export default function NodeNetworkPanel() {
  const [now, setNow] = useState(() => Date.now());
  const [nodes, setNodes] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodesError, setNodesError] = useState("");
  const [gatewayError, setGatewayError] = useState("");

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timerId;
    let activeController;

    async function refreshData() {
      activeController = new AbortController();
      const signal = activeController.signal;
      const results = await Promise.allSettled([
        getJson(`${API_BASE}/api/nodes`, signal),
        getJson(`${API_BASE}/api/gateway/status/${encodeURIComponent(GATEWAY_ID)}`, signal),
      ]);

      if (stopped) return;

      const [nodesResult, gatewayResult] = results;
      if (nodesResult.status === "fulfilled") {
        // Chap nhan { nodes: [...] } hoac truc tiep [...] tu API.
        const response = nodesResult.value;
        const list = Array.isArray(response) ? response : response?.nodes;
        if (Array.isArray(list)) {
          setNodes(list);
          setNodesError("");
        } else {
          setNodesError("Dinh dang API /api/nodes khong hop le.");
        }
      } else if (nodesResult.reason?.name !== "AbortError") {
        setNodesError(`Không lấy được danh sách Node: ${nodesResult.reason?.message || "Lỗi kết nối"}`);
      }

      if (gatewayResult.status === "fulfilled") {
        const data = gatewayResult.value;
        if (data && (data.status === "online" || data.status === "offline")) {
          setGateway(data);
          setGatewayError("");
        } else {
          setGateway(null);
          setGatewayError("Dữ liệu trạng thái Gateway không hợp lệ.");
        }
      } else if (gatewayResult.reason?.name !== "AbortError") {
        setGateway(null);
        setGatewayError(`Không lấy được Gateway: ${gatewayResult.reason?.message || "Lỗi kết nối"}`);
      }

      setLoading(false);
      // Sau moi lan lay du lieu moi, hen lan kiem tra tiep theo.
      timerId = setTimeout(refreshData, POLL_INTERVAL_MS);
    }

    refreshData();
    return () => {
      stopped = true;
      clearTimeout(timerId);
      activeController?.abort();
    };
  }, []);

  const nodeRows = nodes.map((node) => ({ node, link: getNodeState(node, now) }));
  const totalNodes = nodes.length;
  const onlineNodes = nodeRows.filter(({ link }) => link.state === "online").length;
  const offlineNodes = nodeRows.filter(({ link }) => link.state === "offline").length;
  const staleNodes = nodeRows.filter(({ link }) => link.state === "stale").length;
  const unknownNodes = nodeRows.filter(({ link }) => link.state === "unknown").length;
  const weakNodes = nodeRows.filter(({ node, link }) =>
    link.state === "online" && typeof node.rssi === "number" && node.rssi < -65
  ).length;

  const isGatewayOnline = gateway?.status === "online";
  const gatewayLabel = gateway?.status === "online" ? "ONLINE" : gateway?.status === "offline" ? "OFFLINE" : "N/A";
  const gatewayTone = tones[gateway?.status === "online" ? "good" : gateway?.status === "offline" ? "poor" : "muted"];
  const wifiRssi = typeof gateway?.wifi_rssi_dbm === "number" ? gateway.wifi_rssi_dbm : null;
  const wifiQuality = getRssiQuality(wifiRssi, isGatewayOnline ? "online" : "unknown");

  let networkStatus;
  if (nodesError) networkStatus = { label: "LỖI KẾT NỐI BACKEND", tone: "critical" };
  else if (loading) networkStatus = { label: "ĐANG TẢI DỮ LIỆU", tone: "muted" };
  else if (gateway?.status === "offline") networkStatus = { label: "GATEWAY OFFLINE", tone: "critical" };
  else if (gatewayError) networkStatus = { label: "CHƯA XÁC ĐỊNH GATEWAY", tone: "medium" };
  else if (totalNodes === 0) networkStatus = { label: "CHƯA CÓ DỮ LIỆU", tone: "muted" };
  else if (offlineNodes > 0) networkStatus = { label: "CÓ NODE MẤT KẾT NỐI", tone: "poor" };
  else if (staleNodes > 0) networkStatus = { label: "CÓ NODE MẤT CẬP NHẬT", tone: "medium" };
  else if (unknownNodes > 0) networkStatus = { label: "CÓ NODE CHƯA XÁC ĐỊNH", tone: "medium" };
  else if (weakNodes > 0) networkStatus = { label: "CÓ NODE TÍN HIỆU YẾU", tone: "medium" };
  else networkStatus = { label: "MẠNG ỔN ĐỊNH", tone: "good" };

  const networkTone = tones[networkStatus.tone];
  const nodeCountQuality = totalNodes === 0
    ? { label: "N/A", tone: "muted", progress: 0 }
    : onlineNodes === totalNodes
      ? { label: "ONLINE", tone: "good", progress: 100 }
      : staleNodes > 0 || unknownNodes > 0
        ? { label: "CHƯA XÁC ĐỊNH", tone: "medium", progress: Math.round((onlineNodes / totalNodes) * 100) }
        : onlineNodes > 0
          ? { label: "CÓ NODE OFFLINE", tone: "medium", progress: Math.round((onlineNodes / totalNodes) * 100) }
          : { label: "OFFLINE", tone: "poor", progress: 0 };

  // Chi tinh cac chi so chat luong tu Node duoc Backend tra ve.
  // Simulator hien tai CHUA gui RSSI/SNR/packet/latency tung Node -> se la N/A.
  const onlineRecords = nodeRows.filter(({ link }) => link.state === "online").map(({ node }) => node);
  const averageRssi = average(onlineRecords.map((node) => node.rssi));
  const averageSnr = average(onlineRecords.map((node) => node.snr));
  const averagePacket = average(onlineRecords.map((node) => node.packetSuccessRate));
  const averageLatency = average(onlineRecords.map((node) => node.latency));

  const metrics = [
    {
      label: "Nodes Online",
      value: totalNodes > 0 ? <><span>{onlineNodes}</span><span className="mx-1 text-slate-500">/</span><span>{totalNodes}</span></> : "--",
      quality: nodeCountQuality,
    },
    { label: "RSSI trung bình", value: metricValue(averageRssi, "dBm"), quality: getRssiQuality(averageRssi, "online") },
    { label: "SNR trung bình", value: metricValue(averageSnr, "dB"), quality: getMetricQuality("snr", averageSnr) },
    { label: "Packet Success", value: metricValue(averagePacket, "%"), quality: getMetricQuality("packet", averagePacket) },
    { label: "Latency trung bình", value: metricValue(averageLatency, "ms"), quality: getMetricQuality("latency", averageLatency) },
  ];

  return (
    <section className="mt-5 border-t border-[#263449] pt-4" aria-labelledby="node-network-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <WifiIcon className="h-4 w-4 text-cyan-300" />
            <h2 id="node-network-title" className="text-xs font-bold tracking-[0.12em] text-cyan-300">
              MẠNG WI-FI NODE
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">Gateway giao tiếp không dây với các node trong hệ thống</p>
          <p className="mt-1 text-[11px] text-slate-500">Nguồn trạng thái: FastAPI / MongoDB · Cập nhật mỗi 5 giây</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide ${networkTone.badge}`}>
          {networkStatus.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-[#263449] bg-[#0B1220]/70 px-3 py-2.5 text-xs">
        <p className="text-slate-400">
          Gateway: <span className={`ml-1 font-bold ${gatewayTone.text}`}>{gatewayLabel}</span>
        </p>
        <p className="text-slate-400">
          Nodes: <span className="ml-1 font-bold text-slate-100">{totalNodes > 0 ? `${onlineNodes} / ${totalNodes} ONLINE` : "N/A"}</span>
        </p>
        <p className="text-slate-400">
          Wi-Fi Gateway (RSSI lần cuối): <span className={`ml-1 font-bold ${wifiQuality.tone === "muted" ? tones.muted.text : tones[wifiQuality.tone].text}`}>
            {wifiRssi !== null ? `${wifiRssi} dBm` : "N/A"}
          </span>
        </p>
      </div>

      {nodesError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {nodesError}. Kiểm tra FastAPI, URL API và CORS.
        </p>
      )}
      {gatewayError && (
        <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {gatewayError}
        </p>
      )}

      <div className="mt-4 border-t border-[#263449] pt-4">
        <div className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-cyan-300" />
          <h3 className="text-xs font-bold tracking-[0.12em] text-cyan-300">CHẤT LƯỢNG MẠNG NODE</h3>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map(({ label, value, quality }) => {
          const tone = tones[quality.tone];
          return (
            <div key={label} className="rounded-xl border border-[#263449] bg-[#0B1220]/70 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                {label === "RSSI trung bình" ? (
                  <WifiIcon className={`h-4 w-4 ${tone.text}`} />
                ) : (
                  <ActivityIcon className={`h-4 w-4 ${tone.text}`} />
                )}
                {label}
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold tracking-wide ${tone.text}`}>{quality.label}</span>
                <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${quality.progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-[#263449] bg-[#0B1220]/70">
        <div className="border-b border-[#263449] px-3 py-2">
          <p className="text-xs font-semibold text-slate-300">Danh sách node</p>
        </div>

        {loading && nodes.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-400">Đang lấy dữ liệu từ Backend...</p>
        ) : nodeRows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-400">
            {nodesError ? "Không tải được danh sách node từ Backend." : "Chưa có node trong MongoDB."}
          </p>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0B1220] text-[10px] font-bold tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">TÊN NODE</th>
                  <th className="px-3 py-2">NODE ID</th>
                  <th className="px-3 py-2">LOẠI</th>
                  <th className="px-3 py-2">TRẠNG THÁI</th>
                  <th className="px-3 py-2">RSSI</th>
                  <th className="px-3 py-2">SNR</th>
                  <th className="px-3 py-2">PACKET</th>
                  <th className="px-3 py-2">LATENCY</th>
                  <th className="px-3 py-2">LAST SEEN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]">
                {nodeRows.map(({ node, link }, index) => {
                  const rssi = getRssiQuality(node.rssi, link.state);
                  const rssiTone = tones[rssi.tone];
                  const linkTone = tones[link.tone];
                  return (
                    <tr key={node.id || `${node.name || "node"}-${index}`} className="text-slate-300">
                      <td className="px-3 py-3 font-semibold text-slate-100">{node.name || "N/A"}</td>
                      <td className="px-3 py-3 text-slate-400">{node.id || "N/A"}</td>
                      <td className="px-3 py-3 text-slate-400">{node.type || "N/A"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${linkTone.badge}`}>
                          {link.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-28 items-center gap-2">
                          <span className={rssiTone.text}>{typeof node.rssi === "number" ? `${node.rssi} dBm` : "--"}</span>
                          <div className="h-1 w-10 overflow-hidden rounded-full bg-slate-800">
                            <div className={`h-full rounded-full ${rssiTone.bar}`} style={{ width: `${rssi.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{metricValue(node.snr, "dB")}</td>
                      <td className="px-3 py-3">{metricValue(node.packetSuccessRate, "%")}</td>
                      <td className="px-3 py-3">{metricValue(node.latency, "ms")}</td>
                      <td className={`px-3 py-3 font-medium ${linkTone.text}`}>{link.lastSeen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Trạng thái Node quá 30 giây không có báo cáo mới sẽ thành “MẤT CẬP NHẬT”.
        RSSI/SNR/Packet/Latency chỉ có số liệu khi API trả về chỉ số tương ứng của từng Node.
      </p>
    </section>
  );
}
