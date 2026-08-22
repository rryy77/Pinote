import { supabase } from '@/lib/supabase';
import type { Group, GroupMember } from '@/types/group';

/**
 * Cloud data layer for group maps (Supabase). This is the single entry point for
 * reading/writing groups, members and invites — stores call these, never Supabase
 * directly. Row Level Security enforces that you only ever see groups you belong
 * to; joining is done through the SECURITY DEFINER RPCs so members can't be
 * inserted directly.
 */

type GroupRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  owner_id: string;
  created_at: string;
};

const toGroup = (r: GroupRow): Group => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  ownerId: r.owner_id,
  createdAt: Date.parse(r.created_at),
});

/** The signed-in user id, or throw a friendly error if there's no session. */
async function requireUid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('サインインが必要です');
  return id;
}

/** Groups the current user belongs to (RLS filters to their memberships). */
export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, icon, color, owner_id, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as GroupRow[]).map(toGroup);
}

/** Create a group (creator becomes owner-member) and return its id. */
export async function createGroup(name: string, icon: string, color: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_icon: icon,
    p_color: color,
  });
  if (error) throw error;
  return data as string;
}

/** Owner-only: delete a group and everything under it (cascades). */
export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

/** Leave a group (removes just your membership row). */
export async function leaveGroup(groupId: string): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', uid);
  if (error) throw error;
}

type MemberRow = {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles: { display_name: string } | null;
};

/** The roster of a group, with member display names resolved. */
export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(display_name)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as MemberRow[]).map((r) => ({
    userId: r.user_id,
    role: r.role,
    displayName: r.profiles?.display_name || 'メンバー',
    joinedAt: Date.parse(r.joined_at),
  }));
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
function randomCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Create a fresh invite code for a group and return it. */
export async function createInvite(groupId: string): Promise<string> {
  const uid = await requireUid();
  // Retry on the (very unlikely) chance of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from('group_invites')
      .insert({ group_id: groupId, code, invited_by: uid });
    if (!error) return code;
    if (error.code !== '23505') throw error; // 23505 = unique_violation → retry
  }
  throw new Error('招待コードの発行に失敗しました');
}

/** Join a group from an invite code; returns the joined group's id. */
export async function joinByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    invite_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}
