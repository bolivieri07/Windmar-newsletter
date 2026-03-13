'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ posts: 0, published: 0, drafts: 0, events: 0 })
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })

      const { count: publishedPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')

      const { count: draftPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')

      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      setStats({
        posts: totalPosts || 0,
        published: publishedPosts || 0,
        drafts: draftPosts || 0,
        events: totalEvents || 0
      })

      const { data: recent } = await supabase
        .from('posts')
        .select('id, title, status, post_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentPosts(recent || [])
    }
    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Posts', value: stats.posts, icon: 'P', color: '#3b82f6' },
    { label: 'Published', value: stats.published, icon: 'OK', color: '#22c55e' },
    { label: 'Drafts', value: stats.drafts, icon: 'D', color: '#f59e0b' },
    { label: 'Events', value: stats.events, icon: 'E', color: '#8b5cf6' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#f8fafc', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Dashboard
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Welcome to the Windmar Solar Academy admin portal
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {statCards.map((card) => (
          <div key={card.label} style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', color: card.color }}>{card.icon}</div>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>{card.label}</div>
            <div style={{ color: '#f8fafc', fontSize: '32px', fontWeight: '700' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/posts/new" style={{
            padding: '12px 24px',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            + New Post
          </Link>
          <Link href="/admin/posts" style={{
            padding: '12px 24px',
            background: '#334155',
            color: '#f8fafc',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Manage Posts
          </Link>
        </div>
      </div>

      <div>
        <h2 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Recent Posts
        </h2>
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          {recentPosts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No posts yet. Create your first post!
            </div>
          ) : (
            recentPosts.map((post, i) => (
              <div key={post.id} style={{
                padding: '16px 20px',
                borderBottom: i < recentPosts.length - 1 ? '1px solid #334155' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500' }}>
                    {post.title}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                    {post.post_type} - {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: post.status === 'published' ? '#22c55e' : '#f59e0b'
                }}>
                  {post.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
