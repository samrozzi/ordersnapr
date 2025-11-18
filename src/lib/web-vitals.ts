/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals metrics for performance monitoring
 *
 * Metrics tracked:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { logger } from './logger';

interface VitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

/**
 * Send vitals to analytics endpoint
 * In production, this would send to your analytics service
 */
function sendToAnalytics(metric: Metric) {
  const report: VitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
  };

  // Log in development
  if (import.meta.env.DEV) {
    logger.info('Web Vital:', report);
  }

  // In production, send to analytics service
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics/vitals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(report),
    //   keepalive: true,
    // });
  }
}

/**
 * Initialize Web Vitals monitoring
 * Call this once in your app entry point
 */
export function initWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);

    logger.debug('Web Vitals monitoring initialized');
  } catch (error) {
    logger.error('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Get thresholds for each metric
 */
export const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
