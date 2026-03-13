const fs = require("fs");
let c = fs.readFileSync("src/app/admin/spiffs/page.tsx", "utf8");

// Add uploading state
c = c.replace(
  `  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")
  const [showForm, setShowForm] = useState(false)`,
  `  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState("")
  const [showForm, setShowForm] = useState(false)`
);

// Add prize_image_url to form state
c = c.replace(
  `    prize_name: "",
    prize_description: "",
    entry_deadline: "",
    start_date: "",
    status: "active",
    max_entries: "",
    post_title: "",
    post_excerpt: "",`,
  `    prize_name: "",
    prize_description: "",
    prize_image_url: "",
    entry_deadline: "",
    start_date: "",
    status: "active",
    max_entries: "",
    post_title: "",
    post_excerpt: "",`
);

// Add prize_image_url to reset
c = c.replace(
  `setForm({ prize_name:"",prize_description:"",entry_deadline:"",start_date:"",status:"active",max_entries:"",post_title:"",post_excerpt:"" })`,
  `setForm({ prize_name:"",prize_description:"",prize_image_url:"",entry_deadline:"",start_date:"",status:"active",max_entries:"",post_title:"",post_excerpt:"" })`
);

// Add prize_image_url to giveaway insert
c = c.replace(
  `        prize_name: form.prize_name,
        prize_description: form.prize_description,
        entry_deadline: form.entry_deadline,`,
  `        prize_name: form.prize_name,
        prize_description: form.prize_description,
        prize_image_url: form.prize_image_url || null,
        entry_deadline: form.entry_deadline,`
);

// Add uploadImage function before showToast
c = c.replace(
  `  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }`,
  `  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = "spiff-" + Date.now() + "." + ext
    const { data, error } = await supabase.storage
      .from("media-library")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) {
      showToast("Upload failed: " + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from("media-library").getPublicUrl(fileName)
    setForm(prev => ({...prev, prize_image_url: urlData.publicUrl}))
    setUploading(false)
    showToast("Image uploaded!")
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }`
);

// Add image upload field after prize description field
c = c.replace(
  `          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Feed Excerpt</label>`,
  `          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Spiff Image</label>
            <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.25rem",textAlign:"center",cursor:"pointer",background:"#f9fafb"}}
              onClick={() => document.getElementById("spiff-upload")?.click()}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) await uploadImage(file);
              }}>
              <input id="spiff-upload" type="file" accept="image/*" style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file); }} />
              {form.prize_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.prize_image_url} alt="preview" style={{width:"100%",height:140,objectFit:"cover",borderRadius:8}} />
                  <button onClick={(e) => { e.stopPropagation(); setForm({...form,prize_image_url:""}) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:"1rem"}}>
                    x
                  </button>
                </div>
              ) : (
                <div>
                  {uploading ? (
                    <div style={{color:"#6b7280",fontWeight:600}}>Uploading...</div>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.4rem",display:"block"}}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <div style={{color:"#6b7280",fontWeight:600,fontSize:"0.88rem"}}>Click or drag to upload image</div>
                      <div style={{color:"#9ca3af",fontSize:"0.75rem",marginTop:"0.2rem"}}>PNG, JPG, WebP up to 10MB</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Feed Excerpt</label>`
);

fs.writeFileSync("src/app/admin/spiffs/page.tsx", c, "utf8");
console.log("done - spiffs image upload fixed");
