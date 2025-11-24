import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // Firebase Admin SDK

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userEmail = searchParams.get("userEmail");

        if (!userEmail) {
            return NextResponse.json({ error: "Missing userEmail" }, { status: 400 });
        }

        // ---------------------------
        // 1️⃣ Fetch Completed Projects
        // ---------------------------
        const completedDoc = await adminDb
            .collection("completed_projects")
            .doc(userEmail)
            .get();

        const completedData = completedDoc.data();
        const completedProjects =
            completedData?.projects && Array.isArray(completedData.projects)
                ? completedData.projects
                : [];

        // ---------------------------
        // 2️⃣ Fetch Created Projects
        // ---------------------------
        const createdSnapshot = await adminDb
            .collection("projects")
            .where("ownerid", "==", userEmail)
            .get();

        const createdProjects = createdSnapshot.docs.map((d) => {
            const data = d.data();
            return {
                projectId: data.project_id ?? "",
                projectTitle: data.name ?? "",
                createdAt: data.createdAt ?? null,
            };
        });

        // ---------------------------
        // 3️⃣ Calculations
        // ---------------------------
        const totalCreated = createdProjects.length;
        const totalCompleted = completedProjects.length;

        const completedPercentage =
            totalCreated === 0
                ? 0
                : Math.round((totalCompleted / totalCreated) * 100);

        const nonCompletedPercentage = 100 - completedPercentage;

        // ---------------------------
        // 4️⃣ Response
        // ---------------------------
        return NextResponse.json({
            totalCreated,
            totalCompleted,
            completedPercentage,
            nonCompletedPercentage,
            completedProjects,
            createdProjects,
        });
    } catch (error: unknown) {
        // Fix: safely narrow the unknown error
        let message = "Unknown error";

        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === "string") {
            message = error;
        }

        console.error("🔥 Firestore Admin Error:", message);

        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}
