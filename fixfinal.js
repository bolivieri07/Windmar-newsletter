const fs = require("fs");

// -- FIX 1: Guest page - show spiff image on cards --
let page = fs.readFileSync("src/app/page.tsx", "utf8");
page = page.replace(
  `                  <div key={g.id} className="spiff-card">
                    <div className="spiff-header">`,
  `                  <div key={g.id} className="spiff-card">
                    {g.prize_image_url && (
                      <img src={g.prize_image_url} alt={g.prize_name} style={{width:"100%",height:180,objectFit:"cover",display:"block"}} />
                    )}
                    <div className="spiff-header">`
);
fs.writeFileSync("src/app/page.tsx", page, "utf8");
console.log("done - guest spiff image fixed");

// -- FIX 2: Post creator - replace URL field with upload --
let posts = fs.readFileSync("src/app/admin/posts/new/page.tsx", "utf8");

// Find and replace the cover image section regardless of exact whitespace
const oldSection = posts.substring(
  posts.indexOf("<div style={{marginBottom:\"0\"}}>"),
  posts.indexOf("</div>", posts.indexOf("Cover Image")) + 6
);

// Just do a targeted replace of the label and input
posts = posts.replace(
  `<label style={labelStyle}>Cover Image URL</label>
            <input type="url" value={form.cover_image_url} onChange={e => setForm({...form,cover_image_url:e.target.value})}
                placeholder="https://..." style={inputStyle} />
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="preview"
                  style={{width:"100%",height:160,objectFit:"cover",borderRadius:8,marginTop:"0.5rem"}} />
              )}`,
  `<label style={labelStyle}>Cover Image</label>
            <div
              style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#f9fafb"}}
              onClick={() => { const el = document.getElementById("cover-upload"); if(el) (el as HTMLInputElement).click(); }}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file) await uploadImage(file); }}
            >
              <input id="cover-upload" type="file" accept="image/*" style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if(file) await uploadImage(file); }} />
              {form.cover_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.cover_image_url} alt="preview" style={{width:"100%",height:200,objectFit:"cover",borderRadius:8,display:"block"}} />
                  <button onClick={(e) => { e.stopPropagation(); setForm(p => ({...p,cover_image_url:""})) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.65)",color:"white",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontWeight:700}}>
                    X
                  </button>
                </div>
              ) : uploading ? (
                <div style={{padding:"2rem 0",color:"#f89b24",fontWeight:700}}>Uploading...</div>
              ) : (
                <div style={{padding:"1rem 0"}}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.75rem",display:"block"}}>
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  <div style={{color:"#374151",fontWeight:700,fontSize:"1rem"}}>Click to upload or drag and drop</div>
                  <div style={{color:"#9ca3af",fontSize:"0.82rem",marginTop:"0.3rem"}}>PNG, JPG, WebP up to 10MB</div>
                </div>
              )}
            </div>`
);
fs.writeFileSync("src/app/admin/posts/new/page.tsx", posts, "utf8");
console.log("done - post upload UI fixed");
