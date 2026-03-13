const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

c = c.replace(
  /https:\/\/windmarsolaracademy\.com\/courses/g,
  "https://ettrenv5nd46gqbz5a9e.app.clientclub.net/login"
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done");
