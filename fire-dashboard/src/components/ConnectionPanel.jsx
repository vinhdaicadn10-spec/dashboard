import { useState } from "react";
import { AlertIcon } from "./icons";
import { Badge, Button } from "./ui";
import { styles } from "../styles";

// Cac component hien co: giu nguyen API va giao dien da hoat dong.
import NodeNetworkPanel from "./NodeNetworkPanel";
import GatewayStatus from "./GatewayStatus";
import SystemOverviewPanel from "./SystemOverviewPanel";
import SmokeSensorPanel from "./SmokeSensorPanel";
import ButtonBackendPanel from "./ButtonBackendPanel";
import ActuatorBackendPanel from "./ActuatorBackendPanel";
import EventHistoryPanel from "./EventHistoryPanel";
import BackendMonitoringPanel from "./BackendMonitoringPanel";

// KHONG import BackendMonitoringPanel: component do cung ve bieu do ADC,
// gay trung voi SmokeHistoryChart. Phan nhiet do + giam sat cam bien
// duoc xu ly trong MonitoringPanel.jsx.
export default function ConnectionPanel({
  wsUrl,
  onWsUrlChange,
  wsState,
  sourceMode,
  online,
  packetCount,
  wifiConnected,
  nodeNetwork,
  lastError,
  onConnect,
  onDisconnect,
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const isLive = sourceMode === "live";

  // Phan biet ket noi WebSocket that va che do mo phong.
  const wsConnected = isLive && wsState === "connected";
  const wsConnecting = isLive && wsState === "connecting";
  const wsBadgeText = !isLive
    ? "SIMULATION"
    : wsConnecting
      ? "WS CONNECTING"
      : wsConnected
        ? "WS ONLINE"
        : "WS OFFLINE";

  const wsBadgeColor = !isLive
    ? "#475569"
    : wsConnecting
      ? "#B45309"
      : wsConnected
        ? "#16A34A"
        : "#DC2626";

  return (
    <div className={`${styles.panel} p-4`}>
      <div>
        <p className="text-xs font-bold tracking-[0.12em] text-cyan-300">
          DEVICE GATEWAY
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-lg font-bold text-white">ESP32 Gateway</p>
          <Badge
            tone={wsConnected ? "safe" : "danger"}
            style={{
              backgroundColor: wsBadgeColor,
              borderColor: wsBadgeColor,
              color: "#FFFFFF",
            }}
          >
            {wsBadgeText}
          </Badge>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          {isLive
            ? "Nhãn trên phản ánh kết nối WebSocket. Trạng thái heartbeat FastAPI hiển thị ở dưới."
            : "Dữ liệu WebSocket đang ở chế độ mô phỏng. Trạng thái Gateway từ FastAPI hiển thị ở dưới."}
        </p>

        <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-slate-400">Nguồn dữ liệu</dt>
            <dd className="mt-1 font-semibold text-slate-100">
              {isLive ? "Live WebSocket" : "Simulation"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Địa chỉ WebSocket</dt>
            <dd className="mt-1 break-all font-semibold text-slate-100">{wsUrl}</dd>
          </div>
          <div>
            <dt className="text-slate-400">WebSocket</dt>
            <dd
              className={`mt-1 font-semibold ${
                wsState === "connected" ? "text-emerald-300" : "text-slate-300"
              }`}
            >
              {String(wsState ?? "unknown").toUpperCase()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Gói tin nhận</dt>
            <dd className="mt-1 font-semibold text-slate-100">{packetCount}</dd>
          </div>
        </dl>

        {/* Moi component tu goi API cua no: ConnectionPanel khong fetch trung. */}
        <div className="mt-4">
          <GatewayStatus />
        </div>

        <SystemOverviewPanel />

        <NodeNetworkPanel
          nodeNetwork={nodeNetwork}
          gatewayOnline={online}
          wifiConnected={wifiConnected}
        />

        {/* Thong so ADC hien tai va lich su canh bao khoi. */}
        <SmokeSensorPanel />

        {/* Nut khan cap va thiet bi chap hanh NODE-03. */}
        <ButtonBackendPanel />
        <ActuatorBackendPanel />

        {/* Lich su su kien tong hop MongoDB. */}
        <EventHistoryPanel />

        {/* Hai bieu do nhiet do va ADC khoi lay tu FastAPI / MongoDB. */}
        <BackendMonitoringPanel />

        {isLive && lastError ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <AlertIcon className="h-4 w-4" />
            Mất kết nối WebSocket ESP32
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={onConnect}
            disabled={wsState === "connecting"}
            style={{ backgroundColor: "#22D3EE", color: "#07121F" }}
          >
            {wsState === "connecting" ? "ĐANG KẾT NỐI" : "KẾT NỐI"}
          </Button>
          <Button
            variant="outline"
            onClick={onDisconnect}
            style={{
              backgroundColor: "#1E293B",
              borderColor: "#475569",
              color: "#FCA5A5",
            }}
          >
            NGẮT KẾT NỐI
          </Button>
          <button
            type="button"
            className="px-2 text-sm font-semibold text-slate-400 underline-offset-4 hover:text-white hover:underline"
            onClick={() => setShowTechnicalDetails((previous) => !previous)}
          >
            Chi tiết kỹ thuật
          </button>
        </div>
      </div>

      {showTechnicalDetails ? (
        <div className="mt-5 rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
          <label className="text-sm font-semibold text-slate-100">
            Địa chỉ WebSocket
          </label>
          <input
            value={wsUrl}
            onChange={(event) => onWsUrlChange(event.target.value)}
            className={`mt-2 ${styles.input}`}
            placeholder="ws://192.168.4.1/ws"
          />
          <p className="mt-3 text-xs text-slate-400">Socket: {wsState}</p>
          <code className="mt-2 block whitespace-pre-wrap break-all text-xs text-slate-300">
            {JSON.stringify({
              temperature: 36.5,
              smoke: 220,
              smokeSensorBattery: 86,
              buttonBattery: 91,
              flame: 0,
              buzzer: 0,
              warningLight: 0,
              online: 1,
              mode: "auto",
            })}
          </code>
          <p className="mt-2 text-xs text-slate-500">
            Gói JSON ở trên chỉ là ví dụ định dạng WebSocket.
          </p>
        </div>
      ) : null}
    </div>
  );
}
