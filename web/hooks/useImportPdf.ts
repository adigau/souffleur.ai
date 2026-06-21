"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

export function useImportPdf() {
  const t = useTranslations("library");
  const router = useRouter();
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function triggerFileInput() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type !== "application/pdf") {
      setImportError(t("importPdf.typeError"));
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setImportError(t("importPdf.sizeError"));
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("/api/plays/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error ?? t("importPdf.failed"));
        return;
      }

      router.push(`${prefix}/app/plays/${data.userPlayId}/edit`);
    } catch {
      setImportError(t("importPdf.failed"));
    } finally {
      setIsImporting(false);
    }
  }

  return {
    fileInputRef,
    handleFileChange,
    triggerFileInput,
    isImporting,
    importError,
  };
}
