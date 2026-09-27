type IconName = "home" | "calendar" | "chat" | "history" | "bell" | "flame" | "moon" | "medal" | "close" | "edit" | "reset";

const PATHS: Record<IconName, JSX.Element> = {
  home: (
    <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9M10 19v-5h4v5" />
  ),
  calendar: (
    <path d="M5 8h14M7 4v3M17 4v3M6 6h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 13h.01M12 13h.01M15 13h.01M9 16h.01M12 16h.01" />
  ),
  chat: (
    <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.2 3.2A.5.5 0 0 1 5 18.8V15H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  ),
  history: (
    <path d="M4 19V5M4 19h16M8 15v-4M12.5 15V9M17 15v-7" />
  ),
  bell: (
    <path d="M12 4a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15.5h14l-1.5-2A2.2 2.2 0 0 1 17 12.2V9a5 5 0 0 0-5-5ZM9.5 18a2.5 2.5 0 0 0 5 0" />
  ),
  flame: (
    <path d="M12 3s4 3.5 4 7.5a4 4 0 0 1-8 0c0-1 .5-1.8 1-2.5-.2 1 .3 1.5 1 1.5.8 0 1-1 .8-2C10.4 5.8 12 3 12 3ZM9 15.5A3 3 0 0 0 12 19a3 3 0 0 0 3-3.5" />
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.7 6.7 0 0 0 20 14.5Z" />,
  medal: (
    <path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM9 13.5 7 21l5-2.5L17 21l-2-7.5" />
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8L17.3 5.5a2 2 0 0 0-2.8 0L4 16v4Z" />,
  reset: <path d="M4 12a8 8 0 1 1 2.5 5.8M4 12V7M4 12h5" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.7 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
