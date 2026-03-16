"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Document as DocType } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const statusBadge: Record<string, { label: string; variant: "default" | "warning" | "info" }> = {
  active: { label: "Active", variant: "default" },
  archived: { label: "Archived", variant: "warning" },
  draft: { label: "Draft", variant: "info" },
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fileTypeLabel(mimeType?: string | null): string {
  if (!mimeType) return "File";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("document") || mimeType.includes("word")) return "Document";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Slides";
  if (mimeType.startsWith("text/")) return "Text";
  return "File";
}

/* ---- Inline SVG icons --------------------------------------------- */

const FolderIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FileIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const VersionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function DocumentsPage() {
  const { user } = useAuth();

  /* ---- Navigation state -------------------------------------------- */
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: null, name: "Root" },
  ]);

  /* ---- Documents state --------------------------------------------- */
  const [docs, setDocs] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Detail / expand state --------------------------------------- */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versionCreating, setVersionCreating] = useState(false);

  /* ---- Create modal state ------------------------------------------ */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<"file" | "folder">("file");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Fetch documents --------------------------------------------- */

  const fetchDocs = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.documents.list(parentId ?? undefined);
      if (res.success && res.data) {
        setDocs(res.data as unknown as DocType[]);
      } else {
        setError(res.error || "Failed to load documents");
      }
    } catch {
      setError("Network error loading documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs(currentFolder);
  }, [currentFolder, fetchDocs]);

  /* ---- Navigation helpers ------------------------------------------ */

  const navigateToFolder = (folderId: string, folderName: string) => {
    setExpandedId(null);
    setCurrentFolder(folderId);
    setBreadcrumb((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumb[index];
    setExpandedId(null);
    setCurrentFolder(target.id);
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  };

  /* ---- Create document / folder ------------------------------------ */

  const openCreateModal = (mode: "file" | "folder") => {
    setCreateMode(mode);
    setCreateName("");
    setCreateDescription("");
    setCreateTags("");
    setCreateError(null);
    setShowCreateModal(true);
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateName("");
    setCreateDescription("");
    setCreateTags("");
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const tags = createTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.documents.create({
        name: createName.trim(),
        type: createMode,
        description: createDescription.trim() || null,
        tags: tags.length > 0 ? tags : [],
        parentId: currentFolder ?? null,
      });

      if (res.success) {
        resetCreateModal();
        await fetchDocs(currentFolder);
      } else {
        setCreateError(res.error || "Failed to create document");
      }
    } catch {
      setCreateError("Network error creating document");
    } finally {
      setCreating(false);
    }
  };

  /* ---- Create new version ------------------------------------------ */

  const handleCreateVersion = async (docId: string) => {
    setVersionCreating(true);
    try {
      const res = await api.documents.createVersion(docId, {
        content: "New version uploaded",
      });
      if (res.success) {
        await fetchDocs(currentFolder);
      }
    } catch {
      // silently fail, could add toast
    } finally {
      setVersionCreating(false);
    }
  };

  /* ---- Derived data ------------------------------------------------ */

  const folders = docs.filter((d) => d.type === "folder");
  const files = docs.filter((d) => d.type === "file");
  const expandedDoc = expandedId ? docs.find((d) => d.id === expandedId) : null;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#fafdf7]">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <header className="border-b border-sage-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400">
              Enterprise
            </p>
            <h1 className="text-2xl font-bold text-neutral-800">Documents</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => openCreateModal("folder")}>
              <FolderIcon size={16} />
              New Folder
            </Button>
            <Button variant="primary" size="sm" onClick={() => openCreateModal("file")}>
              <PlusIcon />
              New Document
            </Button>
          </div>
        </div>

        {/* ---- Breadcrumb -------------------------------------------- */}
        <nav className="mt-3 flex items-center gap-1 text-sm">
          {breadcrumb.map((item, idx) => {
            const isLast = idx === breadcrumb.length - 1;
            return (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && (
                  <span className="text-neutral-300">
                    <ChevronRightIcon />
                  </span>
                )}
                <button
                  onClick={() => navigateToBreadcrumb(idx)}
                  disabled={isLast}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-colors",
                    isLast
                      ? "cursor-default font-medium text-neutral-800"
                      : "text-primary-500 hover:bg-primary-50 hover:text-primary-600"
                  )}
                >
                  {item.name}
                </button>
              </span>
            );
          })}
        </nav>
      </header>

      {/* ============================================================ */}
      {/*  Content                                                      */}
      {/* ============================================================ */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {loading ? (
          /* ---- Loading state ---------------------------------------- */
          <div className="flex flex-col items-center gap-3 py-20">
            <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading documents...</p>
          </div>
        ) : error ? (
          /* ---- Error state ------------------------------------------ */
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="font-medium text-neutral-700">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchDocs(currentFolder)}>
              Retry
            </Button>
          </div>
        ) : docs.length === 0 ? (
          /* ---- Empty state ------------------------------------------ */
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-100 text-neutral-400">
              <FolderIcon size={28} />
            </div>
            <h3 className="text-lg font-semibold text-neutral-700">
              {currentFolder ? "This folder is empty" : "No documents yet"}
            </h3>
            <p className="max-w-sm text-sm text-neutral-500">
              {currentFolder
                ? "Add files or folders to organize your content."
                : "Create your first document or folder to get started."}
            </p>
            <div className="mt-2 flex gap-3">
              <Button variant="secondary" size="sm" onClick={() => openCreateModal("folder")}>
                <FolderIcon size={16} />
                New Folder
              </Button>
              <Button variant="primary" size="sm" onClick={() => openCreateModal("file")}>
                <PlusIcon />
                New Document
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ---- Folders ------------------------------------------- */}
            {folders.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Folders
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {folders.map((folder) => (
                    <Card
                      key={folder.id}
                      variant="outlined"
                      className="group transition-all hover:border-primary-300 hover:shadow-sm"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500 transition-colors group-hover:bg-primary-100">
                          <FolderIcon size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-800">
                            {folder.name}
                          </p>
                          {folder.status && statusBadge[folder.status] && (
                            <Badge
                              variant={statusBadge[folder.status].variant}
                              className="mt-1 text-[10px] px-1.5 py-0"
                            >
                              {statusBadge[folder.status].label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* ---- Files --------------------------------------------- */}
            {files.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Files
                </h2>
                <div className="flex flex-col gap-2">
                  {files.map((file) => {
                    const isExpanded = expandedId === file.id;
                    const badge = statusBadge[file.status] ?? statusBadge.active;

                    return (
                      <div key={file.id}>
                        <Card
                          variant="outlined"
                          className={cn(
                            "transition-all hover:border-primary-300 hover:shadow-sm",
                            isExpanded && "border-primary-300 shadow-sm"
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : file.id)}
                        >
                          <div className="flex items-center gap-4">
                            {/* File icon */}
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-neutral-500">
                              <FileIcon size={20} />
                            </span>

                            {/* File info */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-neutral-800">
                                {file.name}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                                <span>{fileTypeLabel(file.mimeType)}</span>
                                {file.size != null && (
                                  <>
                                    <span className="text-neutral-300">|</span>
                                    <span>{formatBytes(file.size)}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right metadata */}
                            <div className="hidden shrink-0 items-center gap-3 sm:flex">
                              {file.version != null && (
                                <span className="flex items-center gap-1 text-xs text-neutral-500">
                                  <VersionIcon />
                                  v{file.version}
                                </span>
                              )}
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              {file.uploadedBy && (
                                <span className="max-w-[100px] truncate text-xs text-neutral-400">
                                  {file.uploadedBy}
                                </span>
                              )}
                              <span className="text-xs text-neutral-400">
                                {formatDate(file.updatedAt)}
                              </span>
                            </div>

                            {/* Expand chevron */}
                            <span
                              className={cn(
                                "text-neutral-400 transition-transform",
                                isExpanded && "rotate-90"
                              )}
                            >
                              <ChevronRightIcon />
                            </span>
                          </div>
                        </Card>

                        {/* ---- Expanded detail panel ------------------- */}
                        {isExpanded && expandedDoc && (
                          <div className="ml-14 mt-1 rounded-2xl border border-sage-200 bg-white p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* Description */}
                              <div>
                                <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                  Description
                                </h4>
                                <p className="text-sm text-neutral-600">
                                  {expandedDoc.description || "No description provided."}
                                </p>
                              </div>

                              {/* Version */}
                              <div>
                                <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                  Version
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-700">
                                    v{expandedDoc.version}
                                  </span>
                                  {expandedDoc.versions && (
                                    <span className="text-xs text-neutral-400">
                                      ({expandedDoc.versions})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tags */}
                              <div>
                                <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                  <TagIcon />
                                  Tags
                                </h4>
                                {expandedDoc.tags && expandedDoc.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {expandedDoc.tags.map((tag, i) => (
                                      <Badge key={i} variant="default" className="text-[11px]">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-400">No tags</p>
                                )}
                              </div>

                              {/* Permissions */}
                              <div>
                                <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                                  <ShieldIcon />
                                  Permissions
                                </h4>
                                <p className="text-sm text-neutral-600">
                                  {expandedDoc.permissions || "Default permissions"}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 flex items-center gap-3 border-t border-sage-100 pt-4">
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={versionCreating}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateVersion(expandedDoc.id);
                                }}
                              >
                                <VersionIcon />
                                New Version
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ============================================================ */}
      {/*  CREATE DOCUMENT / FOLDER MODAL                               */}
      {/* ============================================================ */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetCreateModal}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-800">
                  {createMode === "folder" ? "New Folder" : "New Document"}
                </h2>
                <p className="text-sm text-neutral-500">
                  {createMode === "folder"
                    ? "Create a folder to organize your documents."
                    : "Add a new document to this location."}
                </p>
              </div>
              <button
                onClick={resetCreateModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-sage-100 hover:text-neutral-600"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Name */}
              <Input
                label="Name"
                placeholder={createMode === "folder" ? "e.g. Marketing Assets" : "e.g. Q4 Report.pdf"}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                autoFocus
              />

              {/* Type selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">Type</label>
                <select
                  value={createMode}
                  onChange={(e) => setCreateMode(e.target.value as "file" | "folder")}
                  className="w-full rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="file">File</option>
                  <option value="folder">Folder</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Tags */}
              <Input
                label="Tags"
                placeholder="Comma-separated, e.g. finance, report, q4"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
              />

              {/* Error */}
              {createError && (
                <p className="text-xs text-red-500">{createError}</p>
              )}

              {/* Actions */}
              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={resetCreateModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={creating}
                  disabled={!createName.trim()}
                >
                  {createMode === "folder" ? "Create Folder" : "Create Document"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
