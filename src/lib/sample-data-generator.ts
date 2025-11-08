import { supabase } from "@/integrations/supabase/client";

const SAMPLE_WORK_ORDERS = [
  {
    title: "Fix Leaking Faucet - Kitchen",
    description: "Customer reports kitchen faucet dripping constantly",
    status: "open",
    priority: "medium",
  },
  {
    title: "HVAC Maintenance - Annual Service",
    description: "Scheduled annual HVAC system inspection and filter replacement",
    status: "in_progress",
    priority: "low",
  },
  {
    title: "Electrical Panel Upgrade",
    description: "Upgrade main electrical panel to 200amp service",
    status: "completed",
    priority: "high",
  },
  {
    title: "Roof Inspection After Storm",
    description: "Inspect roof for damage after recent storm",
    status: "scheduled",
    priority: "high",
  },
  {
    title: "Install New Water Heater",
    description: "Replace 15-year-old water heater with tankless unit",
    status: "quoted",
    priority: "medium",
  },
];

const SAMPLE_PROPERTIES = [
  {
    name: "123 Main Street",
    address: "123 Main Street, Springfield",
    property_type: "residential",
    notes: "Single family home, built 2005",
  },
  {
    name: "456 Oak Avenue - Building A",
    address: "456 Oak Avenue, Unit A, Springfield",
    property_type: "commercial",
    notes: "Office building, 3 stories",
  },
  {
    name: "789 Elm Drive",
    address: "789 Elm Drive, Springfield",
    property_type: "residential",
    notes: "Townhouse, part of HOA",
  },
];

const SAMPLE_CUSTOMERS = [
  {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
    company: null,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(555) 234-5678",
    company: null,
  },
  {
    name: "Mike Anderson",
    email: "mike@example.com",
    phone: "(555) 345-6789",
    company: "Anderson Corp",
  },
  {
    name: "Emily Davis",
    email: "emily.davis@example.com",
    phone: "(555) 456-7890",
    company: null,
  },
];

const SAMPLE_FORMS = [
  {
    name: "Service Inspection Checklist",
    description: "Standard inspection form for service calls",
    fields: [
      { type: "text", label: "Technician Name", required: true },
      { type: "date", label: "Inspection Date", required: true },
      { type: "checkbox", label: "Equipment Operational", required: true },
      { type: "textarea", label: "Findings and Notes", required: false },
      { type: "rating", label: "Condition Rating (1-5)", required: true },
    ],
  },
  {
    name: "Customer Satisfaction Survey",
    description: "Post-service customer feedback form",
    fields: [
      { type: "rating", label: "Overall Satisfaction", required: true },
      { type: "rating", label: "Technician Professionalism", required: true },
      { type: "rating", label: "Timeliness", required: true },
      { type: "textarea", label: "Additional Comments", required: false },
      { type: "checkbox", label: "Would Recommend", required: false },
    ],
  },
];

export async function generateSampleData(types: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");

  // Get user's organization
  const { data: membership } = await supabase
    .from("org_memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new Error("User not in an organization");

  const orgId = membership.org_id;

  // Generate customers first (needed for properties and work orders)
  let customerIds: string[] = [];
  if (types.includes("customers")) {
    const { data: customers, error } = await supabase
      .from("customers")
      .insert(
        SAMPLE_CUSTOMERS.map(customer => ({
          ...customer,
          org_id: orgId,
          created_by: user.id,
        }))
      )
      .select("id");

    if (error) throw error;
    customerIds = customers?.map(c => c.id) || [];
  }

  // Generate properties
  let propertyIds: string[] = [];
  if (types.includes("properties")) {
    const { data: properties, error } = await supabase
      .from("properties")
      .insert(
        SAMPLE_PROPERTIES.map((property, index) => ({
          ...property,
          org_id: orgId,
          created_by: user.id,
          customer_id: customerIds[index] || null,
        }))
      )
      .select("id");

    if (error) throw error;
    propertyIds = properties?.map(p => p.id) || [];
  }

  // Generate work orders
  if (types.includes("work_orders")) {
    const { error } = await supabase
      .from("work_orders")
      .insert(
        SAMPLE_WORK_ORDERS.map((order, index) => ({
          ...order,
          org_id: orgId,
          created_by: user.id,
          customer_id: customerIds[index % customerIds.length] || null,
          property_id: propertyIds[index % propertyIds.length] || null,
        }))
      );

    if (error) throw error;
  }

  // Generate forms
  if (types.includes("forms")) {
    const { error } = await supabase
      .from("form_templates")
      .insert(
        SAMPLE_FORMS.map(form => ({
          ...form,
          org_id: orgId,
          created_by: user.id,
        }))
      );

    if (error) throw error;
  }
}
