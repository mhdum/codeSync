import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId is required" },
                { status: 400 }
            );
        }

        const snapshot = await admin
            .firestore()
            .collection("fileVersions")
            .where("projectId", "==", projectId)
            .orderBy("createdAt", "desc")
            .get();

        const versions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            diffSummary: doc.data().diffSummary || {},
            createdAt: doc.data().createdAt
                ? doc.data().createdAt.toDate().toISOString()
                : null
        }));

        return NextResponse.json(
            { success: true, versions },
            { status: 200 }
        );
    } catch (err) {
        console.error("Fetch versions error", err);
        return NextResponse.json(
            { error: "Failed to fetch versions" },
            { status: 500 }
        );
    }
}
