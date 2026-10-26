export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'review_required' | 'failed';

export type EntityCategory = 'financial' | 'identity' | 'compliance' | 'dates' | 'metadata';

export interface ExtractedEntity {
  id: string;
  name: string;
  value: string;
  category: EntityCategory;
  confidence: number; // 0 to 100
  page?: number;
  needsReview?: boolean;
}

export interface GeminiAnalysis {
  executiveSummary: string;
  riskScore: 'low' | 'medium' | 'high';
  riskFactors: string[];
  suggestedActions: string[];
  complianceChecked: boolean;
  modelUsed: string;
  generatedAt: string;
}

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  fileType: string;
  uploadedAt: string;
  status: DocumentStatus;
  overallConfidence: number;
  entities: ExtractedEntity[];
  geminiAnalysis?: GeminiAnalysis;
  rawTextSnippet?: string;
  supabaseSynced: boolean;
  processingStage?: 'upload' | 'ocr' | 'genai' | 'synced';
}

export interface DashboardMetrics {
  totalDocuments: number;
  avgConfidence: number;
  pendingReviewCount: number;
  processedToday: number;
  pipelineHealth: 'healthy' | 'degraded' | 'offline';
}
