const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// Add hide-mobile class to CSS
c = c.replace(
  `@media (min-width: 768px) {
          .desktop-nav { display: flex; }
          .mobile-nav { display: none !important; }
          .app-shell { max-width: 100% !important; }
          .app-content { padding-bottom: 0 !important; }
          .desktop-sidebar { display: flex; }
          .content-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
          .hero-desktop { display: block; }
          .hero-mobile { display: none; }
          .feed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        }`,
  `@media (min-width: 768px) {
          .desktop-nav { display: flex; }
          .mobile-nav { display: none !important; }
          .app-shell { max-width: 100% !important; }
          .app-content { padding-bottom: 0 !important; }
          .desktop-sidebar { display: flex; }
          .content-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
          .hero-desktop { display: block; }
          .hero-mobile { display: none; }
          .feed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .desktop-only { display: grid !important; }
        }
        .desktop-only { display: none !important; }`
);

// Replace the feature cards wrapper class
c = c.replace(
  `<div className="hero-desktop" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>`,
  `<div className="desktop-only" style={{gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done");
