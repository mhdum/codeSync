"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

interface VersionItem {
    id: string;
    fileId: string;
    collaboratorEmail: string;
    stats: { added: number; removed: number; modified: number };
    createdAt: any; // timestamp
    status: string;
    file_name?: string;
    file_extension?: string;
    diffSummary?: {
        addedLines: { index: number; line: string }[];
        modifiedLines: { index: number; line: string }[];
        removedLines: { index: number; line: string }[];
    };
}

function formatFirestoreDate(createdAt: any) {
    if (!createdAt) return "Unknown date";

    // Firestore Timestamp object
    if (createdAt.seconds) {
        return new Date(createdAt.seconds * 1000).toLocaleString();
    }

    // ISO string or number
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
    }

    return "Unknown date";
}


export default function VersionHistoryPage() {
    const params = useSearchParams();
    const router = useRouter();
    const projectId = params.get("projectId");

    const [loading, setLoading] = useState(true);
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!projectId) return;

        const fetchVersions = async () => {
            try {
                setLoading(true);

                const res = await fetch(`/api/version-control/list?projectId=${projectId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch versions");

                // Fetch file names for each version
                const versionsWithFile = await Promise.all(
                    (data.versions || []).map(async (v: VersionItem) => {
                        try {
                            const fileRes = await fetch(`/api/files/get-file-name?fileId=${v.fileId}`);
                            const fileData = await fileRes.json();
                            return { ...v, ...fileData };
                        } catch {
                            return v;
                        }
                    })
                );

                setVersions(versionsWithFile);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [projectId]);
    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <h1 className="text-2xl font-bold">
                    Version History
                </h1>
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-24 rounded-lg bg-muted animate-pulse"
                        />
                    ))}
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <p className="text-red-500">{error}</p>
            )}

            {/* Empty State */}
            {!loading && versions.length === 0 && !error && (
                <div className="text-center mt-20">
                    <p className="text-lg font-medium">
                        No version history found
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                        Versions will appear here after admin approvals.
                    </p>
                </div>
            )}

            {/* Versions List */}
            {!loading && versions.length > 0 && (
                <div className="space-y-4">
                    {versions.map((v) => (
                        <div
                            key={v.id}
                            className="
                border rounded-lg p-4
                bg-background
                hover:bg-muted/40
                transition
              "
                        >
                            <div className="flex justify-between flex-wrap gap-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">File</p>
                                    <p className="font-medium">
                                        {v.file_name ? `${v.file_name}.${v.file_extension}` : "Unknown"}
                                    </p>

                                    <p className="text-sm text-muted-foreground mt-1">
                                        Collaborator
                                    </p>
                                    <p className="font-medium">{v.collaboratorEmail}</p>
                                </div>

                                <div className="text-sm text-right">
                                    <p className="text-muted-foreground">
                                        {v.createdAt
                                            ? new Date(v.createdAt).toLocaleString()
                                            : "Unknown date"}
                                    </p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-green-600 text-white">
                                        {v.status}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-6 text-sm">
                                <span className="text-green-600">
                                    +{v.stats.added} added
                                </span>
                                <span className="text-red-600">
                                    -{v.stats.removed} removed
                                </span>
                                <span className="text-yellow-600">
                                    ~{v.stats.modified} modified
                                </span>
                            </div>

                            <div className="mt-4 text-sm font-mono bg-gray-50 p-3 rounded space-y-2">
                                {/* Added Lines */}
                                {v.diffSummary?.addedLines?.length ? (
                                    <div>
                                        <p className="text-green-600 font-semibold">Added:</p>
                                        {v.diffSummary.addedLines.map((line) => (
                                            <pre key={line.index} className="text-green-600">
                                                + {line.line}
                                            </pre>
                                        ))}
                                    </div>
                                ) : null}

                                {/* Modified Lines */}
                                {v.diffSummary?.modifiedLines?.length ? (
                                    <div>
                                        <p className="text-yellow-600 font-semibold">Modified:</p>
                                        {v.diffSummary.modifiedLines.map((line) => (
                                            <pre key={line.index} className="text-yellow-600">
                                                ~ {line.line}
                                            </pre>
                                        ))}
                                    </div>
                                ) : null}

                                {/* Removed Lines */}
                                {v.diffSummary?.removedLines?.length ? (
                                    <div>
                                        <p className="text-red-600 font-semibold">Removed:</p>
                                        {v.diffSummary.removedLines.map((line) => (
                                            <pre key={line.index} className="text-red-600">
                                                - {line.line}
                                            </pre>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
