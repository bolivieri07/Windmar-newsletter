const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// Remove all non-ASCII characters that are corrupting the file
c = c.replace(/[^\x00-\x7F]/g, "");

// Fix the broken dropdown menu section
c = c.replace(
  /\{showMenu && \([\s\S]*?\)\)[\s\S]*?\}\)/,
  `{showMenu && (
        <div style={{position:"absolute",top:56,right:12,background:"white",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",border:"1px solid #f3f4f6",minWidth:180,zIndex:200,overflow:"hidden"}}>
          <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",gap:10,padding:"0.8rem 1rem",fontSize:"0.88rem",fontWeight:600,color:"#1f2937",textDecoration:"none",borderBottom:"1px solid #f3f4f6"}}>
            Academy Website
          </a>
          <a href="/admin"
            style={{display:"flex",alignItems:"center",gap:10,padding:"0.8rem 1rem",fontSize:"0.88rem",fontWeight:600,color:"#1a2f6e",textDecoration:"none"}}>
            Admin Login
          </a>
        </div>
      )}`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done - file cleaned and fixed");
