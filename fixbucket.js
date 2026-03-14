const fs = require("fs");

// Fix post-images bucket name to match exactly what you created
let posts = fs.readFileSync("src/app/admin/posts/new/page.tsx", "utf8");
posts = posts.replace(
  `.from("post-images")`,
  `.from("post-image")`
);
fs.writeFileSync("src/app/admin/posts/new/page.tsx", posts, "utf8");
console.log("done - bucket name fixed to post-image");
