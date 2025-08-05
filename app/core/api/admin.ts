import { supabase } from './supabase';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    // Only allow this if the current user is already an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return false;}

    const currentUserIsAdmin = await checkIsAdmin(user.id);
    if (!currentUserIsAdmin) {return false;}

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error setting admin status:', error);
    return false;
  }
}