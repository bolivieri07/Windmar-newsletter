const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// Hide feature cards on mobile, show only on desktop
c = c.replace(
  `<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>`,
  `<div className="hero-desktop" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done");
