import { NextRequest, NextResponse } from "next/server";

// GHL API base URL
const GHL_API_BASE = "https://services.leadconnectorhq.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, locationId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Get the GHL access token from env
    const accessToken =
      process.env.GHL_ACCESS_TOKEN || process.env.GHL_API_KEY || "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "GHL API token not configured" },
        { status: 500 }
      );
    }

    // Call GHL Send Document endpoint
    // POST /proposals/document/send
    // Scope required: documents_contracts/sendLink.write
    const ghlResponse = await fetch(`${GHL_API_BASE}/proposals/document/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        documentId,
        locationId: locationId || "eTTRenV5nD46gQbZ5A9E",
      }),
    });

    const data = await ghlResponse.json();

    if (!ghlResponse.ok) {
      console.error("GHL resend error:", data);
      return NextResponse.json(
        {
          error: data.message || data.error || "Failed to resend document",
          details: data,
        },
        { status: ghlResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document resent successfully",
      data,
    });
  } catch (error) {
    console.error("Resend document error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
