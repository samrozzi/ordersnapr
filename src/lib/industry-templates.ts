export interface IndustryTemplate {
  industry: string;
  name: string;
  description: string;
  features: {
    [module: string]: {
      enabled: boolean;
      config: Record<string, any>;
    };
  };
  pages: Array<{
    title: string;
    path: string;
    widgets: Array<{
      widget_type: string;
      position: { col: number; row: number; w: number; h: number };
      config: Record<string, any>;
    }>;
  }>;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    industry: "trades",
    name: "Trades & Services",
    description: "Perfect for plumbing, electrical, HVAC, blinds installation, and other field service businesses",
    features: {
      work_orders: {
        enabled: true,
        config: {
          statuses: ["new", "scheduled", "in_progress", "complete", "cancelled"],
          require_photos: true,
        },
      },
      calendar: { enabled: true, config: {} },
      appointments: { enabled: true, config: {} },
      invoicing: {
        enabled: true,
        config: { invoice_prefix: "INV", tax_percent: 7.5 },
      },
      inventory: { enabled: true, config: {} },
      customer_portal: { enabled: true, config: {} },
      reports: { enabled: true, config: {} },
      properties: { enabled: true, config: {} },
      forms: { enabled: true, config: {} },
    },
    pages: [
      {
        title: "Dashboard",
        path: "/dashboard",
        widgets: [
          {
            widget_type: "upcoming_work_orders",
            position: { col: 0, row: 0, w: 3, h: 2 },
            config: {},
          },
          {
            widget_type: "calendar_large",
            position: { col: 3, row: 0, w: 3, h: 2 },
            config: { source: "appointments" },
          },
          {
            widget_type: "weather",
            position: { col: 0, row: 2, w: 2, h: 1 },
            config: {},
          },
          {
            widget_type: "favorites",
            position: { col: 2, row: 2, w: 4, h: 1 },
            config: {},
          },
        ],
      },
    ],
  },
  {
    industry: "restaurant",
    name: "Restaurant & Food Service",
    description: "Designed for restaurants, cafes, food trucks, and catering businesses",
    features: {
      pos: {
        enabled: true,
        config: { menu_modes: ["dine_in", "takeout", "delivery"] },
      },
      inventory: {
        enabled: true,
        config: { units: ["lb", "oz", "each", "kg"] },
      },
      calendar: { enabled: true, config: { use_shifts: true } },
      appointments: { enabled: true, config: { booking_type: "reservations" } },
      reports: { enabled: true, config: {} },
      invoicing: { enabled: false, config: {} },
    },
    pages: [
      {
        title: "Dashboard",
        path: "/dashboard",
        widgets: [
          {
            widget_type: "calendar_large",
            position: { col: 0, row: 0, w: 4, h: 2 },
            config: {},
          },
          {
            widget_type: "weather",
            position: { col: 4, row: 0, w: 2, h: 1 },
            config: {},
          },
        ],
      },
    ],
  },
  {
    industry: "retail",
    name: "Retail & E-commerce",
    description: "For retail stores, online shops, and boutiques",
    features: {
      pos: { enabled: true, config: {} },
      inventory: { enabled: true, config: {} },
      customer_portal: { enabled: true, config: {} },
      reports: { enabled: true, config: {} },
      invoicing: { enabled: true, config: {} },
    },
    pages: [
      {
        title: "Dashboard",
        path: "/dashboard",
        widgets: [
          {
            widget_type: "calendar_medium",
            position: { col: 0, row: 0, w: 3, h: 2 },
            config: {},
          },
        ],
      },
    ],
  },
  {
    industry: "services",
    name: "Professional Services",
    description: "Consulting, legal, accounting, and other professional service providers",
    features: {
      appointments: { enabled: true, config: {} },
      calendar: { enabled: true, config: {} },
      invoicing: { enabled: true, config: {} },
      customer_portal: { enabled: true, config: {} },
      reports: { enabled: true, config: {} },
      files: { enabled: true, config: {} },
    },
    pages: [
      {
        title: "Dashboard",
        path: "/dashboard",
        widgets: [
          {
            widget_type: "calendar_large",
            position: { col: 0, row: 0, w: 4, h: 2 },
            config: {},
          },
          {
            widget_type: "upcoming_appointments",
            position: { col: 4, row: 0, w: 2, h: 2 },
            config: {},
          },
        ],
      },
    ],
  },
];

export const getTemplateByIndustry = (industry: string): IndustryTemplate | undefined => {
  return INDUSTRY_TEMPLATES.find((t) => t.industry === industry);
};
