const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");
c = c.replace(
  `type Giveaway = {
  id: string
  prize_name: string
  prize_description: string | null
  entry_deadline: string
  status: string
  entry_count: number
  posts: { title: string; excerpt: string } | null
}`,
  `type Giveaway = {
  id: string
  prize_name: string
  prize_description: string | null
  prize_image_url: string | null
  entry_deadline: string
  status: string
  entry_count: number
  posts: { title: string; excerpt: string } | null
}`
);
fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done");
