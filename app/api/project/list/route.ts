import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

interface ProjectData {
    project_id: string;
    name?: string;
    ownerid?: string;
    collaborators?: string[];
    createdAt?: Date | null;
    updatedAt?: Date | null;
    [key: string]: any;
}

export async function POST(req: Request) {
    try {
        const { ownerid } = await req.json() as { ownerid?: string };

        if (!ownerid) {
            return NextResponse.json(
                { error: "ownerid is required" },
                { status: 400 }
            );
        }

        const snapshot = await adminDb
            .collection("projects")
            .where("ownerid", "==", ownerid)
            .get();

        const projects: ProjectData[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            projects.push({
                project_id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() ?? null,
                updatedAt: data.updatedAt?.toDate?.() ?? null,
            });
        });

        return NextResponse.json({ projects }, { status: 200 });

    } catch (err: any) {
        console.error("🔥 Server Error:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        );
    }
}
