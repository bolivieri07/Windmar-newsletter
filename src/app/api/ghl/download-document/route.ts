import { NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const documentId = searchParams.get("id")
  const contactName = searchParams.get("name") || "document"

  if (!documentId) {
    return NextResponse.json({ error: "Missing document ID" }, { status: 400 })
  }

  const token = process.env.GHL_API_KEY
  if (!token) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 })
  }

  // Try multiple GHL endpoints for document download
  const endpoints = [
    `${GHL_BASE}/proposals/document/${documentId}/download`,
    `${GHL_BASE}/proposals/document/${documentId}`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Version": "2021-07-28",
          "Accept": "application/pdf,application/octet-stream,*/*",
        },
      })

      if (!res.ok) continue

      const contentType = res.headers.get("content-type") || ""

      // If we got a PDF or binary response, proxy it as a download
      if (contentType.includes("pdf") || contentType.includes("octet-stream") || contentType.includes("binary")) {
        const buffer = await res.arrayBuffer()
        const safeName = contactName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="BG_Check_${safeName}.pdf"`,
          },
        })
      }

      // If JSON response, check if it contains a download URL
      const data = await res.json()
      if (data.url || data.downloadUrl || data.fileUrl) {
        const fileUrl = data.url || data.downloadUrl || data.fileUrl
        const fileRes = await fetch(fileUrl)
        if (fileRes.ok) {
          const buffer = await fileRes.arrayBuffer()
          const safeName = contactName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="BG_Check_${safeName}.pdf"`,
            },
          })
        }
      }

      // If the response has document content with a signed URL
      if (data.document?.signedUrl || data.signedUrl) {
        const signedUrl = data.document?.signedUrl || data.signedUrl
        const fileRes = await fetch(signedUrl)
        if (fileRes.ok) {
          const buffer = await fileRes.arrayBuffer()
          const safeName = contactName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="BG_Check_${safeName}.pdf"`,
            },
          })
        }
      }
    } catch (err) {
      console.error("Download attempt failed for", url, err)
      continue
    }
  }

  // If direct download failed, try getting document details to find any file URL
  try {
    const detailRes = await fetch(`${GHL_BASE}/proposals/document?locationId=eTTRenV5nD46gQbZ5A9E&documentId=${documentId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Version": "2021-07-28",
      },
    })
    if (detailRes.ok) {
      const detailData = await detailRes.json()
      console.log("Document details:", JSON.stringify(detailData).slice(0, 1000))
      return NextResponse.json({
        error: "Could not download PDF directly. Document details logged.",
        details: detailData,
      }, { status: 422 })
    }
  } catch {}

  return NextResponse.json({ error: "Could not download document. GHL API may not support direct PDF download for this document type." }, { status: 500 })
}
