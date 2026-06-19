export const DOCUMENT_UPLOAD_CONFIG = {
  maxFilesPerUpload: 10,
  maxFileSizeMb: 25,

  allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx'],

  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};