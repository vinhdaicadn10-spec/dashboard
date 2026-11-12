import { useEffect, useMemo, useState } from "react";

// Bai 4 - Dong bo trang thai Dashboard tu FastAPI/MongoDB.
// Chi DOC du lieu; khong gui lenh bat/tat coi den.
const API = "http://127.0.0.1:8000";
const REFRESH_MS = 5000;
const FRESH_MS = 30000;

async function getJson(url, signal) {
  const response = await fetch(url, { method: "GET", cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.json();
}

function isRecent(timestamp, nowMs) {
  if (!timestamp) return false;
  const ms = Date.parse(timestamp);
  return Number.isFinite(ms) && ms <= nowMs && nowMs - ms <= FRESH_MS;
}

const STATUS_LABELS = {
  NORMAL: "BÌNH THƯỜNG (DEMO)",
  ALARM: "CẢNH BÁO (DEMO)",
  DEGRADED: "KẾT NỐI KHÔNG ỔN ĐỊNH",
  UNKNOWN: "CHƯA XÁC ĐỊNH",
};

function boolLabel(value, known) {
  if (!known || typeof value !== "boolean") return "CHƯA XÁC ĐỊNH";
  return value ? "ĐANG BẬT" : "ĐANG TẮT";
}

export default function useBackendDashboardStatus({
  gatewayId = "GW-SIM-01",
  nodeId = "NODE-02",
  intervalMs = REFRESH_MS,
} = {}) {
  const [snapshot, setSnapshot] = useState({
    overview: null,
    control: null,
    temperature: null,
    health: null,
    errors: {},
    loading: true,
    checkedAt: null,
  });
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer;
    let controller;

    async function update() {
      controller = new AbortController();
      const urls = {
        overview: `${API}/api/system/overview/${encodeURIComponent(gatewayId)}`,
        control: `${API}/api/control/mode/${encodeURIComponent(gatewayId)}`,
        temperature: `${API}/api/temperature/latest/${encodeURIComponent(nodeId)}?gateway_id=${encodeURIComponent(gatewayId)}`,
        health: `${API}/api/health`,
        operator: `${API}/api/operator-alarm/status/${encodeURIComponent(gatewayId)}`,
      };

      const keys = Object.keys(urls);
      const results = await Promise.allSettled(
        keys.map((key) => getJson(urls[key], controller.signal))
      );
      if (cancelled) return;

      const values = {};
      const errors = {};
      results.forEach((result, index) => {
        const key = keys[index];
        values[key] = result.status === "fulfilled" ? result.value : null;
        if (result.status === "rejected") {
          errors[key] = result.reason?.message ?? "Không lấy được dữ liệu";
        }
      });

      setSnapshot({
        ...values,
        errors,
        loading: false,
        checkedAt: new Date().toISOString(),
      });
      setClock(Date.now());
      timer = setTimeout(update, intervalMs);
    }

    update();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [gatewayId, nodeId, intervalMs]);

  return useMemo(() => {
    const overview = snapshot.overview;
    const gateway = overview?.gateway;
    const smoke = overview?.smoke;
    const button = overview?.button;
    const actuator = overview?.actuator;
    const temp = snapshot.temperature;
    const gwOnline = gateway?.status === "ONLINE";
    const actuatorKnown = actuator?.state_known === true;
    const validTemp = typeof temp?.temperature_c === "number" &&
      Number.isFinite(temp.temperature_c);
    const tempFresh = validTemp && isRecent(temp?.received_at, clock);
    // Overview có thể trả giá trị ADC cũ; không hiển thị như số đo hiện tại.
    const validAdc = typeof smoke?.adc_value === "number" &&
      Number.isFinite(smoke.adc_value);
    const operatorValid = typeof snapshot.operator?.alarm_active === "boolean";
    const operatorAlarm = operatorValid ? snapshot.operator.alarm_active : null;
    const physicalAlarm = smoke?.alarm_active === true || button?.alarm_active === true;
    // Một nguồn đang báo động phải có ưu tiên cao nhất. Nếu không đọc được
    // báo động Dashboard, không được tự kết luận hệ thống an toàn.
    const status = (physicalAlarm || operatorAlarm === true || overview?.overall_status === "ALARM")
      ? "ALARM"
      : (!overview || !operatorValid || snapshot.errors.overview)
      ? "UNKNOWN"
      : (overview.overall_status ?? "UNKNOWN");
    const mode = ["AUTO", "MANUAL"].includes(snapshot.control?.mode)
      ? snapshot.control.mode
      : null;

    return {
      // Dung cho header va the trang thai tong quan.
      overallStatus: status,
      overallLabel: STATUS_LABELS[status] ?? STATUS_LABELS.UNKNOWN,
      reasons: [
        ...(overview?.reasons ?? []),
        ...(operatorValid ? [] : ["Chưa đọc được trạng thái báo động Dashboard"]),
      ],
      operator: {
        alarmActive: operatorAlarm,
        known: operatorValid,
      },
      gateway: {
        status: gateway?.status ?? "UNKNOWN",
        online: gwOnline,
        lastSeen: gateway?.last_seen ?? null,
        wifiRssiDbm: gateway?.wifi_rssi_dbm ?? null,
        // Gateway ID GW-SIM-01 la du lieu GIA LAP, khong phai ESP32 that.
        label: gwOnline ? "GATEWAY GIẢ LẬP ONLINE" : "GATEWAY CHƯA KẾT NỐI",
      },
      nodes: overview?.nodes ?? null,
      smoke: {
        adc: validAdc ? smoke.adc_value : null,
        unit: "ADC", // TUYET DOI khong gan ppm neu chua hieu chuan.
        alarmActive: smoke?.alarm_active === true,
        fresh: smoke?.data_fresh === true,
        lastReceivedAt: smoke?.last_received_at ?? null,
      },
      temperature: {
        celsius: validTemp ? temp.temperature_c : null,
        fresh: tempFresh,
        lastReceivedAt: temp?.received_at ?? null,
        source: temp?.source ?? null,
      },
      button: {
        pressed: typeof button?.pressed === "boolean" ? button.pressed : null,
        alarmActive: button?.alarm_active === true,
        fresh: button?.data_fresh === true,
      },
      actuator: {
        known: actuatorKnown,
        sirenOn: actuatorKnown ? actuator.siren_on : null,
        lightOn: actuatorKnown ? actuator.light_on : null,
        sirenLabel: boolLabel(actuator?.siren_on, actuatorKnown),
        lightLabel: boolLabel(actuator?.light_on, actuatorKnown),
      },
      mode,
      // Chua co API pin STM32 / tu kiem tra thiet bi: khong hien thong so gia.
      stm32Status: "CHƯA CÓ DỮ LIỆU",
      smokeBatteryPercent: null,
      buttonBatteryPercent: null,
      selfCheckStatus: "CHƯA KIỂM TRA",
      backendReachable: Boolean(snapshot.overview) && !snapshot.errors.overview,
      isSimulator: gatewayId.startsWith("GW-SIM-"),
      checkedAt: snapshot.checkedAt,
      loading: snapshot.loading,
      errors: snapshot.errors,
    };
  }, [snapshot, clock, gatewayId]);
}
