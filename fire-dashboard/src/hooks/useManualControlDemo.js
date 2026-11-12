import { useCallback, useEffect, useRef, useState } from "react";

// BAI 18C.3: Chi danh cho Backend + Gateway Simulator chay CUC BO.
// API manual-control chua co dang nhap/phan quyen, KHONG dua ra Internet.
const API_BASE = "http://127.0.0.1:8000";
const POLL_MS = 5000;

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : `Backend tra loi HTTP ${response.status}`
    );
  }
  return payload;
}

export default function useManualControlDemo(gatewayId = "GW-SIM-01") {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [commandError, setCommandError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDevice, setPendingDevice] = useState(null);
  const inFlightRef = useRef(false);
  const versionRef = useRef(0);

  // Lay yeu cau MANUAL dang LUU. KHONG phai trang thai NODE-03 thuc hien.
  const refresh = useCallback(async (signal) => {
    if (inFlightRef.current) return;
    const version = versionRef.current;
    try {
      const payload = await fetchJson(
        `/api/manual-control/status/${encodeURIComponent(gatewayId)}`,
        { signal }
      );
      if (signal?.aborted || version !== versionRef.current || inFlightRef.current) return;
      setStatus(payload);
      setLoadError("");
    } catch (err) {
      if (signal?.aborted || err?.name === "AbortError" || version !== versionRef.current) return;
      setStatus(null); // Khong giu lenh cu khi khong ket noi duoc Backend.
      setLoadError(err?.message || "Khong the doc yeu cau MANUAL");
    } finally {
      if (!signal?.aborted && version === versionRef.current) setLoading(false);
    }
  }, [gatewayId]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const interval = setInterval(() => refresh(controller.signal), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refresh]);

  const sendCommand = useCallback(async (device, enabled) => {
    if (inFlightRef.current || !["siren", "light"].includes(device) || typeof enabled !== "boolean") {
      return false;
    }

    inFlightRef.current = true;
    versionRef.current += 1; // Bo ket qua GET cu da bat dau truoc POST.
    setPendingDevice(device);
    setMessage("");
    setCommandError("");

    try {
      const payload = await fetchJson("/api/manual-control/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway_id: gatewayId, device, enabled }),
      });
      setStatus(payload); // Chi la yeu cau luu trong MongoDB.
      setLoadError("");
      setMessage(
        `Backend đã ${payload.new_event ? "lưu lệnh" : "ghi nhận yêu cầu"} ${enabled ? "BẬT" : "TẮT"} ` +
        `${device === "siren" ? "còi" : "đèn"}. Chờ Gateway Simulator báo cáo NODE-03.`
      );
      return true;
    } catch (err) {
      // Neu HTTP 409 (AUTO / canh bao / du lieu cu), khong doi state NODE-03.
      setCommandError(err?.message || "Khong gui duoc lenh dieu khien");
      return false;
    } finally {
      inFlightRef.current = false;
      setPendingDevice(null);
    }
  }, [gatewayId]);

  return {
    status,
    loading,
    loadError,
    commandError,
    message,
    pendingDevice,
    sendCommand,
  };
}
