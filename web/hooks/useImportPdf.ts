"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePdfImport } from "@/contexts/PdfImportContext";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

// Count PDF pages client-side by scanning raw bytes — same algorithm as server-side countPdfPages.
async function countPdfPagesClient(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buffer);
  const matches = text.match(/\/Type\s*\/Page\b(?!s)/g);
  if (matches?.length) return matches.length;
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => parseInt(m[1], 10));
  return counts.length ? Math.max(...counts) : 0;
}

// Rough heuristic: text PDFs are small per page; scanned PDFs contain embedded images.
// Average: text PDF < 80 KB/page, scanned PDF > 80 KB/page.
function detectLikelyMode(fileSizeBytes: number, pageCount: number): "text" | "scan" {
  if (pageCount === 0) return "scan"; // can't tell — assume scan (more expensive path)
  return fileSizeBytes / pageCount < 80_000 ? "text" : "scan";
}

export function useImportPdf() {
  const t = useTranslations("library");
  const { startImport, setPendingImport } = usePdfImport();
  const router = useRouter();
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function triggerFileInput() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setImportError(t("importPdf.typeError"));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setImportError(t("importPdf.sizeError"));
      return;
    }

    setIsAnalysing(true);
    setImportError(null);

    const pageCount = await countPdfPagesClient(file);
    const likelyMode = detectLikelyMode(file.size, pageCount);
    const estimatedSec = Math.max(15, pageCount * 18);

    setIsAnalysing(false);

    setPendingImport(
      { file, fileName: file.name, fileSize: file.size, pageCount, likelyMode, estimatedSec },
      async () => {
        const { playId, error } = await startImport(file);
        if (!playId || error) {
          setImportError(error ?? t("importPdf.failed"));
          return;
        }
        router.push(`${prefix}/app/plays/${playId}/edit`);
      }
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await processFile(file);
  }

  async function handleFileDrop(file: File) {
    await processFile(file);
  }

  return {
    fileInputRef,
    handleFileChange,
    handleFileDrop,
    triggerFileInput,
    isImporting: isAnalysing,
    importingLabel: t("importPdf.importing"),
    importError,
  };
}
