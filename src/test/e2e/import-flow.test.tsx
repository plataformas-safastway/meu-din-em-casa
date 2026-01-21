/**
 * Testes E2E - Fluxo de Importação (rota /review reidratável)
 * Cobertura: upload→review/:id→processing→reviewing, reload, failed→retry, rota sem id
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ImportReviewPage } from "@/pages/import/ImportReviewPage";

// Evita dependências internas do handler de fontes detectadas durante os testes
vi.mock("@/components/import/DetectedSourceHandler", () => ({
  DetectedSourceHandler: () => <div data-testid="detected-source-handler" />,
}));

type ImportBatch = {
  id: string;
  family_id: string;
  file_name: string;
  file_type: string;
  import_type: string;
  source_id: string;
  invoice_month: string | null;
  status: string;
  transactions_count: number | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  detected_bank: string | null;
  detected_document_type: string | null;
};

type ImportItem = {
  id: string;
  import_id: string;
  family_id: string;
  date: string;
  original_date: string | null;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  category_id: string;
  subcategory_id: string | null;
  suggested_category_id: string | null;
  is_duplicate: boolean;
  duplicate_transaction_id: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  raw_data: unknown;
  created_at: string;
};

const makeBatch = (overrides: Partial<ImportBatch> = {}): ImportBatch => ({
  id: "import-123",
  family_id: "family-1",
  file_name: "teste.ofx",
  file_type: "ofx",
  import_type: "bank_statement",
  source_id: "bank-1",
  invoice_month: null,
  status: "processing",
  transactions_count: 1,
  error_message: null,
  created_at: new Date().toISOString(),
  processed_at: null,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  created_by: "user-1",
  detected_bank: "Banco QA",
  detected_document_type: "extrato",
  ...overrides,
});

const makeItem = (overrides: Partial<ImportItem> = {}): ImportItem => ({
  id: "item-1",
  import_id: "import-123",
  family_id: "family-1",
  date: "2026-01-10",
  original_date: null,
  amount: 100,
  type: "expense",
  description: "IFOOD *RESTAURANTE",
  category_id: "alimentacao",
  subcategory_id: null,
  suggested_category_id: "alimentacao",
  is_duplicate: false,
  duplicate_transaction_id: null,
  confidence_score: 0.9,
  needs_review: false,
  raw_data: {},
  created_at: new Date().toISOString(),
  ...overrides,
});

// ----------------------------------------------------
// Mock do módulo de fluxo (controla estados sem backend)
// ----------------------------------------------------

const mockUseImportBatch = vi.fn();
const mockUseImportPolling = vi.fn();
const mockRetryMutate = vi.fn();

vi.mock("@/hooks/useImportFlow", () => {
  const IMPORT_ERROR_CODES = {
    NOT_FOUND: "IMPORT-001",
    EXPIRED: "IMPORT-002",
    FAILED: "IMPORT-003",
    EMPTY: "IMPORT-004",
    NETWORK: "IMPORT-005",
    UNAUTHORIZED: "IMPORT-006",
    PROCESSING_TIMEOUT: "IMPORT-007",
  } as const;

  return {
    IMPORT_ERROR_CODES,
    getPendingImportId: vi.fn(() => null),
    clearPendingImportId: vi.fn(),
    useImportBatch: (importId: string | null) => mockUseImportBatch(importId),
    useImportPolling: (...args: any[]) => mockUseImportPolling(...args),
    usePendingImports: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
    useConfirmImportBatch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useCancelImportBatch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useUpdateImportItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useDeleteImportItems: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useRetryImport: vi.fn(() => ({ mutate: mockRetryMutate, isPending: false })),
  };
});

function renderReview(route: string, path = "/app/import/:importId/review") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={<ImportReviewPage />} />
        {/* rota propositalmente sem :importId */}
        <Route path="/app/import/review" element={<ImportReviewPage />} />
        <Route path="/app/import" element={<div>IMPORT_HOME</div>} />
        <Route path="/app" element={<div>APP_HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Importação - fluxo reidratável (review)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rota sem id deve renderizar estado 'Importação não encontrada'", () => {
    mockUseImportBatch.mockReturnValue({
      batch: null,
      items: [],
      isLoading: false,
      isError: false,
      error: null,
      errorCode: null,
      isEmpty: false,
      isExpired: false,
      isProcessing: false,
      isFailed: false,
      isReviewing: false,
      summary: {
        total: 0,
        validCount: 0,
        duplicateCount: 0,
        needsReviewCount: 0,
        totalIncome: 0,
        totalExpense: 0,
      },
      refetch: vi.fn(),
    });

    renderReview("/app/import/review", "/app/import/review");
    expect(screen.getByText(/importação não encontrada/i)).toBeInTheDocument();
  });

  it("processing→reviewing: deve exibir progresso e depois tela de revisão", () => {
    const refetch = vi.fn();

    const processingState = {
      batch: makeBatch({ status: "processing" }),
      items: [],
      isLoading: false,
      isError: false,
      error: null,
      errorCode: null,
      isEmpty: false,
      isExpired: false,
      isProcessing: true,
      isFailed: false,
      isReviewing: false,
      summary: {
        total: 0,
        validCount: 0,
        duplicateCount: 0,
        needsReviewCount: 0,
        totalIncome: 0,
        totalExpense: 0,
      },
      refetch,
    };

    const reviewingState = {
      batch: makeBatch({ status: "reviewing" }),
      items: [makeItem()],
      isLoading: false,
      isError: false,
      error: null,
      errorCode: null,
      isEmpty: false,
      isExpired: false,
      isProcessing: false,
      isFailed: false,
      isReviewing: true,
      summary: {
        total: 1,
        validCount: 1,
        duplicateCount: 0,
        needsReviewCount: 0,
        totalIncome: 0,
        totalExpense: 100,
      },
      refetch,
    };

    mockUseImportBatch.mockReturnValue(processingState);

    const { rerender } = renderReview("/app/import/import-123/review");

    expect(screen.getByText(/processando importação/i)).toBeInTheDocument();
    expect(mockUseImportPolling).toHaveBeenCalledWith("import-123", true, refetch);

    mockUseImportBatch.mockReturnValue(reviewingState);
    rerender(
      <MemoryRouter initialEntries={["/app/import/import-123/review"]}>
        <Routes>
          <Route path="/app/import/:importId/review" element={<ImportReviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/revisar importação/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmar \(1\)/i)).toBeInTheDocument();
  });

  it("reload: deve priorizar o :importId da rota (mesmo com pending id no storage)", async () => {
    const importFlow = await import("@/hooks/useImportFlow");
    vi.mocked(importFlow.getPendingImportId).mockReturnValue("import-OTHER");

    mockUseImportBatch.mockReturnValue({
      batch: makeBatch({ id: "import-abc", status: "reviewing" }),
      items: [makeItem({ import_id: "import-abc" })],
      isLoading: false,
      isError: false,
      error: null,
      errorCode: null,
      isEmpty: false,
      isExpired: false,
      isProcessing: false,
      isFailed: false,
      isReviewing: true,
      summary: {
        total: 1,
        validCount: 1,
        duplicateCount: 0,
        needsReviewCount: 0,
        totalIncome: 0,
        totalExpense: 100,
      },
      refetch: vi.fn(),
    });

    renderReview("/app/import/import-abc/review");
    expect(mockUseImportBatch).toHaveBeenCalledWith("import-abc");
  });

  it("failed→retry: clicar em 'Tentar novamente' deve chamar retry(importId)", () => {
    mockUseImportBatch.mockReturnValue({
      batch: makeBatch({ status: "failed", error_message: "Falha ao processar" }),
      items: [],
      isLoading: false,
      isError: false,
      error: null,
      errorCode: "IMPORT-003",
      isEmpty: false,
      isExpired: false,
      isProcessing: false,
      isFailed: true,
      isReviewing: false,
      summary: {
        total: 0,
        validCount: 0,
        duplicateCount: 0,
        needsReviewCount: 0,
        totalIncome: 0,
        totalExpense: 0,
      },
      refetch: vi.fn(),
    });

    renderReview("/app/import/import-123/review");

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(mockRetryMutate).toHaveBeenCalledWith("import-123");
  });
});
