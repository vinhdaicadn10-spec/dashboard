
import { useEffect, useState } from "react";

const API_URL =
  "http://127.0.0.1:8000/api/gateway/status/GW-SIM-01";

export default function GatewayStatus() {
  const [gateway, setGateway] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;
    let timerId;
    let controller;

    async function fetchGateway() {
      controller = new AbortController();

      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!stopped) {
          setGateway(data);
          setError("");
        }
      } catch (err) {
        if (!stopped) {
          setGateway(null);
          setError("Khong ket noi duoc Backend");
        }
      } finally {
        if (!stopped) {
          setLoading(false);

          // Tu cap nhat sau 5 giay
          timerId = setTimeout(fetchGateway, 5000);
        }
      }
    }

    fetchGateway();

    return () => {
      stopped = true;
      clearTimeout(timerId);
      controller?.abort();
    };
  }, []);

  const status = error
    ? "error"
    : gateway?.status || "unknown";

  const statusText =
    status === "online"
      ? "ONLINE"
      : status === "offline"
      ? "OFFLINE"
      : status === "error"
      ? "LOI KET NOI"
      : "CHUA CO DU LIEU";

  const color =
    status === "online"
      ? "text-green-400"
      : status === "offline"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-white">

      <h3 className="text-lg font-bold">
        Trang thai ESP32 Gateway
      </h3>

      {loading ? (
        <p className="mt-3">Dang tai du lieu...</p>
      ) : (
        <div className="mt-3 space-y-2">

          <p>
            Gateway: {gateway?.gateway_id || "GW-SIM-01"}
          </p>

          <p>
            Trang thai:{" "}
            <span className={`font-bold ${color}`}>
              {statusText}
            </span>
          </p>

          <p>
            Wi-Fi RSSI:{" "}
            {gateway?.wifi_rssi_dbm != null
              ? `${gateway.wifi_rssi_dbm} dBm`
              : "---"}
          </p>

          <p>
            So node ket noi:{" "}
            {gateway?.connected_nodes ?? "---"}
          </p>

          <p>
            Heartbeat gan nhat:{" "}
            {gateway?.last_seen_display || "---"}
          </p>

          {error && (
            <p className="text-red-400">{error}</p>
          )}

        </div>
      )}

    </div>
  );
}
