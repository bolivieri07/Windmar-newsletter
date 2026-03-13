const fs = require("fs");
let c = fs.readFileSync("src/app/page.tsx", "utf8");

// 1. Fix mobile quick grid - replace letter placeholders with SVG icons
c = c.replace(
  `<div className="quick-grid">
                <div className="quick-item" onClick={() => setActiveTab("feed")}><div className="quick-icon">N</div><div className="quick-label">Feed</div></div>
                <div className="quick-item" onClick={() => setActiveTab("spiffs")}><div className="quick-icon">$</div><div className="quick-label">Spiffs</div></div>
                <div className="quick-item" onClick={() => setActiveTab("calendar")}><div className="quick-icon">C</div><div className="quick-label">Events</div></div>
                <div className="quick-item" onClick={() => setActiveTab("resources")}><div className="quick-icon">D</div><div className="quick-label">Docs</div></div>
              </div>`,
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
              </div>`
);

fs.writeFileSync("src/app/page.tsx", c, "utf8");
console.log("done - icons fixed");
