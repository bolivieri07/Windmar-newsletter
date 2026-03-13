'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, categories(name, icon, color)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    fetchPosts()
  }

  const togglePublish = async (post: any) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    await supabase
      .from('posts')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null
      })
      .eq('id', post.id)
    fetchPosts()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: '#f8fafc', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>Posts</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Manage all your newsletter content</p>
        </div>
        <Link href="/admin/posts/new" style={{
          padding: '12px 24px', background: '#2563eb', color: '#ffffff',
          borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600'
        }}>+ New Post</Link>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No posts yet. Create your first post!</div>
        ) : (
          posts.map((post, i) => (
            <div key={post.id} style={{
              padding: '20px', borderBottom: i < posts.length - 1 ? '1px solid #334155' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '500' }}>{post.title}</div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  {post.post_type} - {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                  color: post.status === 'published' ? '#22c55e' : '#f59e0b'
                }}>{post.status}</span>
                <button onClick={() => togglePublish(post)} style={{
                  padding: '6px 14px', background: post.status === 'published' ? '#334155' : '#22c55e',
                  color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                }}>{post.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => deletePost(post.id)} style={{
                  padding: '6px 14px', background: '#991b1b', color: '#fecaca',
                  border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
