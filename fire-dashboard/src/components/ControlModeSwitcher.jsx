import { useState } from "react";

// Phan 17B: Ca Sidebar va Switcher dung CHUNG modeAuto tu App.jsx.
// Khong fetch, khong luu state mode rieng trong component nay.
// App.jsx thuc hien POST /api/control/mode va cap nhat ca hai vi tri.
export default function ControlModeSwitcher({
  gatewayId = "GW-SIM-01",
  modeAuto,
  onModeChange,
  modeSaving = false,
  modeError = "",
  modeLoaded = true,
}) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const disabled = busy || modeSaving || !modeLoaded;
  const selected = modeAuto ? "AUTO" : "MANUAL";

  async function selectMode(nextMode) {
    if (disabled || nextMode === selected) return;
    if (typeof onModeChange !== "function") {
      setLocalError("Thieu ham onModeChange tu App.jsx");
      return;
    }
    setLocalError("");
    setBusy(true);
    try {
      const saved = await onModeChange(nextMode === "AUTO");
      if (saved === false) {
        setLocalError("Luu che do that bai. Kiem tra FastAPI va MongoDB.");
      }
    } catch (error) {
      setLocalError(error?.message || "Khong luu duoc che do");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-1 rounded-xl bg-[#111C2C] p-1"
        role="group"
        aria-label={`Chon che do van hanh cho ${gatewayId}`}
      >
        {["AUTO", "MANUAL"].map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            aria-pressed={modeLoaded && selected === item}
            onClick={() => selectMode(item)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              modeLoaded && selected === item
                ? item === "AUTO"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "bg-slate-700 text-white shadow-md"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400" aria-live="polite">
        {!modeLoaded
          ? "Dang tai che do van hanh tu FastAPI..."
          : disabled
            ? "Dang luu che do vao MongoDB..."
            : `Che do hien tai: ${selected} (demo)`}
      </p>
      {(modeError || localError) && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {modeError || localError}
        </p>
      )}
    </div>
  );
}
