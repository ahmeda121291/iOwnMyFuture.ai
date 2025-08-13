import { supabase } from './supabase';

export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    // Get the current session to get the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return false;
    }

    // Call the edge function to check admin status
    const { data, error } = await supabase.functions.invoke('get-admin-status', {
      body: userId ? { userId } : {},
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error || !data) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data.isAdmin === true;
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

    const currentUserIsAdmin = await checkIsAdmin();
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