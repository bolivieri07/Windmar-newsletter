import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const domain = process.env.SHOPIFY_STORE_DOMAIN;

  console.log("TOKEN EXISTS:", !!token);
  console.log("TOKEN PREFIX:", token?.slice(0, 6));
  console.log("DOMAIN:", domain);

  if (!token || !domain) {
    return NextResponse.json(
      { error: "Missing Shopify env vars", hasToken: !!token, hasDomain: !!domain },
      { status: 500 }
    );
  }

  const query = `{
    products(first: 10) {
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
          variants(first: 1) {
            edges {
              node {
                id
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
    console.log("SHOPIFY RESPONSE STATUS:", res.status);
    console.log("SHOPIFY RESPONSE:", JSON.stringify(data).slice(0, 500));

    if (data.errors) {
      return NextResponse.json({ error: data.errors }, { status: 403 });
    }

    return NextResponse.json(data.data.products.edges.map((e: any) => e.node));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
