import { supabase } from '@/lib/supabase';
import type { CategoryId } from '@/types/memo';
import type { NewSharedMemo, SharedMemo } from '@/types/group';

/**
 * Cloud data layer for memos on group maps. RLS ensures only group members can
 * read, only members can add (as author), and only the author or the group owner
 * can edit/delete.
 */

type SharedMemoRow = {
  id: string;
  group_id: string;
  author_id: string;
  title: string;
  body: string;
  category: string;
  lat: number;
  lng: number;
  rating: number;
  want_to_go: boolean;
  tags: unknown;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  author: { display_name: string } | null;
};

const SELECT =
  'id, group_id, author_id, title, body, category, lat, lng, rating, want_to_go, tags, photo_url, created_at, updated_at, author:profiles!shared_memos_author_id_fkey(display_name)';

function toSharedMemo(r: SharedMemoRow): SharedMemo {
  return {
    id: r.id,
    groupId: r.group_id,
    authorId: r.author_id,
    authorName: r.author?.display_name || 'メンバー',
    title: r.title,
    body: r.body,
    category: (r.category as CategoryId) ?? 'other',
    lat: r.lat,
    lng: r.lng,
    rating: r.rating ?? 0,
    wantToGo: r.want_to_go ?? false,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    photoUrl: r.photo_url,
    createdAt: Date.parse(r.created_at),
    updatedAt: Date.parse(r.updated_at),
  };
}

/** All memos on a group's map, newest first. */
export async function listByGroup(groupId: string): Promise<SharedMemo[]> {
  const { data, error } = await supabase
    .from('shared_memos')
    .select(SELECT)
    .eq('group_id', groupId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as SharedMemoRow[]).map(toSharedMemo);
}

/** Add a memo to a group's map (author = current user). */
export async function createSharedMemo(input: NewSharedMemo): Promise<SharedMemo> {
  const { data: sess } = await supabase.auth.getSession();
  const authorId = sess.session?.user?.id;
  if (!authorId) throw new Error('サインインが必要です');
  const { data, error } = await supabase
    .from('shared_memos')
    .insert({
      group_id: input.groupId,
      author_id: authorId,
      title: input.title,
      body: input.body ?? '',
      category: input.category,
      lat: input.lat,
      lng: input.lng,
      rating: input.rating ?? 0,
      want_to_go: input.wantToGo ?? false,
      tags: input.tags ?? [],
      photo_url: input.photoUrl ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return toSharedMemo(data as unknown as SharedMemoRow);
}

/** Remove a shared memo (author or group owner only, enforced by RLS). */
export async function removeSharedMemo(id: string): Promise<void> {
  const { error } = await supabase.from('shared_memos').delete().eq('id', id);
  if (error) throw error;
}
