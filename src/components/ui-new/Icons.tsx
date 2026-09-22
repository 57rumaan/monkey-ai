import React from 'react';

const icon = (d: string, opts?: { strokeWidth?: number }) => (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={opts?.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);

export const XIcon = icon('M18 6L6 18M6 6l12 12');
export const SearchIcon = icon('M21 21l-4.35-4.35M11 11c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8 8 3.58 8 8');
export const PlusIcon = icon('M12 5v14M5 12h14');
export const ChevronDownIcon = icon('M6 9l6 6 6-6');
export const ChevronRightIcon = icon('M9 18l6-6-6-6');
export const ChevronLeftIcon = icon('M15 18l-6-6 6-6');
export const MenuIcon = icon('M3 12h18M3 6h18M3 18h18');
export const SendIcon = icon('M22 2L11 13L22 2M22 2 15 22 11 13 2 9 22 2');
export const MicIcon = icon('M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8');
export const PaperclipIcon = icon('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48');
export const CopyIcon = icon('M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
export const RefreshIcon = icon('M1 4v6h6M3.51 15a9 9 0 1 0 .49-3.95');
export const ThumbUpIcon = icon('M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3');
export const ThumbDownIcon = icon('M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17');
export const MoreHorizontalIcon = icon('M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z');
export const SunIcon = icon('M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42');
export const MoonIcon = icon('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
export const MonitorIcon = icon('M2 3h20v14H2V3zm0 2v14h20V5H2zm12 16v4h8v-4h-8zM12 17v4');
export const SettingsIcon = icon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-10a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z');
export const LogOutIcon = icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9');
export const FolderIcon = icon('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z');
export const StarIcon = icon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
export const MessageIcon = icon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
export const UsersIcon = icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75');
export const BarChartIcon = icon('M12 20V10M18 20V4M6 20V16');
export const ZapIcon = icon('M13 2L3 14h9l-1 8 10-12h-9l1-8z');
export const CodeIcon = icon('M16 18l6-6-6-6M8 6l-6 6 6 6');
export const ImageIcon = icon('M3 3h18v18H3V3zm0 2v18h18V5H3zm5.5 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM21 15l-5-5 1-5');
export const FileIcon = icon('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6');
export const ShareIcon = icon('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13');
export const TrashIcon = icon('M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2');
export const EditIcon = icon('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z');
export const ShieldIcon = icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');
export const BellIcon = icon('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0');
export const UserIcon = icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z');
export const LinkIcon = icon('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');
export const CheckIcon = icon('M20 6L9 17l-5-5');
export const AlertCircleIcon = icon('M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v4h-2zm0 6h2v2h-2z');
export const GridIcon = icon('M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11H3v7h7v-7zm11 0h7v7h-7v-7z');
export const SlidersIcon = icon('M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6');
export const KeyIcon = icon('M21 2l-2 2M13.39 13.39a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3 3 3.5-3.5-3.5-3.5-3 3.5L19 4');
export const EyeIcon = icon('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z');
export const EyeOffIcon = icon('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22');
export const SparklesIcon = icon('M12 3l1.88 5.76L20 10l-6.12 4.24L15.76 20 12 16.48 8.24 20l1.88-5.76L4 10l6.12-1.24L12 3z');
export const PenIcon = icon('M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z');
export const BookIcon = icon('M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');
export const FlaskIcon = icon('M9 3h6l1 9H8L9 3zM8 12s-4 4-2 8h12c2-4-2-8-2-8');

export const FolderPlusIcon = icon('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v8M9 14h6');
export const FolderOpenIcon = icon('M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 1.92.73 1.92 1.63A2.32 2.32 0 0 1 18.34 22H7.66a2.32 2.32 0 0 1-1.8-3.37 2 2 0 0 1-.16-.63V5c0-1.1.9-2 2-2h4l2-2h6a2 2 0 0 1 2 2v1.41');
export const ClockIcon = icon('M12 12a10 10 0 0 0 0-20 10 10 0 0 0 0 20zm0-2a8 8 0 0 0-16 0 8 8 0 0 0 16 0zm0-6h2v4h-2zm0 6h2v2h-2z');