import type { ChatSession } from '../types';
import * as history from '../storage/chatHistory';

function safeFileName(name: string) {
  return name
    .replace(/[^\p{L}\p{N}\s_.-]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'rozmowa';
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // przeglądarka pobierze plik zanim revoke faktycznie zwolni URL
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportChatAsMarkdown(chatId: string): Promise<void> {
  const chat = await history.getChat(chatId);
  if (!chat) throw new Error('Nie znaleziono rozmowy.');
  const messages = await history.listMessages(chatId);

  const created = new Date(chat.createdAt).toLocaleString('pl-PL');
  const updated = new Date(chat.updatedAt).toLocaleString('pl-PL');

  const lines: string[] = [];
  lines.push(`# ${chat.title}`);
  lines.push('');
  lines.push(`*Korpus · rozmowa eksportowana z PORR Document Assistant*`);
  lines.push('');
  lines.push(`- Utworzono: ${created}`);
  lines.push(`- Ostatnia aktywność: ${updated}`);
  lines.push(`- Liczba wiadomości: ${messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const m of messages) {
    const who = m.role === 'user' ? '🟡 Pytanie' : '🔵 Korpus';
    const stamp = new Date(m.createdAt).toLocaleString('pl-PL');
    lines.push(`## ${who} — _${stamp}_`);
    lines.push('');
    lines.push(m.content || '_(brak treści)_');
    if (m.error) {
      lines.push('');
      lines.push(`> ⚠️ ${m.error}`);
    }
    if (m.sources?.length) {
      lines.push('');
      lines.push('**Źródła:**');
      for (const s of m.sources) {
        const score =
          typeof s.score === 'number' ? ` (score: ${s.score.toFixed(3)})` : '';
        const page = s.page ? `, str. ${s.page}` : '';
        lines.push(`- ${s.fileName}${page}${score}`);
        if (s.sourcePath) {
          lines.push(`  - \`${s.sourcePath}\``);
        }
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  triggerDownload(
    `${safeFileName(chat.title)}.md`,
    lines.join('\n'),
    'text/markdown'
  );
}

export async function exportAllAsJsonFile(): Promise<void> {
  const json = await history.exportAllAsJson();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  triggerDownload(
    `korpus-backup-${stamp}.json`,
    json,
    'application/json'
  );
}

export type { ChatSession };
