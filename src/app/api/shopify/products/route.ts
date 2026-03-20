import { NextResponse } from "next/server"

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

const query = `{
  products(first: 20) {
    edges {
      node {
        id
        title
        description
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price { amount currencyCode }
              availableForSale
            }
          }
        }
      }
    }
  }
}`

export async function GET() {
  try {
    const res = await fetch(`https://${DOMAIN}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": TOKEN!,
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    })

    const data = await res.json()

    // Log full response for debugging
    console.log("Shopify raw response:", JSON.stringify(data))

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || "Shopify query error" }, { status: 400 })
    }

    if (!data.data?.products?.edges) {
      return NextResponse.json({ error: "Unexpected response", raw: data }, { status: 500 })
    }

    const products = data.data.products.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      description: e.node.description,
      price: parseFloat(e.node.priceRange.minVariantPrice.amount),
      currency: e.node.priceRange.minVariantPrice.currencyCode,
      image: e.node.images.edges[0]?.node.url || null,
      imageAlt: e.node.images.edges[0]?.node.altText || e.node.title,
      variants: e.node.variants.edges.map((v: any) => ({
        id: v.node.id,
        title: v.node.title,
        price: parseFloat(v.node.price.amount),
        available: v.node.availableForSale,
      })),
    }))

    return NextResponse.json({ products })
  } catch (err: any) {
    console.error("Shopify fetch error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
