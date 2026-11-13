// Icons taken from the design (24x24, stroke).
const base = { viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };
const make = (children, defaults = {}) =>
  function Icon({ size = 24, color = '#163300', width = 2, ...rest }) {
    return (
      <svg {...base} width={size} height={size} stroke={color} strokeWidth={defaults.width ?? width} {...rest}>
        {children}
      </svg>
    );
  };

export const Mic = make(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>);
export const MicSmall = make(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const EyeClosed = make(<path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M6.5 13.2 5 15.5M12 14.6V17M17.5 13.2 19 15.5" />);
export const Insights = make(<path d="M4 20h16M7 17v-5M12 17V8M17 17v-8" />);
export const Upload = make(<><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="9" y="9" width="6" height="6" rx="1" /></>);
export const Chevron = make(<path d="M9 6l6 6-6 6" />);
export const ChevronDown = make(<path d="M6 9l6 6 6-6" />);
export const Bank = make(<path d="M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />);
export const ArrowUp = make(<path d="M12 19V5M6 11l6-6 6 6" />);
export const Card = make(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>);
export const Home = make(<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />);
export const People = make(<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="16.5" cy="7.5" r="3" /><path d="M17 13.5c2.5.3 4.5 2.5 4.5 5.2" /></>);
export const Payments = make(<path d="M20 12a8 8 0 0 1-13.6 5.7M4 12a8 8 0 0 1 13.6-5.7M17.6 3v3.3h-3.3M6.4 21v-3.3h3.3" />);
export const Close = make(<path d="M6 6l12 12M18 6L6 18" />);
export const Check = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const Speaker = make(<><path d="M4 10v4h4l5 4V6l-5 4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></>);
export const Shield = make(<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>);
export const ShieldAlert = make(<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M12 8v4.5M12 16h.01" /></>);
export const Lock = make(<><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const FaceId = make(<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 16c1.4 1 3.6 1 5 0" /></>);
export const Backspace = make(<><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" /><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" /></>);
export const Pause = make(<><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>);
export const Phone = make(<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />);
export const Book = make(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>);
export const Reset = make(<><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4.5V9h4.5" /></>);
export const Play = ({ size = 14, color = '#163300' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" /></svg>
);
export const Euro = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Euro">
    <circle cx="12" cy="12" r="12" fill="#003399" />
    <g fill="#FFCC00">
      {[[19, 12], [18.06, 15.5], [15.5, 18.06], [12, 19], [8.5, 18.06], [5.94, 15.5], [5, 12], [5.94, 8.5], [8.5, 5.94], [12, 5], [15.5, 5.94], [18.06, 8.5]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.1" />
      ))}
    </g>
  </svg>
);
