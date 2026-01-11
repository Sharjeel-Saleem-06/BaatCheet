/**
 * Authentication Utilities
 * Helper functions for Clerk authentication
 */

// Type for Clerk on window
interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
    user?: {
      id: string;
      primaryEmailAddress?: {
        emailAddress: string;
      };
      firstName?: string;
      lastName?: string;
      imageUrl?: string;
    };
  };
}

/**
 * Get Clerk authentication token
 * @returns Promise<string> - JWT token or empty string
 */
export async function getClerkToken(): Promise<string> {
  try {
    const clerkWindow = window as unknown as ClerkWindow;
    if (clerkWindow.Clerk?.session) {
      const token = await clerkWindow.Clerk.session.getToken();
      return token || '';
    }
  } catch (error) {
    console.error('Failed to get Clerk token:', error);
  }
  return '';
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getClerkToken();
  return !!token;
}

/**
 * Get current user info from Clerk
 * @returns User info or null
 */
export function getCurrentUser(): { id: string; email: string; name: string; avatar: string } | null {
  try {
    const clerkWindow = window as unknown as ClerkWindow;
    const user = clerkWindow.Clerk?.user;
    if (user) {
      return {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        avatar: user.imageUrl || '',
      };
    }
  } catch (error) {
    console.error('Failed to get user:', error);
  }
  return null;
}

/**
 * Create authenticated fetch request
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getClerkToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
