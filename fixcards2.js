const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// Fix the CSS - desktop-only should be none on mobile, grid on desktop
c = c.replace(
  `.desktop-only { display: none !important; }`,
  ``
);

c = c.replace(
  `.desktop-only { display: none !important; }`,
  ``
);

// Make sure the media query shows it on desktop
c = c.replace(
  `.desktop-only { display: grid !important; }`,
  `.desktop-only { display: grid !important; }`
);

// Add the mobile hide rule BEFORE the media query
c = c.replace(
  `@media (min-width: 768px) {`,
  `.desktop-only { display: none; }
        @media (min-width: 768px) {`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done");
