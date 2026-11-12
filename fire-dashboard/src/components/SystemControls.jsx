import { AlertIcon, BellIcon, LightIcon } from "./icons";
import { Button } from "./ui";
import { styles } from "../styles";
import ControlModeSwitcher from "./ControlModeSwitcher";
import useOperatorAlarmDemo from "../hooks/useOperatorAlarmDemo";
import useManualControlDemo from "../hooks/useManualControlDemo";

// Cong tac phan anh BAO CAO NODE-03, khong tu thay doi khi POST vua thanh cong.
function ManualDeviceSwitch({ label, checked, disabled, onClick, reason }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      title={reason || `Gửi yêu cầu ${checked ? "TẮT" : "BẬT"} ${label} (DEMO)`}
      className={`relative inline-flex h-9 w-[62px] shrink-0 items-center rounded-full border transition-colors
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300
        disabled:cursor-not-allowed disabled:opacity-70
        ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-500 bg-slate-600"}`}
    >
      <span
        className={`absolute h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[32px]" : "translate-x-[4px]"
        }`}
      />
    </button>
  );
}

export default function SystemControls({
  modeAuto,
  onModeChange,
  modeSaving = false,
  modeError = "",
  modeLoaded = true,
  // App.jsx cu van co the truyen buzzer / warningLight: KHONG dung state gia lap do.
}) {
  const gatewayId = "GW-SIM-01";
  const operator = useOperatorAlarmDemo(gatewayId);
  const manual = useManualControlDemo(gatewayId);

  const known = operator.actuatorKnown;
  const sirenActive = known && operator.sirenOn === true;
  const lightActive = known && operator.lightOn === true;
  const alarmUnknown = operator.alarmActive === null;
  const manualReady = modeLoaded && !modeAuto && manual.status?.mode === "MANUAL";

  // Backend co the tu choi do canh bao NODE-01/NODE-02; frontend khong tu cho rang an toan.
  let disabledReason = "";
  if (!modeLoaded) disabledReason = "Đang tải chế độ vận hành";
  else if (modeSaving) disabledReason = "Đang chuyển AUTO/MANUAL";
  else if (modeAuto) disabledReason = "Chuyển sang MANUAL để điều khiển";
  else if (manual.loading || !manual.status) disabledReason = "Chưa đọc được lệnh MANUAL từ Backend";
  else if (manual.status.mode !== "MANUAL") disabledReason = "Đang đồng bộ chế độ MANUAL";
  else if (operator.loading || alarmUnknown) disabledReason = "Chưa xác nhận trạng thái báo động";
  else if (operator.alarmActive) disabledReason = "Đang có báo động Dashboard";
  else if (operator.pending || manual.pendingDevice) disabledReason = "Đang xử lý lệnh trước";
  else if (!known) disabledReason = "NODE-03 chưa báo cáo trạng thái mới";

  const requestedSiren = manual.status?.requested_siren_on === true;
  const requestedLight = manual.status?.requested_light_on === true;

  // Trong MANUAL va KHONG co bao dong Dashboard: neu yeu cau != bao cao -> dang cho xac nhan.
  // Khi NODE-01/NODE-02 dang canh bao, Backend se khong nhan them lenh, du UI chua biet.
  const sirenAwaiting = manualReady && known && operator.alarmActive === false
    && requestedSiren !== sirenActive;
  const lightAwaiting = manualReady && known && operator.alarmActive === false
    && requestedLight !== lightActive;

  function commandFor(device, reportedOn) {
    // API se kiem tra lai MANUAL, canh bao, heartbeat va do moi du lieu.
    manual.sendCommand(device, !reportedOn);
  }

  function statusText(on) {
    return !known ? "CHƯA CÓ XÁC NHẬN" : on ? "ĐANG BẬT" : "ĐANG TẮT";
  }

  function requestText(device, awaiting, requested) {
    if (!manualReady) return "Công tắc chỉ điều khiển khi ở MANUAL";
    if (awaiting) return `Đã yêu cầu ${requested ? "BẬT" : "TẮT"} · đang chờ NODE-03 xác nhận`;
    if (manual.pendingDevice === device) return "Đang gửi yêu cầu đến Backend...";
    return "Trạng thái được Gateway Simulator xác nhận";
  }

  return (
    <div className={`${styles.panel} ${styles.section}`}>
      <h3 className="text-base font-bold tracking-wide text-white">ĐIỀU KHIỂN HỆ THỐNG</h3>

      <div className="mt-5 space-y-6">
        <div className="rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
          <p className="text-xs font-bold tracking-[0.12em] text-cyan-300">CHẾ ĐỘ VẬN HÀNH</p>
          <div className="mt-3">
            <ControlModeSwitcher
              gatewayId={gatewayId}
              modeAuto={modeAuto}
              onModeChange={onModeChange}
              modeSaving={modeSaving}
              modeError={modeError}
              modeLoaded={modeLoaded}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
          <div className="flex items-center gap-3">
            <BellIcon className="h-5 w-5 shrink-0 text-cyan-300" />
            <div>
              <p className="font-medium text-slate-100">Còi cảnh báo</p>
              <p className={`text-xs font-semibold ${!known ? "text-amber-300" : sirenActive ? "text-emerald-300" : "text-slate-400"}`}>
                {statusText(sirenActive)} (NODE-03)
              </p>
              <p className={`mt-1 text-xs ${sirenAwaiting ? "text-amber-300" : "text-slate-500"}`}>
                {requestText("siren", sirenAwaiting, requestedSiren)}
              </p>
            </div>
          </div>
          <ManualDeviceSwitch
            label="Còi cảnh báo NODE-03"
            checked={sirenActive}
            disabled={Boolean(disabledReason) || sirenAwaiting}
            reason={disabledReason || (sirenAwaiting ? "Đang chờ NODE-03 xác nhận lệnh còi" : "")}
            onClick={() => commandFor("siren", sirenActive)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
          <div className="flex items-center gap-3">
            <LightIcon className="h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="font-medium text-slate-100">Đèn cảnh báo</p>
              <p className={`text-xs font-semibold ${!known ? "text-amber-300" : lightActive ? "text-emerald-300" : "text-slate-400"}`}>
                {statusText(lightActive)} (NODE-03)
              </p>
              <p className={`mt-1 text-xs ${lightAwaiting ? "text-amber-300" : "text-slate-500"}`}>
                {requestText("light", lightAwaiting, requestedLight)}
              </p>
            </div>
          </div>
          <ManualDeviceSwitch
            label="Đèn cảnh báo NODE-03"
            checked={lightActive}
            disabled={Boolean(disabledReason) || lightAwaiting}
            reason={disabledReason || (lightAwaiting ? "Đang chờ NODE-03 xác nhận lệnh đèn" : "")}
            onClick={() => commandFor("light", lightActive)}
          />
        </div>

        <div className="rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
          <p className="text-xs font-bold tracking-[0.12em] text-cyan-300">TRẠNG THÁI THIẾT BỊ</p>
          <p className="mt-3 text-sm text-slate-200">
            {known
              ? `Gateway Simulator xác nhận: Còi ${sirenActive ? "BẬT" : "TẮT"} · Đèn ${lightActive ? "BẬT" : "TẮT"}`
              : "CHƯA CÓ XÁC NHẬN MỚI TỪ NODE-03"}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {manualReady
              ? `Yêu cầu MANUAL: Còi ${requestedSiren ? "BẬT" : "TẮT"} · Đèn ${requestedLight ? "BẬT" : "TẮT"}`
              : "Chuyển sang MANUAL để gửi yêu cầu điều khiển riêng từng thiết bị."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Công tắc chỉ đổi theo trạng thái NODE-03 đã báo cáo, không đổi ngay sau khi gửi POST. Chỉ là mô phỏng phần mềm.
          </p>
          {disabledReason && !modeAuto && (
            <p className="mt-2 text-xs text-amber-300">Chưa thể điều khiển: {disabledReason}</p>
          )}
          {manual.loadError ? (
            <p className="mt-2 text-xs text-red-300" role="alert">Không đọc được API MANUAL: {manual.loadError}</p>
          ) : null}
          {manual.commandError ? (
            <p className="mt-2 text-xs text-red-300" role="alert">Backend từ chối lệnh: {manual.commandError}</p>
          ) : null}
          {manual.message ? (
            <p className="mt-2 text-xs text-cyan-300" aria-live="polite">{manual.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            className="h-12"
            onClick={operator.activate}
            disabled={operator.pending || operator.loading || alarmUnknown || Boolean(manual.pendingDevice)}
            style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}
          >
            <AlertIcon className="h-4 w-4" />
            {operator.pending ? "ĐANG XỬ LÝ..." : "BÁO ĐỘNG KHẨN CẤP"}
          </Button>
          <Button
            variant="muted"
            className="h-12"
            onClick={operator.reset}
            disabled={operator.pending || operator.loading || alarmUnknown || Boolean(manual.pendingDevice)}
          >
            RESET CẢNH BÁO
          </Button>
        </div>

        <div aria-live="polite" className="space-y-1 text-xs">
          <p className="text-slate-300">
            Báo động từ Dashboard: {alarmUnknown
              ? "CHƯA XÁC ĐỊNH"
              : operator.alarmActive ? "ĐANG GIỮ CẢNH BÁO (DEMO)" : "KHÔNG HOẠT ĐỘNG"}
          </p>
          {operator.message ? <p className="text-cyan-300">{operator.message}</p> : null}
          {operator.error ? <p role="alert" className="text-red-300">{operator.error}</p> : null}
          <p className="text-slate-500">Reset này chỉ xử lý báo động từ Dashboard; không tự xóa cảnh báo NODE-01 hoặc NODE-02.</p>
        </div>
      </div>
    </div>
  );
}
