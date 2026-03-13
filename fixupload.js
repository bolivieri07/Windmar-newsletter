const fs = require("fs");
let c = fs.readFileSync("src/app/admin/posts/new/page.tsx", "utf8");

// Replace URL input with file upload for cover image
c = c.replace(
  `<div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Cover Image URL</label>
            <input type="url" value={form.cover_image_url} onChange={e => setForm({...form,cover_image_url:e.target.value})}
              placeholder="https://..." style={inputStyle} />
            {form.cover_image_url && (
              <img src={form.cover_image_url} alt="preview"
                style={{width:"100%",height:160,objectFit:"cover",borderRadius:8,marginTop:"0.5rem"}} />
            )}
          </div>`,
  `<div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Cover Image</label>
            <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#f9fafb",position:"relative"}}
              onClick={() => document.getElementById("cover-upload")?.click()}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) await uploadImage(file);
              }}>
              <input id="cover-upload" type="file" accept="image/*" style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file); }} />
              {form.cover_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.cover_image_url} alt="preview" style={{width:"100%",height:180,objectFit:"cover",borderRadius:8}} />
                  <button onClick={(e) => { e.stopPropagation(); setForm({...form,cover_image_url:""}) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    x
                  </button>
                </div>
              ) : (
                <div>
                  {uploading ? (
                    <div style={{color:"#6b7280",fontWeight:600}}>Uploading...</div>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.5rem",display:"block"}}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <div style={{color:"#6b7280",fontWeight:600,fontSize:"0.9rem"}}>Click or drag to upload image</div>
                      <div style={{color:"#9ca3af",fontSize:"0.78rem",marginTop:"0.25rem"}}>PNG, JPG, WebP up to 10MB</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>`
);

// Add uploading state and uploadImage function after useState declarations
c = c.replace(
  `  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")
  const [editId, setEditId] = useState<string | null>(null)`,
  `  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState("")
  const [editId, setEditId] = useState<string | null>(null)`
);

// Add uploadImage function after loadPost function
c = c.replace(
  `  function showToast(msg: string) {`,
  `  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = "post-" + Date.now() + "." + ext
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) {
      showToast("Upload failed: " + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName)
    setForm(prev => ({...prev, cover_image_url: urlData.publicUrl}))
    setUploading(false)
    showToast("Image uploaded!")
  }

  function showToast(msg: string) {`
);

fs.writeFileSync("src/app/admin/posts/new/page.tsx", c, "utf8");
console.log("done - post image upload fixed");
