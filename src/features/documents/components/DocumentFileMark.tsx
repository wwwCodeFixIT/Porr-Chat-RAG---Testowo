import { getFileExtension } from '../utils/documentFormatters';

import './DocumentFileMark.css';

type DocumentFileMarkProps = {
  fileName: string;
};

export function DocumentFileMark({ fileName }: DocumentFileMarkProps) {
  return (
    <span className="document-file-mark" aria-hidden="true">
      {getFileExtension(fileName)}
    </span>
  );
}