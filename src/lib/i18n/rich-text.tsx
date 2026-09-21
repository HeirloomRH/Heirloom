import { Fragment, type ReactNode } from "react";

/**
 * Renders the markdown-lite used inside dictionary strings:
 *
 *   **bold**            -> <strong>
 *   `code`              -> <code>
 *   [label](https://…)  -> <a target="_blank">
 *
 * Keeping the emphasis inside one translatable string means a translator can
 * move it wherever the target language needs it, instead of being locked into
 * the sentence order of the English original.
 */
const PATTERN = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

export function Rich({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  PATTERN.lastIndex = 0;
  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));

    const [, bold, code, label, href] = match;
    if (bold !== undefined) {
      out.push(<strong key={key++}>{bold}</strong>);
    } else if (code !== undefined) {
      out.push(<code key={key++}>{code}</code>);
    } else if (label !== undefined && href !== undefined) {
      out.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          {label}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return (
    <>
      {out.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </>
  );
}
