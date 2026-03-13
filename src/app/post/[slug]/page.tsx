'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PostPage() {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, categories(name, icon, color)')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single()

      if (!data) { router.push('/') }
      else { setPost(data) }
      setLoading(false)

      if (data) {
        await supabase
          .from('posts')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id)
      }
    }
    fetchPost()
  }, [params.slug])

  const typeColors: Record<string, string> = {
    daily: '#F59E0B',
    weekly: '#3B82F6',
    announcement: '#10B981',
    event: '#8B5CF6',
    giveaway: '#EF4444'
  }

  const typeLabels: Record<string, string> = {
    daily: 'DAILY UPDATE',
    weekly: 'WEEKLY RECAP',
    announcement: 'ANNOUNCEMENT',
    event: 'EVENT',
    giveaway: 'GIVEAWAY'
  }

  if (loading) {
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Loading...</div>)
  }

  if (!post) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Back</Link>
          <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>Windmar Solar</div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
        {post.cover_image_url && (
          <div style={{ height: '250px', margin: '20px 0', borderRadius: '16px', overflow: 'hidden', backgroundImage: 'url(' + post.cover_image_url + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}

        <div style={{ padding: '20px 0 60px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', background: (typeColors[post.post_type] || '#666') + '30', color: typeColors[post.post_type] || '#666' }}>{typeLabels[post.post_type] || 'POST'}</span>
            {post.categories && (<span style={{ color: '#555', fontSize: '12px' }}>{post.categories.name}</span>)}
            <span style={{ color: '#444', fontSize: '12px' }}>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 16px 0', lineHeight: '1.3' }}>{post.title}</h1>

          {post.excerpt && (<p style={{ color: '#999', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px 0', fontStyle: 'italic' }}>{post.excerpt}</p>)}

          <div style={{ color: '#cccccc', fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{post.body}</div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #1a1a1a', color: '#444', fontSize: '12px' }}>{post.view_count || 0} views</div>
        </div>
      </div>
    </div>
  )
}
