import { supabase } from './supabase';

export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    // If checking for a specific user (not the current user), 
    // we need to query the database directly
    if (userId) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Only allow checking other users if current user is admin
      if (currentUser?.user_metadata?.is_admin !== true) {
        return false;
      }
      
      // Query the user_profiles table for the specific user
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        console.error('Error checking admin status for user:', error);
        return false;
      }
      
      return data.is_admin === true;
    }
    
    // For current user, use the user metadata from auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // Check the user_metadata for admin status
    // This is set by the database trigger when user_profiles.is_admin changes
    return user.user_metadata?.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    // Only allow this if the current user is already an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Check if current user is admin using metadata
    if (user.user_metadata?.is_admin !== true) {
      return false;
    }

    // Update the user_profiles table
    // The database trigger will automatically sync this to user_metadata
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting admin status:', error);
    return false;
  }
}