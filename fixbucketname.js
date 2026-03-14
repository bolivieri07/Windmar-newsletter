const fs = require("fs");
let c = fs.readFileSync("src/app/admin/posts/new/page.tsx", "utf8");
c = c.replace(
  `supabase.storage.from("post-images").getPublicUrl(fileName)`,
  `supabase.storage.from("post-image").getPublicUrl(fileName)`
);
fs.writeFileSync("src/app/admin/posts/new/page.tsx", c, "utf8");
console.log("done");
