import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const domain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!token || !domain) {
    return NextResponse.json({ error: "Missing Shopify env vars" }, { status: 500 });
  }

  const query = `{
    products(first: 20) {
      edges {
        node {
          id
          title
          description
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                priceV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }`;

  try {
    const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors }, { status: 403 });
    }

    const seen = new Set<string>();
    const products = data.data.products.edges
      .filter((e: any) => {
        if (seen.has(e.node.id)) return false;
        seen.add(e.node.id);
        return true;
      })
      .map((e: any) => {
        const node = e.node;
        const firstImage = node.images.edges[0]?.node;
        const variants = node.variants.edges.map((v: any) => ({
          id: v.node.id,
          title: v.node.title,
          price: parseFloat(v.node.priceV2.amount),
          available: v.node.availableForSale,
        }));
        const firstVariant = variants[0];

        return {
          id: node.id,
          title: node.title,
          description: node.description || "",
          price: firstVariant?.price || 0,
          currency: node.variants.edges[0]?.node.priceV2.currencyCode || "USD",
          image: firstImage?.url || null,
          imageAlt: firstImage?.altText || node.title,
          variants,
        };
      });

    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
