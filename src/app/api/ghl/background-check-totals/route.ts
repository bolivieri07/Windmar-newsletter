import { NextResponse } from "next/server";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E";
const DOC_NAME_QUERY = "Windmar- Home Depot Background Check";

// GHL document statuses
const STATUSES = ["completed", "accepted", "sent", "draft", "viewed"] as const;

async function fetchCountForStatuses(
  accessToken: string,
  statuses: string[]
): Promise<{ total: number }> {
  const params = new URLSearchParams({
    locationId: LOCATION_ID,
    limit: "1",
    skip: "0",
    query: DOC_NAME_QUERY,
  });

  // Add status[] params
  for (const s of statuses) {
    params.append("status[]", s);
  }

  const res = await fetch(
    `${GHL_API_BASE}/proposals/document?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
      },
    }
  );

  if (!res.ok) {
    console.error(`GHL totals fetch failed for statuses [${statuses}]: ${res.status}`);
    return { total: 0 };
  }

  const data = await res.json();
  return { total: data.total ?? data.count ?? 0 };
}

export async function GET() {
  try {
    const accessToken =
      process.env.GHL_ACCESS_TOKEN || process.env.GHL_API_KEY || "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "GHL API token not configured" },
        { status: 500 }
      );
    }

    // Fire parallel requests: one per status group + one for all (no status filter)
    const [allResult, completedResult, sentResult, draftResult, viewedResult] =
      await Promise.all([
        // Total (no status filter) — all background checks
        fetchCountForStatuses(accessToken, []),
        // Completed / Accepted (signed)
        fetchCountForStatuses(accessToken, ["completed", "accepted"]),
        // Sent (waiting for signature)
        fetchCountForStatuses(accessToken, ["sent"]),
        // Draft
        fetchCountForStatuses(accessToken, ["draft"]),
        // Viewed (opened but not signed)
        fetchCountForStatuses(accessToken, ["viewed"]),
      ]);

    const totals = {
      all: allResult.total,
      completed: completedResult.total,
      sent: sentResult.total,
      draft: draftResult.total,
      viewed: viewedResult.total,
    };

    return NextResponse.json(totals);
  } catch (error) {
    console.error("Background check totals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch totals" },
      { status: 500 }
    );
  }
}
