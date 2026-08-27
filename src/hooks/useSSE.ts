import { useEffect, useRef } from 'react';
import { useStore, SchoolNotice } from '../context/useStore';
import { API_HOST_URL } from '../config/api';

/**
 * Custom hook to connect to SSE stream and listen for real-time updates
 * - LOGISTICS_NOTICE:  New notice posted by driver → add to store
 * - NOTICE_DELETED:    Notice deleted by driver   → remove from store
 * - DRIVER_ALERT:      Live alert posted          → add as notice to store
 */
export const useSSE = () => {
  const { addNoticeRaw, deleteNotice } = useStore();
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ziquala_token');
    if (!token) {
      console.warn('No auth token found; SSE not connected');
      return;
    }

    const API_URL = API_HOST_URL || '';

    try {
      // Connect to SSE stream (pass token via query parameter since EventSource doesn't support headers)
      const sseUrl = `${API_URL}/api/driver/stream?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(sseUrl);

      // ── New logistics notice posted by driver ──────────────────────────
      eventSource.addEventListener('LOGISTICS_NOTICE', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('🚌 [SSE] New logistics notice received:', payload.id);
          // Normalize into SchoolNotice shape and add to store
          const notice: SchoolNotice = {
            id: payload.id,
            title: payload.title || 'Logistics Update',
            content: payload.content || payload.message || '',
            priority: 'Normal',
            time: payload.time || payload.published_at || new Date().toISOString(),
            category: 'Logistics',
            audience: ['student', 'parent', 'school-admin', 'vice-principal'],
            driverName: payload.driverName,
            stations: payload.stations,
          };
          // Use addNoticeRaw to preserve real database ID
          addNoticeRaw(notice);
        } catch (err) {
          console.error('Failed to parse SSE logistics notice event:', err);
        }
      });

      // ── Notice deleted by driver or admin ──────────────────────────────
      eventSource.addEventListener('NOTICE_DELETED', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('🗑️ [SSE] Notice deleted:', payload.id);
          deleteNotice(payload.id);
        } catch (err) {
          console.error('Failed to parse SSE deletion event:', err);
        }
      });

      // ── Live driver alert (driver_notifications table) ─────────────────
      eventSource.addEventListener('DRIVER_ALERT', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('🔔 [SSE] Driver alert received:', payload.id);
          const notice: SchoolNotice = {
            id: payload.id,
            title: `Alert from ${payload.driver_name || 'Driver'}`,
            content: payload.message || '',
            priority: 'High',
            time: payload.created_at || new Date().toISOString(),
            category: 'Logistics',
            audience: ['student', 'parent', 'school-admin'],
            driverName: payload.driver_name,
          };
          addNoticeRaw(notice);
        } catch (err) {
          console.error('Failed to parse SSE driver alert event:', err);
        }
      });

      // ── New school notice posted by admin ──────────────────────────────
      eventSource.addEventListener('SCHOOL_NOTICE', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('📢 [SSE] New school notice received:', payload.id);
          // Convert comma-separated audience string back to array
          const audienceArr = payload.audience === 'all'
            ? ['super-admin', 'school-admin', 'vice-principal', 'teacher', 'student', 'parent', 'librarian', 'storekeeper']
            : String(payload.audience || 'all').split(',').map((r: string) => r.trim());
          const notice: SchoolNotice = {
            id: payload.id,
            title: payload.title,
            content: payload.content,
            priority: payload.priority || 'Normal',
            time: payload.createdAt || new Date().toISOString(),
            category: (payload.category as any) || 'Academic',
            audience: audienceArr,
          };
          addNoticeRaw(notice);
        } catch (err) {
          console.error('Failed to parse SSE school notice event:', err);
        }
      });

      // ── School notice deleted by admin ─────────────────────────────────
      eventSource.addEventListener('SCHOOL_NOTICE_DELETED', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('🗑️ [SSE] School notice deleted:', payload.id);
          deleteNotice(payload.id);
        } catch (err) {
          console.error('Failed to parse SSE school notice deletion event:', err);
        }
      });

      // ── Connection heartbeat ───────────────────────────────────────────
      eventSource.addEventListener('connected', (event: Event) => {
        const customEvent = event as MessageEvent;
        try {
          const payload = JSON.parse(customEvent.data);
          console.log('✅ [SSE] Connected to stream:', payload);
        } catch (err) {
          console.error('Failed to parse SSE connected event:', err);
        }
      });

      eventSource.onerror = () => {
        console.warn('⚠️ [SSE] Connection error or closed');
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          sseRef.current = null;
        }
      };

      sseRef.current = eventSource;
    } catch (err) {
      console.error('Failed to connect to SSE stream:', err);
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [addNoticeRaw, deleteNotice]);

  return { sseConnected: !!sseRef.current };
};
