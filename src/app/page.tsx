'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [featured, setFeatured] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setCategories(cats || [])

      const { data: featuredPost } = await supabase
        .from('posts')
        .select('*, categories(name, icon, color)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()
      setFeatured(featuredPost)

      const { data: allPosts } = await supabase
        .from('posts')
        .select('*, categories(name, icon, color)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20)
      setPosts(allPosts || [])
      setLoading(false)
    }
    fetchData()

    const channel = supabase
      .channel('public-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filteredPosts = activeFilter === 'all'
    ? posts
    : posts.filter(p => p.post_type === activeFilter)

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return hours + 'h ago'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + 'd ago'
    return d.toLocaleDateString()
  }

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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>Windmar Solar Academy</div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Windmar Solar</div>
            <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Academy</div>
          </div>
          <Link href="/login" style={{ color: '#444', fontSize: '12px', textDecoration: 'none' }}>Admin</Link>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>

        {/* Featured Post */}
        {featured && (
          <Link href={'/post/' + featured.slug} style={{ textDecoration: 'none', display: 'block', margin: '20px 0' }}>
            <div style={{
              borderRadius: '16px', overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              border: '1px solid #222'
            }}>
              {featured.cover_image_url && (
                <div style={{ height: '200px', backgroundImage: 'url(' + featured.cover_image_url + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }} />
              )}
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '10px',
                  fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                  background: (typeColors[featured.post_type] || '#666') + '30',
                  color: typeColors[featured.post_type] || '#666', marginBottom: '12px'
                }}>FEATURED - {typeLabels[featured.post_type] || 'POST'}</div>
                <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: '0 0 8px 0', lineHeight: '1.3' }}>{featured.title}</h2>
                {featured.excerpt && <p style={{ color: '#999', fontSize: '14px', margin: '0 0 12px 0', lineHeight: '1.5' }}>{featured.excerpt}</p>}
                <div style={{ color: '#555', fontSize: '12px' }}>{formatDate(featured.published_at)}</div>
              </div>
            </div>
          </Link>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 0', overflowX: 'auto' }}>
          <button onClick={() => setActiveFilter('all')} style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            background: activeFilter === 'all' ? '#ffffff' : '#1a1a1a',
            color: activeFilter === 'all' ? '#000000' : '#888'
          }}>All</button>
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'announcement', label: 'News' },
            { key: 'event', label: 'Events' },
            { key: 'giveaway', label: 'Giveaways' }
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)} style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeFilter === tab.key ? '#ffffff' : '#1a1a1a',
              color: activeFilter === tab.key ? '#000000' : '#888'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Posts Feed */}
        <div style={{ paddingBottom: '40px' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No posts yet</div>
              <div style={{ fontSize: '14px' }}>Check back soon for updates!</div>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Link key={post.id} href={'/post/' + post.slug} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  padding: '20px 0', borderBottom: '1px solid #1a1a1a',
                  display: 'flex', gap: '16px', alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                        letterSpacing: '0.5px', textTransform: 'uppercase',
                        background: (typeColors[post.post_type] || '#666') + '20',
                        color: typeColors[post.post_type] || '#666'
                      }}>{typeLabels[post.post_type] || 'POST'}</span>
                      <span style={{ color: '#444', fontSize: '12px' }}>{formatDate(post.published_at)}</span>
                    </div>
                    <h3 style={{ color: '#f0f0f0', fontSize: '16px', fontWeight: '600', margin: '0 0 6px 0', lineHeight: '1.4' }}>{post.title}</h3>
                    {post.excerpt && <p style={{ color: '#777', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{post.excerpt}</p>}
                  </div>
                  {post.cover_image_url && (
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                      backgroundImage: 'url(' + post.cover_image_url + ')',
                      backgroundSize: 'cover', backgroundPosition: 'center'
                    }} />
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
