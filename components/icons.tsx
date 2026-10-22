import type { ReactNode } from "react";

/**
 * A small local icon set (inline SVG). It replaces the large icon package, which keeps node_modules
 * smaller and the dev server quicker. Add an icon by adding one line below.
 */
type IconProps = { size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false"; "aria-label"?: string };

function make(shape: ReactNode) {
  return function Icon({ size = 20, className, ...rest }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} role={rest["aria-label"] ? "img" : undefined} {...rest}>
        {shape}
      </svg>
    );
  };
}

export const Menu = make(<path d="M4 6h16M4 12h16M4 18h16" />);
export const X = make(<path d="M18 6 6 18M6 6l12 12" />);
export const Search = make(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
export const Check = make(<path d="M20 6 9 17l-5-5" />);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const Pencil = make(<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />);
export const Eye = make(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOff = make(<><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9" /><path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>);
export const Bell = make(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
export const Download = make(<><path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>);
export const FileText = make(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>);
export const FileDown = make(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" /></>);
export const UploadCloud = make(<><path d="M12 13v8m0-8-3 3m3-3 3 3" /><path d="M20 17.6A5 5 0 0 0 18 8h-1.3A8 8 0 1 0 4 16.3" /></>);
export const StickyNote = make(<><path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8l6-6V5a2 2 0 0 0-2-2z" /><path d="M14 21v-5a1 1 0 0 1 1-1h5" /></>);
export const AlertTriangle = make(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4m0 4h.01" /></>);
export const Briefcase = make(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>);
export const CalendarClock = make(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v3l2 1" /></>);
export const CheckCircle2 = make(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
export const Circle = make(<circle cx="12" cy="12" r="10" />);
export const Clock = make(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>);
export const UserPlus = make(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>);
export const Users = make(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>);
export const UserCog = Users;
export const ArrowUp = make(<path d="M12 19V5m0 0-6 6m6-6 6 6" />);
export const ArrowDown = make(<path d="M12 5v14m0 0 6-6m-6 6-6-6" />);
/** Referral network icon (used for Agents). */
export const Handshake = make(<><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" /></>);
export const LayoutDashboard = make(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>);
export const ListChecks = make(<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />);
export const LogOut = make(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />);
export const NotebookPen = make(<><path d="M4 4a2 2 0 0 1 2-2h12v20H6a2 2 0 0 1-2-2z" /><path d="M8 2v20M12 7h4M12 11h4" /></>);
export const Settings = make(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>);
export const Workflow = make(<><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M6 9v3a3 3 0 0 0 3 3h6" /></>);
export const BarChart3 = make(<><path d="M3 3v18h18" /><path d="M8 17V9M13 17V5M18 17v-6" /></>);
export const RotateCcw = make(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>);
export const Mail = make(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>);
export const Pin = make(<path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3z" />);
export const PinOff = make(<><path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3z" /><path d="M3 3l18 18" /></>);
export const ShieldCheck = make(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>);
export const GraduationCap = make(<><path d="M22 10 12 5 2 10l10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" /></>);
export const Plane = make(<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>);
export const Wrench = make(<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z" />);
export const Flag = make(<path d="M4 22V4M4 4h13l-2 4 2 4H4" />);
