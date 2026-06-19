import type { DocumentItem } from '../../chat/types';
import { DOCUMENT_UPLOAD_CONFIG } from '../config/documentUploadConfig';

type ValidateDocumentFilesResult = {
  validFiles: File[];
  errors: string[];
};

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function validateDocumentFiles(
  files: File[],
  existingDocuments: DocumentItem[]
): ValidateDocumentFilesResult {
  const errors: string[] = [];
  const validFiles: File[] = [];

  const maxFileSizeBytes =
    DOCUMENT_UPLOAD_CONFIG.maxFileSizeMb * 1024 * 1024;

  if (files.length > DOCUMENT_UPLOAD_CONFIG.maxFilesPerUpload) {
    errors.push(
      `Możesz wgrać maksymalnie ${DOCUMENT_UPLOAD_CONFIG.maxFilesPerUpload} plików naraz.`
    );
  }

  const filesToValidate = files.slice(
    0,
    DOCUMENT_UPLOAD_CONFIG.maxFilesPerUpload
  );

  for (const file of filesToValidate) {
    const extension = getFileExtension(file.name);

    const alreadyExists = existingDocuments.some(
      (documentItem) =>
        documentItem.name.trim().toLowerCase() === file.name.trim().toLowerCase()
    );

    if (file.size === 0) {
      errors.push(`Plik "${file.name}" jest pusty.`);
      continue;
    }

    if (file.size > maxFileSizeBytes) {
      errors.push(
        `Plik "${file.name}" przekracza limit ${DOCUMENT_UPLOAD_CONFIG.maxFileSizeMb} MB.`
      );
      continue;
    }

    if (!DOCUMENT_UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
      errors.push(`Plik "${file.name}" ma niedozwolone rozszerzenie.`);
      continue;
    }

    if (
      file.type &&
      !DOCUMENT_UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)
    ) {
      errors.push(`Plik "${file.name}" ma niedozwolony typ MIME.`);
      continue;
    }

    if (alreadyExists) {
      errors.push(`Plik "${file.name}" już istnieje na liście dokumentów.`);
      continue;
    }

    validFiles.push(file);
  }

  return {
    validFiles,
    errors,
  };
}