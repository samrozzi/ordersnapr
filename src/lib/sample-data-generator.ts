import { supabase } from "@/integrations/supabase/client";

const SAMPLE_WORK_ORDERS = [
  {
    customer_name: "John Smith",
    address: "123 Main Street, Springfield",
    notes: "Kitchen faucet dripping constantly",
    type: "Plumbing",
    status: "pending",
  },
  {
    customer_name: "Sarah Johnson",
    address: "456 Oak Avenue, Unit A, Springfield",
    notes: "Annual HVAC system inspection and filter replacement",
    type: "HVAC",
    status: "in_progress",
  },
  {
    customer_name: "Mike Anderson",
    address: "789 Elm Drive, Springfield",
    notes: "Upgrade main electrical panel to 200amp service",
    type: "Electrical",
    status: "completed",
  },
];

const SAMPLE_PROPERTIES = [
  {
    property_name: "123 Main Street",
    address: "123 Main Street, Springfield",
    contact: "John Smith - (555) 123-4567",
    access_information: "Single family home, built 2005. Key under mat.",
  },
  {
    property_name: "456 Oak Avenue - Building A",
    address: "456 Oak Avenue, Unit A, Springfield",
    contact: "Sarah Johnson - (555) 234-5678",
    access_information: "Office building, 3 stories. Front desk access.",
  },
];

const SAMPLE_CUSTOMERS = [
  {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
  },
  {
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(555) 234-5678",
  },
  {
    name: "Mike Anderson",
    email: "mike@example.com",
    phone: "(555) 345-6789",
  },
  {
    name: "Emily Davis",
    email: "emily.davis@example.com",
    phone: "(555) 456-7890",
  },
];

const SAMPLE_FORMS = [
  {
    name: "Service Inspection Checklist",
    slug: "service-inspection-checklist",
    schema: {
      fields: [
        { type: "text", label: "Technician Name", required: true },
        { type: "date", label: "Inspection Date", required: true },
        { type: "checkbox", label: "Equipment Operational", required: true },
        { type: "textarea", label: "Findings and Notes", required: false },
      ],
    },
    scope: "organization",
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

  if (!membership) {
    // User not in an organization yet - skip sample data generation
    // This is OK for new users who haven't been assigned to an org yet
    console.log("User not in an organization - skipping sample data generation");
    return;
  }

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
        SAMPLE_PROPERTIES.map((property) => ({
          property_name: property.property_name,
          address: property.address,
          contact: property.contact,
          access_information: property.access_information,
          user_id: user.id,
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
        SAMPLE_WORK_ORDERS.map((order) => ({
          customer_name: order.customer_name,
          address: order.address,
          notes: order.notes,
          type: order.type,
          status: order.status,
          user_id: user.id,
          organization_id: orgId,
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
          name: form.name,
          slug: form.slug,
          schema: form.schema,
          scope: form.scope,
          org_id: orgId,
          created_by: user.id,
        }))
      );

    if (error) throw error;
  }
}
