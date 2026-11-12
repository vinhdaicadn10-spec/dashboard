import { useEffect, useMemo, useRef, useState } from "react";
import ActuatorStatus from "./components/ActuatorStatus";
import AlertHistory from "./components/AlertHistory";
import ConnectionPanel from "./components/ConnectionPanel";
import DashboardOverview from "./components/DashboardOverview";
import DashboardSidebar from "./components/DashboardSidebar";
import MonitoringPanel from "./components/MonitoringPanel";
import SystemControls from "./components/SystemControls";
import { styles } from "./styles";
import { formatTime, getStatus, normalizeIncomingData, runLogicTests } from "./lib/fireSystem";
import useBackendDashboardStatus from "./hooks/useBackendDashboardStatus";

const initialHistory = [
  { time: formatTime(), type: "SYSTEM", detail: "Hệ thống khởi động thành công" },
  { time: formatTime(), type: "NETWORK", detail: "Chế độ mặc định đang là mô phỏng" },
];

const seedData = Array.from({ length: 12 }).map((_, index) => ({
  time: `10:${String(index * 2).padStart(2, "0")}`,
  temperature: 30 + Math.round(Math.random() * 5),
  smoke: 120 + Math.round(Math.random() * 50),
}));

export default function App() {
  // Doc FastAPI/MongoDB moi 5 giay; khong bat/tat thiet bi.
  const backend = useBackendDashboardStatus();

  const [sourceMode, setSourceMode] = useState("sim");
  const [wsUrl, setWsUrl] = useState("ws://192.168.4.1/ws");
  const [wsState, setWsState] = useState("disconnected");
  const [lastError, setLastError] = useState("");
  const [packetCount, setPacketCount] = useState(0);
  const [lastPacketAt, setLastPacketAt] = useState(0);
  const [wifiConnected, setWifiConnected] = useState(null);
  const [nodeNetwork, setNodeNetwork] = useState({ totalNodes: 0, onlineNodes: 0, averageRssi: null, averageSnr: null, packetSuccessRate: null, averageLatency: null, nodes: [] });
  const [online, setOnline] = useState(true);
  const [modeAuto, setModeAuto] = useState(true);
  const [modeLoaded, setModeLoaded] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);
  const [modeError, setModeError] = useState("");
  const modeSavingRef = useRef(false);
  const requestedModeRef = useRef(null);
  const [buzzer, setBuzzer] = useState(false);
  const [warningLight, setWarningLight] = useState(false);
  const [manualEmergency, setManualEmergency] = useState(false);
  const [temperature, setTemperature] = useState(33);
  const [smokeValue, setSmokeValue] = useState(160);
  const [smokeSensorBattery, setSmokeSensorBattery] = useState(86);
  const [buttonBattery, setButtonBattery] = useState(91);
  const [flameDetected, setFlameDetected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(formatTime());
  const [history, setHistory] = useState(initialHistory);
  const [chartData, setChartData] = useState(seedData);
  const [testsPassed] = useState(() => runLogicTests());

  // FastAPI/MongoDB la nguon che do van hanh duy nhat.
  // Sau POST, bo qua snapshot GET cu cho den khi Backend xac nhan gia tri moi.
  useEffect(() => {
    if (backend.mode !== "AUTO" && backend.mode !== "MANUAL") return;
    const expectedMode = requestedModeRef.current;
    if (expectedMode !== null && backend.mode !== expectedMode) return;
    if (expectedMode === backend.mode) requestedModeRef.current = null;
    setModeAuto(backend.mode === "AUTO");
    setModeLoaded(true);
  }, [backend.mode]);

  // Khi Header/Sidebar doc backendStatus.mode, no cung thay doi ngay voi state App.
  // Neu API chua tai xong thi giu trang thai chua xac dinh.
  const backendStatusSynced = useMemo(
    () => ({ ...backend, mode: modeLoaded ? (modeAuto ? "AUTO" : "MANUAL") : backend.mode }),
    [backend, modeAuto, modeLoaded]
  );

  const wsRef = useRef(null);
  const temperatureRef = useRef(temperature);
  const smokeRef = useRef(smokeValue);
  const flameRef = useRef(flameDetected);

  useEffect(() => {
    temperatureRef.current = temperature;
    smokeRef.current = smokeValue;
    flameRef.current = flameDetected;
  }, [temperature, smokeValue, flameDetected]);

  const appendHistory = (type, detail) => {
    setHistory((previous) => {
      const entry = { time: formatTime(), type, detail };
      if (previous[0]?.detail === detail && previous[0]?.type === type) return previous;
      return [entry, ...previous].slice(0, 10);
    });
  };

  const pushChartPoint = (nextTemp, nextSmoke, timeText) => {
    setChartData((previous) => [...previous.slice(-11), { time: timeText || formatTime().slice(0, 5), temperature: nextTemp, smoke: nextSmoke }]);
  };

  const safeSend = (payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify(payload));
    return true;
  };

  const applyIncomingData = (payload) => {
    const normalized = normalizeIncomingData(payload);
    if (!normalized) return false;

    const nextTemp = normalized.temperature ?? temperatureRef.current;
    const nextSmoke = normalized.smoke ?? smokeRef.current;
    if (typeof normalized.temperature === "number") setTemperature(normalized.temperature);
    if (typeof normalized.smoke === "number") setSmokeValue(normalized.smoke);
    if (typeof normalized.flame === "boolean") setFlameDetected(normalized.flame);
    if (typeof normalized.buzzer === "boolean") setBuzzer(normalized.buzzer);
    if (typeof normalized.warningLight === "boolean") setWarningLight(normalized.warningLight);
    if (typeof normalized.online === "boolean") setOnline(normalized.online);
    if (typeof normalized.smokeSensorBattery === "number") setSmokeSensorBattery(normalized.smokeSensorBattery);
    if (typeof normalized.buttonBattery === "number") setButtonBattery(normalized.buttonBattery);
    if (typeof normalized.wifiConnected === "boolean") setWifiConnected(normalized.wifiConnected);
    if (normalized.nodeNetwork) setNodeNetwork((previous) => ({ ...previous, ...normalized.nodeNetwork }));
    // AUTO/MANUAL la che do luu trong FastAPI/MongoDB; khong dong bo tu
    // goi WebSocket mo phong de tranh ghi de che do da luu.

    setLastUpdate(normalized.timestamp || formatTime());
    setPacketCount((previous) => previous + 1);
    setLastPacketAt(Date.now());
    pushChartPoint(nextTemp, nextSmoke, formatTime().slice(0, 5));
    return true;
  };

  const closeSocket = () => {
    if (!wsRef.current) return;
    wsRef.current.onopen = null;
    wsRef.current.onmessage = null;
    wsRef.current.onerror = null;
    wsRef.current.onclose = null;
    wsRef.current.close();
    wsRef.current = null;
  };

  const connectWebSocket = () => {
    if (typeof window === "undefined" || typeof window.WebSocket === "undefined") {
      setLastError("Trình duyệt này không hỗ trợ WebSocket.");
      setWsState("error");
      return;
    }

    try {
      closeSocket();
      setLastError("");
      setWsState("connecting");
      setSourceMode("live");
      const socket = new WebSocket(wsUrl.trim());
      wsRef.current = socket;

      socket.onopen = () => {
        setWsState("connected");
        setOnline(true);
        setLastPacketAt(Date.now());
        appendHistory("NETWORK", `Đã kết nối WebSocket tới ${wsUrl.trim()}`);
      };
      socket.onmessage = (event) => {
        if (!applyIncomingData(event.data)) setLastError("Có gói tin không đúng định dạng JSON telemetry.");
      };
      socket.onerror = () => {
        setWsState("error");
        setLastError("Không thể kết nối tới endpoint WebSocket.");
        setWifiConnected(false);
      };
      socket.onclose = () => {
        setWsState("disconnected");
        setOnline(false);
        setWifiConnected(false);
        appendHistory("NETWORK", "WebSocket đã ngắt kết nối");
      };
    } catch (error) {
      setWsState("error");
      setLastError(error?.message || "Lỗi tạo kết nối WebSocket.");
    }
  };

  const disconnectWebSocket = () => {
    closeSocket();
    setWsState("disconnected");
    setSourceMode("sim");
    setOnline(true);
    setWifiConnected(false);
    appendHistory("NETWORK", "Chuyển về chế độ mô phỏng");
  };

  useEffect(() => {
    if (sourceMode !== "sim") return undefined;

    const interval = setInterval(() => {
      const nextTemperature = Math.max(24, Math.min(75, temperatureRef.current + Math.floor(Math.random() * 5) - 2));
      const nextSmoke = Math.max(50, Math.min(800, smokeRef.current + Math.floor(Math.random() * 70) - 25));
      temperatureRef.current = nextTemperature;
      smokeRef.current = nextSmoke;
      const chance = Math.random();
      const nextFlame = manualEmergency || (chance > 0.96 ? true : chance < 0.86 ? false : flameRef.current);
      flameRef.current = nextFlame;
      setTemperature(nextTemperature);
      setSmokeValue(nextSmoke);
      pushChartPoint(nextTemperature, nextSmoke, formatTime().slice(0, 5));
      setFlameDetected(nextFlame);
      setOnline(true);
      setLastUpdate(formatTime());

      const status = getStatus({ temperature: nextTemperature, smoke: nextSmoke, flame: nextFlame });
      if (status.level >= 2) {
        setBuzzer(true);
        setWarningLight(true);
      }
      if (status.level === 1 && modeAuto) setWarningLight(true);
      if (status.level === 0 && modeAuto && !manualEmergency) {
        setBuzzer(false);
        setWarningLight(false);
      }
      if (status.level > 0) {
        const detailMap = {
          1: `Cảnh báo sớm: Temp ${nextTemperature}°C, Smoke ${nextSmoke} ppm`,
          2: `Nguy cơ cháy: Temp ${nextTemperature}°C, Smoke ${nextSmoke} ppm`,
          3: nextFlame ? "Cháy xác nhận: phát hiện lửa hoặc kích hoạt khẩn cấp" : `Mức nguy hiểm cao: Temp ${nextTemperature}°C, Smoke ${nextSmoke} ppm`,
        };
        appendHistory("ALERT", detailMap[status.level]);
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [manualEmergency, modeAuto, sourceMode]);

  useEffect(() => {
    if (sourceMode !== "live") return undefined;
    const interval = setInterval(() => {
      if (lastPacketAt && Date.now() - lastPacketAt > 8000) setOnline(false);
    }, 2000);
    return () => clearInterval(interval);
  }, [lastPacketAt, sourceMode]);

  useEffect(() => () => closeSocket(), []);

  const systemStatus = useMemo(() => getStatus({ temperature, smoke: smokeValue, flame: flameDetected || manualEmergency }), [temperature, smokeValue, flameDetected, manualEmergency]);

  // Dung chung cho nut AUTO/MANUAL lon va cong tac Sidebar.
  // CHI thay doi state sau khi Backend xac nhan da luu MongoDB.
  const updateAutoMode = async (nextValue) => {
    if (typeof nextValue !== "boolean") return false;
    if (modeSavingRef.current) return false;
    if (!modeLoaded) {
      setModeError("Chua tai duoc che do tu Backend. Kiem tra FastAPI truoc khi doi.");
      return false;
    }
    if (modeAuto === nextValue) return true;

    const newMode = nextValue ? "AUTO" : "MANUAL";
    modeSavingRef.current = true;
    setModeSaving(true);
    setModeError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/control/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway_id: "GW-SIM-01", mode: newMode }),
      });
      const data = await response.json();
      if (!response.ok || data.mode !== newMode) {
        throw new Error(typeof data.detail === "string" ? data.detail : `Khong luu duoc che do (HTTP ${response.status})`);
      }

      requestedModeRef.current = newMode;
      setModeAuto(nextValue);
      appendHistory("ACTION", `Da luu che do ${newMode} vao MongoDB`);
      return true;
    } catch (error) {
      setModeError(error?.message || "Khong ket noi duoc Backend");
      return false;
    } finally {
      modeSavingRef.current = false;
      setModeSaving(false);
    }
  };
  const updateBuzzer = (nextValue) => {
    setBuzzer(nextValue);
    safeSend({ cmd: "set_buzzer", value: nextValue ? 1 : 0 });
    appendHistory("ACTION", `${nextValue ? "Bật" : "Tắt"} còi cảnh báo`);
  };
  const updateWarningLight = (nextValue) => {
    setWarningLight(nextValue);
    safeSend({ cmd: "set_light", value: nextValue ? 1 : 0 });
    appendHistory("ACTION", `${nextValue ? "Bật" : "Tắt"} đèn cảnh báo`);
  };
  const resetSystem = () => {
    setManualEmergency(false);
    setFlameDetected(false);
    setBuzzer(false);
    setWarningLight(false);
    safeSend({ cmd: "reset_alarm" });
    appendHistory("ACTION", "Người dùng reset cảnh báo");
  };
  const triggerEmergency = () => {
    setManualEmergency(true);
    setBuzzer(true);
    setWarningLight(true);
    safeSend({ cmd: "manual_alarm", value: 1 });
    appendHistory("MANUAL", "Kích hoạt báo động thủ công");
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.layout}>
          <DashboardSidebar
            online={online}
            lastUpdate={lastUpdate}
            modeAuto={modeAuto}
            onModeChange={updateAutoMode}
            sourceMode={sourceMode}
            wsState={wsState}
            smokeSensorBattery={smokeSensorBattery}
            buttonBattery={buttonBattery}
            testsPassed={testsPassed}
            backendStatus={backendStatusSynced}
          />

          <main className={styles.main}>
            <DashboardOverview
              systemStatus={systemStatus}
              modeAuto={modeAuto}
              lastUpdate={lastUpdate}
              temperature={temperature}
              smokeValue={smokeValue}
              online={online}
              sourceMode={sourceMode}
              wsState={wsState}
              backendStatus={backendStatusSynced}
            />

            <ConnectionPanel
              wsUrl={wsUrl}
              onWsUrlChange={setWsUrl}
              wsState={wsState}
              sourceMode={sourceMode}
              online={online}
              packetCount={packetCount}
              wifiConnected={wifiConnected}
              nodeNetwork={nodeNetwork}
              lastError={lastError}
              onConnect={connectWebSocket}
              onDisconnect={disconnectWebSocket}
            />

            <MonitoringPanel
              chartData={chartData}
              temperature={temperature}
              smokeValue={smokeValue}
            >
              <SystemControls
                modeAuto={modeAuto}
                buzzer={buzzer}
                warningLight={warningLight}
                onModeChange={updateAutoMode}
                modeSaving={modeSaving}
                modeError={modeError}
                modeLoaded={modeLoaded}
                onBuzzerChange={updateBuzzer}
                onWarningLightChange={updateWarningLight}
                onEmergency={triggerEmergency}
                onReset={resetSystem}
              />
              <ActuatorStatus
                wsState={wsState}
                backendStatus={backendStatusSynced}
              />
            </MonitoringPanel>

            <AlertHistory history={history} />
          </main>
        </div>
      </div>
    </div>
  );
}
