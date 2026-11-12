const createIcon = (paths) =>
  function Icon({ className = "w-5 h-5", style }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
        {paths}
      </svg>
    );
  };

export const FlameIcon = createIcon(<><path d="M12 3s2 2.2 2 4.5c0 1.5-.7 2.5-1.4 3.3 2.6-.5 5.4 1.7 5.4 5 0 3.2-2.7 5.7-6 5.7s-6-2.5-6-5.7c0-2.7 1.6-4.3 3.3-5.8.9-.8 1.7-1.6 2.1-2.6.6-1.4.6-2.8.6-4.4Z" /><path d="M12 13.5c1.4 1 2.2 2 2.2 3.2A2.3 2.3 0 0 1 12 19a2.3 2.3 0 0 1-2.2-2.3c0-1.1.6-2 2.2-3.2Z" /></>);
export const SmokeIcon = createIcon(<><path d="M7 20c-1.8-1.3-1.9-3.6-.4-5.1 1.3-1.3 1.3-3.3.1-4.5" /><path d="M12 20c-1.8-1.3-1.9-3.6-.4-5.1 1.3-1.3 1.3-3.3.1-4.5-1.1-1.1-1.1-2.8 0-3.9" /><path d="M17 20c-1.8-1.3-1.9-3.6-.4-5.1 1.3-1.3 1.3-3.3.1-4.5-1.1-1.1-1.1-2.8 0-3.9" /></>);
export const ThermometerIcon = createIcon(<><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v7" /></>);
export const BellIcon = createIcon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const LightIcon = createIcon(<><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1.1 1 1.8V18h6v-1.5c0-.7.4-1.4 1-1.8A7 7 0 0 0 12 2Z" /></>);
export const ShieldIcon = createIcon(<><path d="M12 3l7 3v5c0 5-3.4 8.9-7 10-3.6-1.1-7-5-7-10V6l7-3Z" /><path d="m9.5 12 1.7 1.7L14.8 10" /></>);
export const WifiIcon = createIcon(<><path d="M5 12.5a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M12 20h.01M2 9a16 16 0 0 1 20 0" /></>);
export const WifiOffIcon = createIcon(<><path d="M2 9a16 16 0 0 1 7-3.6M10.7 5.1A16 16 0 0 1 22 9M5 12.5a11 11 0 0 1 4.4-2.2M14.4 10.5a11 11 0 0 1 4.6 2M8.5 16a6 6 0 0 1 2.6-1.3M15.5 16A6 6 0 0 0 14 15.2M12 20h.01M2 2l20 20" /></>);
export const AlertIcon = createIcon(<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /></>);
export const ActivityIcon = createIcon(<path d="M3 12h4l2-5 4 10 2-5h6" />);
export const SettingsIcon = createIcon(<><path d="M12 3v2M12 19v2m-7.1-16.1 1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" /><circle cx="12" cy="12" r="3.5" /></>);
export const PowerIcon = createIcon(<><path d="M12 2v10" /><path d="M6.2 5.8A8 8 0 1 0 17.8 5.8" /></>);
export const ResetIcon = createIcon(<><path d="M20 11a8 8 0 1 0 2 5.3" /><path d="M20 4v7h-7" /></>);
export const BatteryIcon = createIcon(<><rect x="3" y="6" width="17" height="12" rx="2" /><path d="M21 10v4M7 10h6v4H7z" /></>);
