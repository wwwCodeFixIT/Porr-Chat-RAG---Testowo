import type { ReactNode } from 'react';

import './Icon.css';

export type IconName =
  | 'chat'
  | 'documents'
  | 'plus'
  | 'refresh'
  | 'upload'
  | 'folder'
  | 'folderOpen'
  | 'edit'
  | 'trash'
  | 'close'
  | 'send'
  | 'stop'
  | 'search'
  | 'copy'
  | 'check'
  | 'sources'
  | 'arrowRight'
  | 'settings'
  | 'sparkles'
  | 'more';

type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
};

const ICON_PATHS: Record<IconName, ReactNode> = {
  chat: (
    <>
      <path d="M4 5.8C4 4.8 4.8 4 5.8 4h12.4C19.2 4 20 4.8 20 5.8v8.4c0 1-.8 1.8-1.8 1.8H9l-4.2 3.2c-.3.2-.8 0-.8-.4v-13Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),

  documents: (
    <>
      <path d="M7 3.8C7 3.4 7.4 3 7.8 3h7.4L20 7.8v12.4c0 .4-.4.8-.8.8H7.8c-.4 0-.8-.4-.8-.8V3.8Z" />
      <path d="M15 3v5h5M10 12h7M10 15h7M10 18h4" />
      <path d="M4 7v13.2c0 1 .8 1.8 1.8 1.8H16" />
    </>
  ),

  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),

  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.2-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.2 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),

  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 16v2.2c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8V16" />
    </>
  ),

  folder: (
    <>
      <path d="M3.5 6.8c0-1 .8-1.8 1.8-1.8h4l2 2h7.4c1 0 1.8.8 1.8 1.8v9.4c0 1-.8 1.8-1.8 1.8H5.3c-1 0-1.8-.8-1.8-1.8V6.8Z" />
    </>
  ),

  folderOpen: (
    <>
      <path d="M3.5 8.4V6.8c0-1 .8-1.8 1.8-1.8h4l2 2h7.4c1 0 1.8.8 1.8 1.8v1.1" />
      <path d="M4.8 10h15.6c.7 0 1.1.6.9 1.2l-2.1 7.2c-.2.9-1 1.6-2 1.6H5.8c-.9 0-1.7-.6-2-1.5l-1-6.9C2.7 10.8 3.4 10 4.8 10Z" />
    </>
  ),

  edit: (
    <>
      <path d="M4 20h4.5L19.2 9.3a2.1 2.1 0 0 0 0-3L17.7 4.8a2.1 2.1 0 0 0-3 0L4 15.5V20Z" />
      <path d="m13.5 6 4.5 4.5" />
    </>
  ),

  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M10 11v6M14 11v6" />
      <path d="M8 7l.7-2h6.6L16 7" />
      <path d="M7 7l1 13h8l1-13" />
    </>
  ),

  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),

  send: (
    <>
      <path d="M4 20 21 12 4 4l3 8-3 8Z" />
      <path d="M7 12h8" />
    </>
  ),

  stop: (
    <>
      <path d="M8 8h8v8H8z" />
    </>
  ),

  search: (
    <>
      <path d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" />
      <path d="m16.2 16.2 4.3 4.3" />
    </>
  ),

  copy: (
    <>
      <path d="M8 8h10.2c.4 0 .8.4.8.8v10.4c0 .4-.4.8-.8.8H8.8c-.4 0-.8-.4-.8-.8V8Z" />
      <path d="M5 16H4.8c-.4 0-.8-.4-.8-.8V4.8c0-.4.4-.8.8-.8h9.4c.4 0 .8.4.8.8V5" />
    </>
  ),

  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),

  sources: (
    <>
      <path d="M5 5h14v4H5zM5 15h14v4H5z" />
      <path d="M8 9v6M16 9v6" />
    </>
  ),

  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),

  settings: (
    <>
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),

  sparkles: (
    <>
      <path d="M12 3l1.5 4.1L18 8.6l-4.5 1.5L12 14l-1.5-3.9L6 8.6l4.5-1.5L12 3Z" />
      <path d="M18.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="M5.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </>
  ),

  more: (
    <>
      <path d="M12 6.5h.01M12 12h.01M12 17.5h.01" />
    </>
  ),
};

export function Icon({ name, className = '', size = 18 }: IconProps) {
  return (
    <svg
      className={`app-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}