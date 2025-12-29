import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userEmail = url.searchParams.get("userEmail");

        if (!userEmail) {
            return NextResponse.json(
                { error: "Missing userEmail" },
                { status: 400 }
            );
        }

        // 1️⃣ Fetch all projects created by this user
        const userProjectsSnapshot = await adminDb
            .collection("projects")
            .where("ownerid", "==", userEmail)
            .get();

        const totalProjects = userProjectsSnapshot.size;

        // If no projects → everything is 0%
        if (totalProjects === 0) {
            return NextResponse.json(
                {
                    totalProjects: 0,
                    completedCount: 0,
                    nonCompletedCount: 0,
                    completedPercentage: 0,
                    nonCompletedPercentage: 0,
                },
                { status: 200 }
            );
        }

        // 2️⃣ Fetch completed_projects for this user
        const completedDoc = await adminDb
            .collection("completed_projects")
            .doc(userEmail)
            .get();

        const completedArray = completedDoc.exists
            ? completedDoc.data()?.projects || []
            : [];

        const completedCount = completedArray.length;
        const nonCompletedCount = Math.max(totalProjects - completedCount, 0);

        // 3️⃣ Percentages
        const completedPercentage = Math.round(
            (completedCount / totalProjects) * 100
        );

        const nonCompletedPercentage = 100 - completedPercentage;
        console.log(`Status : ${completedCount}`);
        return NextResponse.json(
            {
                totalProjects,
                completedCount,
                nonCompletedCount,
                completedPercentage,
                nonCompletedPercentage,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("❌ SUMMARY ERROR:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}
