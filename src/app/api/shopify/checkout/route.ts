import { NextResponse } from "next/server"

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

export async function POST(request: Request) {
  const { variantId, quantity = 1 } = await request.json()

  const mutation = `
    mutation {
      checkoutCreate(input: {
        lineItems: [{ variantId: "${variantId}", quantity: ${quantity} }]
      }) {
        checkout { webUrl }
        checkoutUserErrors { message }
      }
    }
  `

  try {
    const res = await fetch(`https://${DOMAIN}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": TOKEN!,
      },
      body: JSON.stringify({ query: mutation }),
    })
    const data = await res.json()
    const checkout = data.data?.checkoutCreate?.checkout
    const errors = data.data?.checkoutCreate?.checkoutUserErrors
    if (errors?.length) return NextResponse.json({ error: errors[0].message }, { status: 400 })
    if (!checkout) throw new Error("Could not create checkout")
    return NextResponse.json({ checkoutUrl: checkout.webUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
