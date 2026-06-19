/**
 * Minimalistyczny renderer Markdown bez zewnętrznych zależności.
 *
 * Obsługuje to, co realnie wraca z RAG:
 *   - akapity (puste linie = nowe akapity)
 *   - nagłówki #, ##, ###
 *   - listy nieuporządkowane (- *), uporządkowane (1.)
 *   - bloki kodu ```lang\n…```
 *   - inline kod `…`
 *   - **bold**, *italic*, ~~strike~~
 *   - linki [tekst](url) — tylko http(s)
 *   - cytaty > …
 *   - znaki specjalne są escape-owane przed renderem.
 *
 * Świadomie nie używamy `dangerouslySetInnerHTML`. Renderujemy React-em,
 * co eliminuje całą klasę XSS-ów.
 */

import type { ReactNode } from 'react';
import { Fragment, memo, useMemo, useState } from 'react';

import './Markdown.css';

type MdInlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; children: MdInlineToken[] }
  | { type: 'italic'; children: MdInlineToken[] }
  | { type: 'strike'; children: MdInlineToken[] }
  | { type: 'link'; href: string; children: MdInlineToken[] };

type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; tokens: MdInlineToken[] }
  | { type: 'paragraph'; tokens: MdInlineToken[] }
  | { type: 'quote'; tokens: MdInlineToken[] }
  | { type: 'codeblock'; lang: string; value: string }
  | {
      type: 'table';
      header: MdInlineToken[][];
      align: ('left' | 'center' | 'right' | null)[];
      rows: MdInlineToken[][][];
    }
  | { type: 'list'; ordered: boolean; items: MdInlineToken[][] };

/* --------------------- parser --------------------- */

function parseInline(text: string): MdInlineToken[] {
  const tokens: MdInlineToken[] = [];
  let i = 0;

  function pushText(value: string) {
    if (!value) return;
    if (tokens.length && tokens[tokens.length - 1].type === 'text') {
      (tokens[tokens.length - 1] as { value: string }).value += value;
    } else {
      tokens.push({ type: 'text', value });
    }
  }

  while (i < text.length) {
    const ch = text[i];

    // inline code: `…`
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // bold: **…**
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({
          type: 'bold',
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // italic: *…*
    if (ch === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        tokens.push({
          type: 'italic',
          children: parseInline(text.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }

    // strike: ~~…~~
    if (ch === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        tokens.push({
          type: 'strike',
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // link [t](url)
    if (ch === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen).trim();
          if (/^https?:\/\//i.test(href)) {
            tokens.push({
              type: 'link',
              href,
              children: parseInline(label),
            });
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    pushText(ch);
    i += 1;
  }

  return tokens;
}

function parseBlocks(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // code block
    const fenceMatch = /^```\s*([\w-]+)?\s*$/.exec(line);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? '';
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'codeblock', lang, value: buf.join('\n') });
      i += 1;
      continue;
    }

    // table:  | a | b |
    //         | --- | --- |
    //         | 1 | 2 |
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const splitRow = (row: string): string[] => {
        let r = row.trim();
        if (r.startsWith('|')) r = r.slice(1);
        if (r.endsWith('|')) r = r.slice(0, -1);
        // podział po '|', ignorując '\|' (escape)
        const cells: string[] = [];
        let current = '';
        for (let k = 0; k < r.length; k += 1) {
          if (r[k] === '\\' && r[k + 1] === '|') {
            current += '|';
            k += 1;
          } else if (r[k] === '|') {
            cells.push(current);
            current = '';
          } else {
            current += r[k];
          }
        }
        cells.push(current);
        return cells.map((c) => c.trim());
      };

      const headerCells = splitRow(line);
      const alignCells = splitRow(lines[i + 1]);
      const align = alignCells.map((c) => {
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        if (left && right) return 'center' as const;
        if (right) return 'right' as const;
        if (left) return 'left' as const;
        return null;
      });

      i += 2;
      const rows: MdInlineToken[][][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = splitRow(lines[i]);
        // wyrównaj liczbę kolumn do nagłówka
        while (cells.length < headerCells.length) cells.push('');
        rows.push(cells.slice(0, headerCells.length).map((c) => parseInline(c)));
        i += 1;
      }

      blocks.push({
        type: 'table',
        header: headerCells.map((c) => parseInline(c)),
        align,
        rows,
      });
      continue;
    }

    // heading
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        type: 'heading',
        level,
        tokens: parseInline(headingMatch[2]),
      });
      i += 1;
      continue;
    }

    // quote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', tokens: parseInline(buf.join(' ')) });
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: MdInlineToken[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s+/, '')));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: MdInlineToken[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*]\s+/, '')));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // empty line
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // paragraph (collect consecutive non-empty lines)
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', tokens: parseInline(buf.join(' ')) });
  }

  return blocks;
}

/* --------------------- renderer --------------------- */

function renderInline(tokens: MdInlineToken[]): ReactNode {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'text':
        return <Fragment key={index}>{token.value}</Fragment>;
      case 'code':
        return (
          <code key={index} className="md__code-inline">
            {token.value}
          </code>
        );
      case 'bold':
        return <strong key={index}>{renderInline(token.children)}</strong>;
      case 'italic':
        return <em key={index}>{renderInline(token.children)}</em>;
      case 'strike':
        return <s key={index}>{renderInline(token.children)}</s>;
      case 'link':
        return (
          <a
            key={index}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="md__link"
          >
            {renderInline(token.children)}
          </a>
        );
    }
  });
}

function renderBlock(block: MdBlock, index: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level + 2}` as 'h3' | 'h4' | 'h5');
      return (
        <Tag key={index} className={`md__heading md__heading--${block.level}`}>
          {renderInline(block.tokens)}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p key={index} className="md__p">
          {renderInline(block.tokens)}
        </p>
      );
    case 'quote':
      return (
        <blockquote key={index} className="md__quote">
          {renderInline(block.tokens)}
        </blockquote>
      );
    case 'codeblock':
      return <CodeBlock key={index} lang={block.lang} value={block.value} />;
    case 'table':
      return (
        <div key={index} className="md__table-wrap">
          <table className="md__table">
            <thead>
              <tr>
                {block.header.map((cell, ci) => (
                  <th
                    key={ci}
                    style={
                      block.align[ci]
                        ? { textAlign: block.align[ci] as 'left' | 'center' | 'right' }
                        : undefined
                    }
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={
                        block.align[ci]
                          ? { textAlign: block.align[ci] as 'left' | 'center' | 'right' }
                          : undefined
                      }
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list': {
      if (block.ordered) {
        return (
          <ol key={index} className="md__ol">
            {block.items.map((tokens, i) => (
              <li key={i}>{renderInline(tokens)}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={index} className="md__ul">
          {block.items.map((tokens, i) => (
            <li key={i}>{renderInline(tokens)}</li>
          ))}
        </ul>
      );
    }
  }
}

function CodeBlock({ lang, value }: { lang: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort
    }
  }

  return (
    <pre className="md__pre" data-lang={lang}>
      <button
        type="button"
        className="md__copy"
        aria-label="Kopiuj kod"
        onClick={handleCopy}
      >
        {copied ? 'Skopiowano' : 'Kopiuj'}
      </button>
      <code>{value}</code>
    </pre>
  );
}

export const Markdown = memo(function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={`md ${className ?? ''}`.trim()}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
});
