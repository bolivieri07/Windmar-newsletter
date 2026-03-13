const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// Fix hero - remove watermark overlay, clean up background
c = c.replace(
  `<div className="hero-desktop" style={{borderRadius:16,overflow:"hidden",marginBottom:"1.5rem",position:"relative",minHeight:320,background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)"}}>
              <img src={ASSETS.hero} alt="Solar Academy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.25}} onError={(e:any)=>{e.target.style.display="none"}} />
              <div style={{position:"relative",zIndex:1,padding:"3rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"2rem",minHeight:320}}>`,
  `<div className="hero-desktop" style={{borderRadius:16,overflow:"hidden",marginBottom:"1.5rem",position:"relative",minHeight:320,background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)"}}>
              <img src={ASSETS.hero} alt="Solar Academy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.15}} onError={(e:any)=>{e.target.style.display="none"}} />
              <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,29,71,0.95) 0%,rgba(26,47,110,0.85) 60%,rgba(42,74,158,0.75) 100%)",zIndex:0}} />
              <div style={{position:"relative",zIndex:1,padding:"3rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"2rem",minHeight:320}}>`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done - hero fixed");
