'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [postType, setPostType] = useState('announcement')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [isFeatured, setIsFeatured] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setCategories(data || [])
    }
    fetchCategories()
  }, [])

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    let coverImageUrl = null

    if (coverImage) {
      const fileExt = coverImage.name.split('.').pop()
      const fileName = generateSlug(title) + '-' + Date.now() + '.' + fileExt
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, coverImage)
      if (uploadError) { setError('Failed to upload image: ' + uploadError.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName)
      coverImageUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('posts').insert({
      title: title.trim(),
      slug: generateSlug(title) + '-' + Date.now(),
      body, excerpt: excerpt || null, post_type: postType,
      category_id: categoryId || null, is_featured: isFeatured,
      cover_image_url: coverImageUrl, status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })

    if (insertError) { setError('Failed to save: ' + insertError.message); setSaving(false) }
    else { router.push('/admin/posts') }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const
  }

  const labelStyle = { display: 'block', color: '#cbd5e1', fontSize: '14px', marginBottom: '6px', fontWeight: '500' as const }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#f8fafc', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>Create New Post</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Write a new update for the newsletter</p>
      </div>

      {error && (<div style={{ padding: '12px 16px', background: '#991b1b', borderRadius: '8px', color: '#fecaca', fontSize: '14px', marginBottom: '20px' }}>{error}</div>)}

      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter post title..." style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Post Type</label>
            <select value={postType} onChange={(e) => setPostType(e.target.value)} style={inputStyle}>
              <option value="daily">Daily Update</option>
              <option value="weekly">Weekly Recap</option>
              <option value="announcement">Announcement</option>
              <option value="event">Event</option>
              <option value="giveaway">Giveaway</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              <option value="">Select a category...</option>
              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Excerpt</label>
          <input type="text" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief summary..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Content</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post content here..." rows={12} style={{...inputStyle, resize: 'vertical' as const, lineHeight: '1.6'}} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Cover Image</label>
          <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} style={{...inputStyle, padding: '10px 16px'}} />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#cbd5e1', fontSize: '14px' }}>
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Feature this post (shows in hero banner)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleSubmit('published')} disabled={saving} style={{
            padding: '12px 32px', background: '#22c55e', color: '#ffffff', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer'
          }}>{saving ? 'Saving...' : 'Publish Now'}</button>
          <button onClick={() => handleSubmit('draft')} disabled={saving} style={{
            padding: '12px 32px', background: '#334155', color: '#f8fafc', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer'
          }}>Save as Draft</button>
          <button onClick={() => router.push('/admin/posts')} style={{
            padding: '12px 32px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155',
            borderRadius: '8px', fontSize: '14px', cursor: 'pointer'
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
