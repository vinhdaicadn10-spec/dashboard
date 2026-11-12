import { useCallback, useEffect, useRef, useState } from "react";

// BAI 4 - PHAN 18B: Chi dung de THU NGHIEM tren localhost.
// API POST cua phan 18A CHUA co dang nhap/phan quyen.
const API_BASE = "http://127.0.0.1:8000";
const REFRESH_MS = 5000;

async function readJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : `Backend tra loi HTTP ${response.status}`
    );
  }
  return data;
}

export default function useOperatorAlarmDemo(gatewayId = "GW-SIM-01") {
  const [operatorStatus, setOperatorStatus] = useState(null);
  const [actuatorStatus, setActuatorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Ngan bam lien tuc va ngan GET cu ghi de len ket qua POST vua luu.
  const pendingRef = useRef(false);
  const versionRef = useRef(0);

  const refresh = useCallback(async (signal) => {
    if (pendingRef.current) return;
    const version = versionRef.current;

    const results = await Promise.allSettled([
      readJson(`/api/operator-alarm/status/${encodeURIComponent(gatewayId)}`, { signal }),
      readJson("/api/actuator/status/NODE-03", { signal }),
    ]);

    if (signal?.aborted || version !== versionRef.current || pendingRef.current) {
      return;
    }

    if (results[0].status === "fulfilled") {
      setOperatorStatus(results[0].value);
      setError("");
    } else if (results[0].reason?.name !== "AbortError") {
      setOperatorStatus(null);
      setError(`Khong doc duoc bao dong Dashboard: ${results[0].reason?.message ?? "Loi khong ro"}`);
    }

    if (results[1].status === "fulfilled") {
      setActuatorStatus(results[1].value);
    } else {
      // Khong khang dinh coi/den dang bat/tat khi khong co xac nhan.
      setActuatorStatus(null);
    }
    setLoading(false);
  }, [gatewayId]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const timer = setInterval(() => refresh(controller.signal), REFRESH_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);

  const sendAction = useCallback(async (action) => {
    if (pendingRef.current || (action !== "activate" && action !== "reset")) {
      return false;
    }

    pendingRef.current = true;
    versionRef.current += 1;
    setPending(true);
    setError("");
    setMessage("");

    try {
      const data = await readJson(`/api/operator-alarm/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway_id: gatewayId }),
      });

      // POST thanh cong = Backend luu yeu cau; chua chac Gateway da thuc hien.
      setOperatorStatus((old) => ({
        ...(old ?? {}),
        gateway_id: gatewayId,
        alarm_active: data.alarm_active === true,
        last_changed_at: data.changed_at ?? null,
      }));

      if (action === "activate") {
        setMessage("Backend da ghi nhan bao dong demo. Cho Gateway Simulator xac nhan coi/den.");
      } else {
        setMessage(data.reset_performed
          ? "Backend da reset bao dong Dashboard. Cho Gateway Simulator cap nhat."
          : "Khong co bao dong Dashboard dang giu de reset.");
      }
      return true;
    } catch (cause) {
      setError(cause?.message || "Khong the goi Backend");
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [gatewayId]);

  const actuatorKnown = actuatorStatus?.current_state_known === true;

  return {
    loading,
    pending,
    error,
    message,
    alarmActive: operatorStatus?.alarm_active ?? null,
    sirenOn: actuatorKnown ? actuatorStatus.siren_on : null,
    lightOn: actuatorKnown ? actuatorStatus.light_on : null,
    actuatorKnown,
    activate: () => sendAction("activate"),
    reset: () => sendAction("reset"),
  };
}
