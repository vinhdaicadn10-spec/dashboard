
import { useEffect, useState } from "react";

// API danh sach Node tu MongoDB
const API_URL = "http://127.0.0.1:8000/api/nodes";

// Lay lai du lieu moi 5 giay
const REFRESH_MS = 5000;

// Neu hon 30 giay khong co bao cao moi,
// xem du lieu Node la qua cu
const STALE_MS = 30000;

function getNodeStatus(node) {
  if (!node.last_reported_at) {
    return "unknown";
  }

  const lastReport = Date.parse(node.last_reported_at);

  if (Number.isNaN(lastReport)) {
    return "unknown";
  }

  const elapsed = Date.now() - lastReport;

  if (elapsed > STALE_MS) {
    return "stale";
  }

  if (node.status === "online") {
    return "online";
  }

  if (node.status === "offline") {
    return "offline";
  }

  return "unknown";
}

function getStatusStyle(status) {
  switch (status) {
    case "online":
      return {
        label: "ONLINE",
        color: "text-green-400",
        bg: "bg-green-500/10",
      };

    case "offline":
      return {
        label: "OFFLINE",
        color: "text-red-400",
        bg: "bg-red-500/10",
      };

    case "stale":
      return {
        label: "MẤT CẬP NHẬT",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
      };

    default:
      return {
        label: "CHƯA CÓ DỮ LIỆU",
        color: "text-slate-400",
        bg: "bg-slate-500/10",
      };
  }
}

export default function BackendNodesPanel() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    let stopped = false;
    let timerId;
    let controller;

    async function fetchNodes() {
      controller = new AbortController();

      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.nodes)) {
          throw new Error("Du lieu Nodes khong hop le");
        }

        if (!stopped) {
          setNodes(data.nodes);
          setCurrentTime(Date.now());
          setError("");
        }
      } catch (err) {
        if (!stopped && err.name !== "AbortError") {
          setError(err.message);
          setNodes([]);
        }
      } finally {
        if (!stopped) {
          setLoading(false);
          timerId = setTimeout(fetchNodes, REFRESH_MS);
        }
      }
    }

    fetchNodes();

    return () => {
      stopped = true;
      clearTimeout(timerId);
      controller?.abort();
    };
  }, []);

  function formatTime(value) {
    if (!value) return "---";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "---";
    }

    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#263449] bg-[#0B1220] p-4 text-white">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-cyan-300">
          TRẠNG THÁI NODE TỪ BACKEND
        </h3>

        <span className="text-xs text-slate-400">
          {nodes.length} Node
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Nguồn dữ liệu: FastAPI / MongoDB
      </p>

      {loading && (
        <p className="mt-4 text-sm text-slate-300">
          Đang tải dữ liệu Node...
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          Lỗi lấy dữ liệu: {error}
        </p>
      )}

      {!loading && !error && nodes.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">
          Chưa có Node trong MongoDB.
        </p>
      )}

      {!error && nodes.map((node) => {
        // currentTime duoc cap nhat moi lan lay API
        void currentTime;

        const status = getNodeStatus(node);
        const display = getStatusStyle(status);

        return (
          <div
            key={node.id}
            className="mt-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>
                <p className="font-semibold text-white">
                  {node.name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {node.id} | {node.type}
                </p>
              </div>

              <span
                className={`rounded-lg px-3 py-1 text-xs font-bold ${display.color} ${display.bg}`}
              >
                {display.label}
              </span>

            </div>

            <div className="mt-3 text-xs text-slate-400">
              Gateway: {node.gateway_id || "---"}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Báo cáo gần nhất:{" "}
              {formatTime(node.last_reported_at)}
            </div>

          </div>
        );
      })}

      <p className="mt-4 text-xs text-slate-500">
        Tự cập nhật khoảng 5 giây/lần.
        Dữ liệu quá 30 giây sẽ báo mất cập nhật.
      </p>

    </div>
  );
}
