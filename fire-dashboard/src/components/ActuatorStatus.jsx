import { styles } from "../styles";

// Bang TRANG THAI HE THONG o cot ben phai.
// KHONG su dung buzzer/warningLight/online cua mo phong React cu.
// Du lieu lay tu useBackendDashboardStatus o App.jsx.
const toneClasses = {
  success: { dot: "bg-emerald-400", text: "text-emerald-300" },
  danger: { dot: "bg-rose-400", text: "text-rose-300" },
  warning: { dot: "bg-amber-400", text: "text-amber-300" },
  neutral: { dot: "bg-slate-500", text: "text-slate-400" },
};

function StatusRow({ label, value, tone = "neutral" }) {
  const colors = toneClasses[tone] ?? toneClasses.neutral;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#263449] py-3 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`inline-flex items-center gap-2 text-sm font-bold ${colors.text}`}>
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
        {value}
      </span>
    </div>
  );
}

function getGatewayStatus(backendStatus) {
  const status = backendStatus?.gateway?.status;
  if (status === "ONLINE") return { value: "ONLINE (DEMO)", tone: "success" };
  if (status === "OFFLINE") return { value: "OFFLINE (DEMO)", tone: "danger" };
  return { value: "CHƯA CÓ DỮ LIỆU", tone: "warning" };
}

function getWebSocketStatus(wsState) {
  if (wsState === "connected") return { value: "CONNECTED", tone: "success" };
  if (wsState === "connecting") return { value: "CONNECTING", tone: "warning" };
  if (wsState === "error") return { value: "ERROR", tone: "danger" };
  return { value: "DISCONNECTED", tone: "neutral" };
}

function getActuatorStatus(backendStatus, key) {
  const actuator = backendStatus?.actuator;
  const fresh = actuator?.known === true;
  const value = actuator?.[key];

  // Chi ket luan BAT / TAT khi Node-03 co bao cao moi va hop le.
  if (!fresh || typeof value !== "boolean") {
    return { value: "CHƯA XÁC NHẬN", tone: "warning" };
  }
  return value
    ? { value: "ĐANG BẬT (DEMO)", tone: "success" }
    : { value: "ĐANG TẮT (DEMO)", tone: "neutral" };
}

function getModeStatus(backendStatus) {
  const mode = backendStatus?.mode;
  if (mode === "AUTO" || mode === "MANUAL") {
    return { value: mode, tone: "neutral" };
  }
  return { value: "CHƯA XÁC ĐỊNH", tone: "warning" };
}

export default function ActuatorStatus({ wsState, backendStatus }) {
  const gateway = getGatewayStatus(backendStatus);
  const websocket = getWebSocketStatus(wsState);
  const siren = getActuatorStatus(backendStatus, "sirenOn");
  const light = getActuatorStatus(backendStatus, "lightOn");
  const mode = getModeStatus(backendStatus);

  return (
    <div className={`${styles.panel} ${styles.section}`}>
      <h3 className="text-base font-bold tracking-wide text-white">TRẠNG THÁI HỆ THỐNG</h3>

      <div className="mt-4">
        {/* Chua co API STM32 nen tuyet doi khong hien thi ONLINE gia. */}
        <StatusRow label="STM32" value="CHƯA CÓ DỮ LIỆU" tone="warning" />
        <StatusRow label="Gateway GW-SIM-01" {...gateway} />
        <StatusRow label="WebSocket" {...websocket} />
        <StatusRow label="Còi (NODE-03)" {...siren} />
        <StatusRow label="Đèn (NODE-03)" {...light} />
        <StatusRow label="Chế độ" {...mode} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Gateway và còi/đèn lấy từ FastAPI/MongoDB. WebSocket được theo dõi riêng.
        Đây là dữ liệu mô phỏng, chưa xác nhận phần cứng thực tế.
      </p>
      {backendStatus?.errors?.overview ? (
        <p role="alert" className="mt-2 text-xs text-amber-300">
          Chưa đọc được trạng thái hệ thống từ Backend.
        </p>
      ) : null}
    </div>
  );
}
