export default function MonitoringPanel({ children }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      {children}
    </div>
  );
}
