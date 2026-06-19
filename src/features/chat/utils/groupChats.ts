import type { ChatSession } from '../types';

export type ChatGroupKey = 'pinned' | 'today' | 'yesterday' | 'week' | 'month' | 'older';

export const GROUP_LABEL: Record<ChatGroupKey, string> = {
  pinned: 'Przypięte',
  today: 'Dziś',
  yesterday: 'Wczoraj',
  week: 'Poprzednie 7 dni',
  month: 'Poprzednie 30 dni',
  older: 'Starsze',
};

const GROUP_ORDER: ChatGroupKey[] = [
  'pinned',
  'today',
  'yesterday',
  'week',
  'month',
  'older',
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function classify(chat: ChatSession): ChatGroupKey {
  if (chat.pinned) return 'pinned';

  const now = startOfDay(new Date());
  const updated = startOfDay(new Date(chat.updatedAt));
  const days = diffDays(now, updated);

  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'older';
}

export type GroupedChats = {
  key: ChatGroupKey;
  label: string;
  chats: ChatSession[];
}[];

export function groupChats(chats: ChatSession[]): GroupedChats {
  const buckets: Record<ChatGroupKey, ChatSession[]> = {
    pinned: [],
    today: [],
    yesterday: [],
    week: [],
    month: [],
    older: [],
  };

  for (const chat of chats) {
    buckets[classify(chat)].push(chat);
  }

  // newest first within each bucket (lists already sorted by updatedAt desc upstream,
  // but we sort defensively)
  for (const key of GROUP_ORDER) {
    buckets[key].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  return GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
    key: k,
    label: GROUP_LABEL[k],
    chats: buckets[k],
  }));
}

export function filterChats(chats: ChatSession[], query: string): ChatSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return chats;
  return chats.filter((chat) => chat.title.toLowerCase().includes(q));
}
