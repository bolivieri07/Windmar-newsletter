const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// 1. Fix hero gradient - lighter so logo is visible
c = c.replace(
  `<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,29,71,0.95) 0%,rgba(26,47,110,0.85) 60%,rgba(42,74,158,0.75) 100%)",zIndex:0}} />`,
  `<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,29,71,0.75) 0%,rgba(26,47,110,0.65) 60%,rgba(42,74,158,0.55) 100%)",zIndex:0}} />`
);

// 2. Remove top desktop nav bar entirely - remove the whole header nav section
c = c.replace(
  `<header style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:40,width:"auto",objectFit:"contain"}} onError={(e:any)=>{e.target.style.display="none"}} />
            <div className="desktop-nav" style={{alignItems:"center",gap:"0.25rem",marginLeft:"1rem"}}>
              {navTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{padding:"0.5rem 1rem",borderRadius:6,border:"none",background:activeTab===tab.id?"rgba(248,155,36,0.2)":"transparent",color:activeTab===tab.id?"#f89b24":"rgba(255,255,255,0.75)",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
              style={{padding:"0.5rem 1rem",background:"rgba(255,255,255,0.1)",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Academy Site
            </a>
            <a href="/login"
              style={{padding:"0.5rem 1rem",background:"#f89b24",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Admin
            </a>
            <button className="menu-btn" style={{display:"none"}} onClick={(e:any)=>{e.stopPropagation();setShowMenu(!showMenu)}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>`,
  `<header style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:40,width:"auto",objectFit:"contain"}} onError={(e:any)=>{e.target.style.display="none"}} />
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
              style={{padding:"0.5rem 1rem",background:"rgba(255,255,255,0.1)",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Academy Site
            </a>
            <a href="/login"
              style={{padding:"0.5rem 1rem",background:"#f89b24",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Admin
            </a>
          </div>
        </div>
      </header>`
);

// 3. Remove mobile quick-grid entirely
c = c.replace(
  `<div className="quick-grid">
                <div className="quick-item" onClick={() => setActiveTab("feed")}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a2f6e" strokeWidth="2" style={{margin:"0 auto 0.3rem"}}>
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  <div className="quick-label">Feed</div>
                </div>
                <div className="quick-item" onClick={() => setActiveTab("spiffs")}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f89b24" strokeWidth="2" style={{margin:"0 auto 0.3rem"}}>
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <div className="quick-label">Spiffs</div>
                </div>
                <div className="quick-item" onClick={() => setActiveTab("calendar")}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a2f6e" strokeWidth="2" style={{margin:"0 auto 0.3rem"}}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <div className="quick-label">Events</div>
                </div>
                <div className="quick-item" onClick={() => setActiveTab("resources")}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a2f6e" strokeWidth="2" style={{margin:"0 auto 0.3rem"}}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <div className="quick-label">Docs</div>
                </div>
              </div>`,
  ``
);

// 4. Remove mobile hero banner section - keep only latest updates on mobile home
c = c.replace(
  `<div className="hero-mobile">
              <div className="hero-banner" style={{marginBottom:"1rem"}}>
                <div className="hero-greeting">Welcome to</div>
                <div className="hero-name">Solar Academy</div>
                <div className="hero-sub">We Train You. We Value You. We Promote You.</div>
                <div className="hero-stats">
                  <div className="hero-stat"><div className="hero-stat-val">{posts.length||"—"}</div><div className="hero-stat-lbl">Updates</div></div>
                  <div className="hero-stat"><div className="hero-stat-val">{events.length||"—"}</div><div className="hero-stat-lbl">Events</div></div>
                  <div className="hero-stat"><div className="hero-stat-val">{giveaways.length||"—"}</div><div className="hero-stat-lbl">Spiffs</div></div>
                </div>
              </div>`,
  `<div className="hero-mobile">
              <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)",borderRadius:14,padding:"1.25rem",marginBottom:"1rem",color:"white",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,top:-10,width:120,height:120,borderRadius:"50%",background:"rgba(248,155,36,0.1)"}} />
                <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:36,width:"auto",objectFit:"contain",marginBottom:"0.75rem",display:"block"}} onError={(e:any)=>{e.target.style.display="none"}} />
                <div style={{fontSize:"0.75rem",opacity:0.7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Welcome to</div>
                <div style={{fontSize:"1.5rem",fontWeight:800,margin:"0.15rem 0"}}><span style={{color:"#f89b24"}}>Solar</span> Academy</div>
                <div style={{fontSize:"0.82rem",opacity:0.8}}>We Train You. We Value You. We Promote You.</div>
              </div>`
);

// 5. Remove all "Explore ?" buttons from feature cards
c = c.replace(/<div style={{color:"#f89b24",fontSize:"0\.82rem",fontWeight:700,marginTop:"0\.5rem"}}>Explore ?<\/div>/g, "");

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done - all fixes applied");
