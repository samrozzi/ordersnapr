import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './use-online-status';

describe('useOnlineStatus', () => {
  let onlineCallback: () => void;
  let offlineCallback: () => void;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Store event listeners
    const addEventListener = window.addEventListener;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'online') onlineCallback = callback as () => void;
      if (event === 'offline') offlineCallback = callback as () => void;
      return addEventListener.call(window, event, callback);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with online status', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnline).toBeNull();
  });

  it('should initialize with offline status when navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);

    act(() => {
      offlineCallback();
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastOnline).toBeInstanceOf(Date);
  });

  it('should update status when going online', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);

    act(() => {
      onlineCallback();
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnline).toBeNull();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
