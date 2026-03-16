"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface DocumentLink {
  url: string;
  title?: string;
  type?: string;
}

interface Document {
  id: string;
  name: string;
  status: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
  links?: DocumentLink[];
  sentTo?: { email?: string; name?: string }[];
  [key: string]: unknown;
}

interface ApiResponse {
  documents: Document[];
  total: number;
  count: number;
}

interface Totals {
  all: number;
  completed: number;
  sent: number;
  draft: number;
  viewed: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E";
const DOC_NAME_FILTER = "Windmar- Home Depot Background Check";
const PAGE_SIZE = 20;

// Custom field IDs for contact file downloads
const CUSTOM_FIELDS = {
  selfie: "IvtzPRyBRw6fUpvsLQZ0",
  id: "WpmuIT4Pdot4M644rxtt",
  ssn: "yHDtP3x1ZLCAEzbbLoBE",
};

// ─── Helper: Format date ─────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

// ─── Helper: Status badge color ──────────────────────────────────────────────
function statusColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "accepted" || s === "signed")
    return "bg-green-100 text-green-800 border-green-200";
  if (s === "sent" || s === "waiting" || s === "pending")
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "viewed")
    return "bg-purple-100 text-purple-800 border-purple-200";
  if (s === "draft") return "bg-gray-100 text-gray-600 border-gray-200";
  if (s === "declined" || s === "expired" || s === "voided")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function BackgroundChecksPage() {
  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Totals state - always the full count from ALL contracts
  const [totals, setTotals] = useState<Totals | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    id: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Expanded row for details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Fetch totals (runs once on mount, always full count) ───────────────
  const fetchTotals = useCallback(async () => {
    try {
      setTotalsLoading(true);
      const res = await fetch("/api/ghl/background-check-totals");
      if (res.ok) {
        const data: Totals = await res.json();
        setTotals(data);
      }
    } catch (err) {
      console.error("Failed to fetch totals:", err);
    } finally {
      setTotalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  // ─── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Reset when search changes
  useEffect(() => {
    setDocuments([]);
    setSkip(0);
    setHasMore(true);
    setError(null);
  }, [debouncedSearch]);

  // ─── Fetch documents ────────────────────────────────────────────────────
  const fetchDocuments = useCallback(
    async (currentSkip: number, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          locationId: LOCATION_ID,
          limit: PAGE_SIZE.toString(),
          skip: currentSkip.toString(),
        });

        if (debouncedSearch) {
          params.set("query", debouncedSearch);
        }

        const endpoint = `/proposals/document?${params.toString()}`;
        const res = await fetch(
          `/api/ghl/test?endpoint=${encodeURIComponent(endpoint)}`
        );

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data: ApiResponse = await res.json();

        const filtered = (data.documents || []).filter((doc) =>
          (doc.name || "").includes(DOC_NAME_FILTER)
        );

        if (append) {
          setDocuments((prev) => [...prev, ...filtered]);
        } else {
          setDocuments(filtered);
        }

        const allDocs = data.documents || [];
        if (allDocs.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch documents"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    fetchDocuments(0, false);
  }, [fetchDocuments]);

  // ─── Load More ──────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    const nextSkip = skip + PAGE_SIZE;
    setSkip(nextSkip);
    fetchDocuments(nextSkip, true);
  };

  // ─── Feature 1: Download signed document ────────────────────────────────
  const handleDownloadDocument = async (doc: Document) => {
    setDownloadingId(doc.id);
    setActionMessage(null);

    try {
      if (doc.links && doc.links.length > 0) {
        const signedLink = doc.links.find(
          (link) =>
            link.type === "signed" ||
            link.type === "completed" ||
            link.type === "pdf" ||
            link.url?.includes("pdf")
        );
        const downloadUrl = signedLink?.url || doc.links[0]?.url;

        if (downloadUrl) {
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
          setActionMessage({
            id: doc.id,
            type: "success",
            text: "Document opened in new tab",
          });
        } else {
          setActionMessage({
            id: doc.id,
            type: "error",
            text: "No download link found",
          });
        }
      } else {
        setActionMessage({
          id: doc.id,
          type: "error",
          text: "No signed document link available",
        });
      }
    } catch (err) {
      console.error("Download error:", err);
      setActionMessage({
        id: doc.id,
        type: "error",
        text: "Failed to download document",
      });
    } finally {
      setDownloadingId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // ─── Feature 2: Resend contract ─────────────────────────────────────────
  const handleResendContract = async (doc: Document) => {
    if (
      !confirm(
        `Resend background check contract to ${doc.contactName || doc.contactEmail || "this contact"}?`
      )
    ) {
      return;
    }

    setResendingId(doc.id);
    setActionMessage(null);

    try {
      const res = await fetch("/api/ghl/resend-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          locationId: LOCATION_ID,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setActionMessage({
          id: doc.id,
          type: "success",
          text: "Contract resent successfully!",
        });
      } else {
        setActionMessage({
          id: doc.id,
          type: "error",
          text: data.error || data.message || "Failed to resend contract",
        });
      }
    } catch (err) {
      console.error("Resend error:", err);
      setActionMessage({
        id: doc.id,
        type: "error",
        text: "Failed to resend",
      });
    } finally {
      setResendingId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // ─── Feature 3: Copy signing link ──────────────────────────────────────
  const handleCopyLink = async (doc: Document) => {
    setCopiedId(null);
    setActionMessage(null);

    try {
      let signingLink = "";

      if (doc.links && doc.links.length > 0) {
        const shareLink = doc.links.find(
          (link) =>
            link.type === "share" ||
            link.type === "signing" ||
            link.type === "view" ||
            link.url?.includes("proposal") ||
            link.url?.includes("sign")
        );
        signingLink = shareLink?.url || doc.links[0]?.url || "";
      }

      if (!signingLink) {
        signingLink = `https://app.gohighlevel.com/proposals/document/view/${doc.id}`;
      }

      await navigator.clipboard.writeText(signingLink);
      setCopiedId(doc.id);
      setActionMessage({
        id: doc.id,
        type: "success",
        text: "Link copied to clipboard!",
      });

      setTimeout(() => setCopiedId(null), 2500);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error("Copy error:", err);
      setActionMessage({
        id: doc.id,
        type: "error",
        text: "Failed to copy link",
      });
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                HD Background Checks
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage Home Depot background check documents via GHL
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTotals}
                title="Refresh totals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 ${totalsLoading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Totals
              </button>
              <a
                href="/admin"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Admin
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Totals Cards - always full count from ALL contracts ─────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {/* Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Contracts
            </div>
            {totalsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {totals?.all?.toLocaleString() ?? "\u2014"}
              </div>
            )}
          </div>

          {/* Completed / Signed */}
          <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide">
              Completed
            </div>
            {totalsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-green-700 mt-1">
                {totals?.completed?.toLocaleString() ?? "\u2014"}
              </div>
            )}
          </div>

          {/* Sent */}
          <div className="bg-white rounded-lg border border-yellow-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
              Sent
            </div>
            {totalsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-yellow-700 mt-1">
                {totals?.sent?.toLocaleString() ?? "\u2014"}
              </div>
            )}
          </div>

          {/* Viewed */}
          <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">
              Viewed
            </div>
            {totalsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-purple-700 mt-1">
                {totals?.viewed?.toLocaleString() ?? "\u2014"}
              </div>
            )}
          </div>

          {/* Draft */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Draft
            </div>
            {totalsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-600 mt-1">
                {totals?.draft?.toLocaleString() ?? "\u2014"}
              </div>
            )}
          </div>
        </div>

        {/* ── Search Bar ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Error State ──────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => {
                  setSkip(0);
                  fetchDocuments(0, false);
                }}
                className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Loading State ────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 mt-3">
              Loading background checks...
            </p>
          </div>
        )}

        {/* ── Documents Table ──────────────────────────────────────────── */}
        {!loading && documents.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                            {(
                              doc.contactName ||
                              doc.contactEmail ||
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.contactName || "Unknown"}
                            </p>
                            {doc.contactEmail && (
                              <p className="text-xs text-gray-500 truncate">
                                {doc.contactEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(doc.status)}`}
                        >
                          {doc.status || "Unknown"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                        {formatDate(doc.updatedAt || doc.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Action message toast (inline) */}
                          {actionMessage?.id === doc.id && (
                            <span
                              className={`text-xs font-medium mr-2 animate-pulse ${
                                actionMessage.type === "success"
                                  ? "text-green-600"
                                  : "text-red-500"
                              }`}
                            >
                              {actionMessage.text}
                            </span>
                          )}

                          {/* Download signed document */}
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={downloadingId === doc.id}
                            title="Download signed document"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {downloadingId === doc.id ? (
                              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </button>

                          {/* Copy signing link */}
                          <button
                            onClick={() => handleCopyLink(doc)}
                            title="Copy signing link"
                            className={`p-2 rounded-lg transition-colors ${
                              copiedId === doc.id
                                ? "text-green-600 bg-green-50"
                                : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                            }`}
                          >
                            {copiedId === doc.id ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            )}
                          </button>

                          {/* Resend contract */}
                          <button
                            onClick={() => handleResendContract(doc)}
                            disabled={resendingId === doc.id}
                            title="Resend contract"
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resendingId === doc.id ? (
                              <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>

                          {/* Expand/details toggle */}
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === doc.id ? null : doc.id
                              )
                            }
                            title="Show details"
                            className={`p-2 rounded-lg transition-colors ${
                              expandedId === doc.id
                                ? "text-blue-600 bg-blue-50"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedId === doc.id ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Expanded details row */}
                        {expandedId === doc.id && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                <span className="font-medium text-gray-700">
                                  Doc ID:{" "}
                                </span>
                                <span className="font-mono">{doc.id}</span>
                              </div>
                              {doc.contactId && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Contact ID:{" "}
                                  </span>
                                  <span className="font-mono">
                                    {doc.contactId}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-700">
                                  Created:{" "}
                                </span>
                                {formatDate(doc.createdAt)}
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Updated:{" "}
                                </span>
                                {formatDate(doc.updatedAt)}
                              </div>
                              {doc.links && doc.links.length > 0 && (
                                <div className="sm:col-span-2">
                                  <span className="font-medium text-gray-700">
                                    Links:{" "}
                                  </span>
                                  {doc.links.map((link, i) => (
                                    <a
                                      key={i}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline mr-3"
                                    >
                                      {link.title || link.type || `Link ${i + 1}`}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More button */}
            {hasMore && (
              <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Showing {documents.length} of{" "}
                  {totals?.all?.toLocaleString() ?? "..."} contracts
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────── */}
        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-20">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 text-sm">
              {debouncedSearch
                ? `No background checks found for "${debouncedSearch}"`
                : "No background check documents found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
