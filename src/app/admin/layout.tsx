'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login') } else { setUser(user) }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8' }}>Loading...</div>)
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: '[D]' },
    { label: 'Posts', href: '/admin/posts', icon: '[P]' },
    { label: 'Create Post', href: '/admin/posts/new', icon: '[+]' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '250px', background: '#1e293b', borderRight: '1px solid #334155', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px', marginBottom: '32px' }}>
          <h2 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '700', margin: 0 }}>Windmar Solar</h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>Admin Portal</p>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
              color: pathname === item.href ? '#f8fafc' : '#94a3b8',
              background: pathname === item.href ? '#334155' : 'transparent',
              textDecoration: 'none', fontSize: '14px',
              borderLeft: pathname === item.href ? '3px solid #2563eb' : '3px solid transparent'
            }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div style={{ padding: '0 20px' }}>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>{user?.email}</div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px', background: '#334155', color: '#94a3b8',
            border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer'
          }}>Sign Out</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>{children}</div>
    </div>
  )
}
