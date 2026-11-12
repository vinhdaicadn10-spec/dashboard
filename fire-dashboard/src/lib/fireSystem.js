export const formatTime = (date = new Date()) =>
  date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const getStatus = ({ temperature, smoke, flame }) => {
  if (flame || temperature >= 60 || smoke >= 600) {
    return { label: "NGUY HIỂM", tone: "danger", level: 3 };
  }
  if ((temperature >= 50 && smoke >= 350) || smoke >= 500) {
    return { label: "NGUY CƠ CHÁY", tone: "warning", level: 2 };
  }
  if (temperature >= 40 || smoke >= 250) {
    return { label: "CẢNH BÁO SỚM", tone: "caution", level: 1 };
  }
  return { label: "AN TOÀN", tone: "safe", level: 0 };
};

function parseBooleanLike(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "on", "yes", "online", "auto"].includes(normalized)) return true;
    if (["0", "false", "off", "no", "offline", "manual"].includes(normalized)) return false;
  }
  return null;
}

export function normalizeIncomingData(payload) {
  let raw = payload;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object") return null;
  const envelope = raw;
  if (raw.data && typeof raw.data === "object") raw = raw.data;

  const toNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const toText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
  const wifi = [raw.wifiMetrics, raw.wifi, envelope.wifiMetrics, envelope.wifi].find((value) => value && typeof value === "object") || {};
  const normalizeNodeNetwork = () => {
    const network = [raw.nodeNetwork, raw.node_network, raw.nodeLinkQuality, envelope.nodeNetwork, envelope.node_network, envelope.nodeLinkQuality].find((value) => value && typeof value === "object") || raw;
    const firstNumber = (...values) => values.map(toNumber).find((value) => value !== null);
    const firstValue = (...values) => values.find((value) => value !== undefined);
    const rawNodes = Array.isArray(network.nodes) ? network.nodes : Array.isArray(raw.nodes) ? raw.nodes : null;
    const totalNodes = firstNumber(network.totalNodes, network.total_nodes, raw.totalNodes, raw.total_nodes);
    const onlineNodes = firstNumber(network.onlineNodes, network.online_nodes, raw.onlineNodes, raw.online_nodes);
    const averageRssi = firstNumber(network.averageRssi, network.average_rssi, raw.averageRssi, raw.average_rssi);
    const averageSnr = firstNumber(network.averageSnr, network.average_snr, raw.averageSnr, raw.average_snr);
    const packetSuccessRate = firstNumber(network.packetSuccessRate, network.packet_success_rate, raw.packetSuccessRate, raw.packet_success_rate);
    const averageLatency = firstNumber(network.averageLatency, network.average_latency, raw.averageLatency, raw.average_latency);
    if (!rawNodes && [totalNodes, onlineNodes, averageRssi, averageSnr, packetSuccessRate, averageLatency].every((value) => value === undefined)) return null;

    const normalizedNetwork = {};
    if (totalNodes !== undefined) normalizedNetwork.totalNodes = Math.max(0, Math.round(totalNodes));
    if (onlineNodes !== undefined) normalizedNetwork.onlineNodes = Math.max(0, Math.round(onlineNodes));
    if (averageRssi !== undefined) normalizedNetwork.averageRssi = averageRssi;
    if (averageSnr !== undefined) normalizedNetwork.averageSnr = averageSnr;
    if (packetSuccessRate !== undefined) normalizedNetwork.packetSuccessRate = Math.max(0, Math.min(100, packetSuccessRate));
    if (averageLatency !== undefined) normalizedNetwork.averageLatency = Math.max(0, averageLatency);
    if (rawNodes) {
      normalizedNetwork.nodes = rawNodes.filter((node) => node && typeof node === "object").map((node) => {
        const lastSeen = firstValue(node.lastSeen, node.last_seen);
        const nodeOnline = parseBooleanLike(node.online ?? node.connected);
        return {
          id: toText(node.id ?? node.nodeId ?? node.node_id),
          name: toText(node.name ?? node.label),
          type: toText(node.type ?? node.deviceType ?? node.device_type),
          online: nodeOnline,
          rssi: toNumber(node.rssi),
          snr: toNumber(node.snr),
          packetSuccessRate: toNumber(node.packetSuccessRate ?? node.packet_success_rate),
          latency: toNumber(node.latency ?? node.latencyMs ?? node.latency_ms),
          battery: toNumber(node.battery ?? node.batteryLevel ?? node.battery_level),
          lastSeen: typeof lastSeen === "number" || (typeof lastSeen === "string" && lastSeen.trim()) ? lastSeen : null,
        };
      });
    }
    return normalizedNetwork;
  };

  const normalized = {};
  const temperature = toNumber(raw.temperature ?? raw.temp ?? raw.t);
  const smoke = toNumber(raw.smoke ?? raw.smokeValue ?? raw.mq2 ?? raw.s);
  const flame = parseBooleanLike(raw.flame ?? raw.fire ?? raw.f);
  const buzzer = parseBooleanLike(raw.buzzer ?? raw.alarm ?? raw.bz);
  const warningLight = parseBooleanLike(raw.warningLight ?? raw.light ?? raw.led ?? raw.l);
  const online = parseBooleanLike(raw.online ?? raw.connected ?? raw.net);
  const smokeSensorBattery = toNumber(raw.smokeSensorBattery ?? raw.smokeBattery ?? raw.smokeBatteryLevel ?? raw.smokeBat);
  const buttonBattery = toNumber(raw.buttonBattery ?? raw.buttonBatteryLevel ?? raw.buttonBat);
  const wifiConnected = parseBooleanLike(raw.wifiConnected ?? raw.wifi_connected ?? wifi.connected ?? wifi.isConnected ?? raw.connected);
  const nodeNetwork = normalizeNodeNetwork();

  if (temperature !== null) normalized.temperature = Math.max(0, Math.min(200, temperature));
  if (smoke !== null) normalized.smoke = Math.max(0, Math.min(5000, smoke));
  if (flame !== null) normalized.flame = flame;
  if (buzzer !== null) normalized.buzzer = buzzer;
  if (warningLight !== null) normalized.warningLight = warningLight;
  if (online !== null) normalized.online = online;
  if (smokeSensorBattery !== null) normalized.smokeSensorBattery = Math.max(0, Math.min(100, smokeSensorBattery));
  if (buttonBattery !== null) normalized.buttonBattery = Math.max(0, Math.min(100, buttonBattery));
  if (wifiConnected !== null) normalized.wifiConnected = wifiConnected;
  if (nodeNetwork) normalized.nodeNetwork = nodeNetwork;
  if (typeof raw.mode === "string") normalized.mode = raw.mode.toLowerCase() === "manual" ? "manual" : "auto";
  if (typeof raw.timestamp === "string" && raw.timestamp.trim()) normalized.timestamp = raw.timestamp.trim();

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function runLogicTests() {
  const statusCases = [
    { input: { temperature: 30, smoke: 100, flame: false }, expected: 0 },
    { input: { temperature: 42, smoke: 100, flame: false }, expected: 1 },
    { input: { temperature: 35, smoke: 260, flame: false }, expected: 1 },
    { input: { temperature: 52, smoke: 360, flame: false }, expected: 2 },
    { input: { temperature: 45, smoke: 510, flame: false }, expected: 2 },
    { input: { temperature: 61, smoke: 150, flame: false }, expected: 3 },
    { input: { temperature: 31, smoke: 620, flame: false }, expected: 3 },
    { input: { temperature: 31, smoke: 120, flame: true }, expected: 3 },
  ];
  const parseCases = [
    {
      input: '{"temperature":36.5,"smoke":280,"flame":0,"online":1}',
      expected: { temperature: 36.5, smoke: 280, flame: false, online: true },
    },
    {
      input: { data: { temp: "41", mq2: "333", fire: "true", led: 1 } },
      expected: { temperature: 41, smoke: 333, flame: true, warningLight: true },
    },
    { input: { smokeSensorBattery: "86", buttonBattery: 91 }, expected: { smokeSensorBattery: 86, buttonBattery: 91 } },
    { input: { wifi: { connected: true } }, expected: { wifiConnected: true } },
    { input: { nodeNetwork: { totalNodes: 2, onlineNodes: 1, averageRssi: "-64", packetSuccessRate: 98, nodes: [{ nodeId: "NODE-01", name: "Nút nhấn", type: "BUTTON", online: 1, rssi: "-55", packetSuccessRate: "99", battery: 86 }] } }, expected: { nodeNetwork: { totalNodes: 2, onlineNodes: 1, averageRssi: -64, packetSuccessRate: 98, nodes: [{ id: "NODE-01", name: "Nút nhấn", type: "BUTTON", online: true, rssi: -55, snr: null, packetSuccessRate: 99, latency: null, battery: 86, lastSeen: null }] } } },
    { input: { mode: "manual", connected: "offline" }, expected: { mode: "manual", online: false } },
    { input: "not-json", expected: null },
  ];

  return (
    statusCases.every((testCase) => getStatus(testCase.input).level === testCase.expected) &&
    parseCases.every((testCase) => JSON.stringify(normalizeIncomingData(testCase.input)) === JSON.stringify(testCase.expected))
  );
}
