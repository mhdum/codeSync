import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            projectId,
            fileId,
            collaboratorId,
            collaboratorEmail,
            sessionId,
            startedAt,
            endedAt,
            changes,
            originalContent,
            finalContent,
            proposalId,
        } = body;

        if (!projectId || !fileId || !collaboratorId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const versionRef = admin
            .firestore()
            .collection("fileVersions")
            .doc();

        await versionRef.set({
            projectId,
            fileId,
            // sessionId: sessionId ?? null,

            collaboratorId,
            collaboratorEmail: collaboratorEmail ?? null,

            // startedAt: startedAt ? new Date(startedAt) : null,
            // endedAt: endedAt ? new Date(endedAt) : null,
            // durationMs:
            //     startedAt && endedAt ? endedAt - startedAt : null,

            // proposalId: proposalId ?? null,

            stats: {
                added: changes?.addedLines?.length ?? 0,
                removed: changes?.removedLines?.length ?? 0,
                modified: changes?.modifiedLines?.length ?? 0,
            },

            diffSummary: {
                addedLines: changes?.addedLines ?? [],
                removedLines: changes?.removedLines ?? [],
                modifiedLines: changes?.modifiedLines ?? [],
            },

            originalHash: crypto
                .createHash("sha256")
                .update(originalContent ?? "")
                .digest("hex"),

            finalHash: crypto
                .createHash("sha256")
                .update(finalContent ?? "")
                .digest("hex"),

            status: "approved",
            createdAt: new Date(),
        });

        return NextResponse.json(
            { success: true, versionId: versionRef.id },
            { status: 200 }
        );
    } catch (err) {
        console.error("Version create error", err);
        return NextResponse.json(
            { error: "Failed to store version" },
            { status: 500 }
        );
    }
}
