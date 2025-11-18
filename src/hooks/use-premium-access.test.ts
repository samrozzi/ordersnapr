import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePremiumAccess } from './use-premium-access';
import { useAuth } from './use-auth';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('./use-auth');
vi.mock('@/integrations/supabase/client');

describe('usePremiumAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle no user state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    });

    const { result } = renderHook(() => usePremiumAccess());

    // When there's no user, loading completes immediately
    expect(result.current.loading).toBe(false);
    expect(result.current.hasOrg).toBe(false);
    expect(result.current.isApproved).toBe(false);
  });

  it('should allow free tier features for unapproved users', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              approval_status: 'pending',
              organization_id: null,
              is_super_admin: false,
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canAccessFeature('work_orders')).toBe(true);
    expect(result.current.canAccessFeature('properties')).toBe(true);
    expect(result.current.canAccessFeature('forms')).toBe(true);
    expect(result.current.canAccessFeature('calendar')).toBe(true);
  });

  it('should block premium-only features for free tier users', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              approval_status: 'pending',
              organization_id: null,
              is_super_admin: false,
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canAccessFeature('invoicing')).toBe(false);
    expect(result.current.canAccessFeature('inventory')).toBe(false);
    expect(result.current.canAccessFeature('reports')).toBe(false);
    expect(result.current.isPremiumOnly('invoicing')).toBe(true);
  });

  it('should grant all access to org members', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              approval_status: 'approved',
              organization_id: 'org-1',
              is_super_admin: false,
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasOrg).toBe(true);
    expect(result.current.isApproved).toBe(true);
    expect(result.current.hasPremiumAccess()).toBe(true);
    expect(result.current.canAccessFeature('invoicing')).toBe(true);
    expect(result.current.canAccessFeature('work_orders')).toBe(true);
  });

  it('should grant all access to super admins', async () => {
    const mockUser = { id: 'user-1', email: 'admin@example.com' };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              approval_status: 'pending',
              organization_id: null,
              is_super_admin: true,
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePremiumAccess());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.canAccessFeature('invoicing')).toBe(true);
    expect(result.current.canAccessFeature('anything')).toBe(true);
  });
});
