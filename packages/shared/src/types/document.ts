/**
 * Document-related types and interfaces
 */

import { UUID, Timestamp, DocumentType } from './common';

export interface Document extends Timestamp {
  id: UUID;
  caseId: UUID;
  userId: UUID;
  title: string;
  description?: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  thumbnailUrl?: string;
  pageCount?: number;
  isProcessed: boolean;
  processingStatus?: DocumentProcessingStatus;
  extractedText?: string;
  metadata?: DocumentMetadata;
}

export type DocumentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface DocumentMetadata {
  author?: string;
  dateCreated?: Date;
  dateModified?: Date;
  keywords?: string[];
  summary?: string;
  ocrConfidence?: number;
}

export interface DocumentWithCase extends Document {
  case: {
    id: UUID;
    studentAlias: string;
  };
}

export interface CreateDocumentInput {
  caseId: UUID;
  title: string;
  description?: string;
  type: DocumentType;
  file: File | Blob;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  type?: DocumentType;
  metadata?: Partial<DocumentMetadata>;
}

export interface DocumentSearchParams {
  caseId?: UUID;
  type?: DocumentType;
  query?: string;
  isProcessed?: boolean;
  uploadedAfter?: Date;
  uploadedBefore?: Date;
}

export interface DocumentUploadResponse {
  id: UUID;
  uploadUrl: string;
  expiresAt: Date;
}

export interface DocumentProcessingResult {
  documentId: UUID;
  status: DocumentProcessingStatus;
  extractedText?: string;
  pageCount?: number;
  ocrConfidence?: number;
  error?: string;
}

export interface SemanticSearchResult {
  documentId: UUID;
  title: string;
  snippet: string;
  similarity: number;
  pageNumber?: number;
}
