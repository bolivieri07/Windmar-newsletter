export type PostType = 'daily' | 'weekly' | 'announcement' | 'event' | 'giveaway'
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type AdminRole = 'super_admin' | 'editor' | 'viewer'
export type GiveawayStatus = 'upcoming' | 'active' | 'closed' | 'awarded'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  title: string
  slug: string
  body: string | null
  excerpt: string | null
  cover_image_url: string | null
  post_type: PostType
  status: PostStatus
  category_id: string | null
  is_featured: boolean
  is_pinned: boolean
  priority: number
  published_at: string | null
  scheduled_for: string | null
  author_id: string | null
  meta: Record<string, any>
  view_count: number
  created_at: string
  updated_at: string
  category?: Category
  event?: Event
  giveaway?: Giveaway
}

export interface Event {
  id: string
  post_id: string
  event_date: string
  event_end_date: string | null
  location: string | null
  address: string | null
  map_url: string | null
  is_virtual: boolean
  virtual_link: string | null
  max_attendees: number | null
  rsvp_count: number
  is_rsvp_open: boolean
}

export interface Giveaway {
  id: string
  post_id: string
  prize_name: string
  prize_description: string | null
  prize_image_url: string | null
  rules: string | null
  entry_deadline: string
  start_date: string
  status: GiveawayStatus
  max_entries: number | null
  entry_count: number
  winner_name: string | null
  winner_announced_at: string | null
}

export interface AdminProfile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: AdminRole
  is_active: boolean
  last_login: string | null
}
