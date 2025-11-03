-- Create form_templates table
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_templates_org ON form_templates(org_id);
CREATE INDEX idx_form_templates_slug ON form_templates(slug);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);

-- Create form_submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL,
  job_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  signature JSONB,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_submissions_org ON form_submissions(org_id);
CREATE INDEX idx_form_submissions_template ON form_submissions(form_template_id);
CREATE INDEX idx_form_submissions_creator ON form_submissions(created_by);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_job ON form_submissions(job_id);

-- Enable RLS
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_templates
CREATE POLICY "Org members can view active templates"
  ON form_templates FOR SELECT
  USING (
    (is_global = true OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    AND is_active = true
  );

CREATE POLICY "Org admins can manage templates"
  ON form_templates FOR ALL
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage all templates"
  ON form_templates FOR ALL
  USING (is_super_admin(auth.uid()));

-- RLS Policies for form_submissions
CREATE POLICY "Users can view org submissions"
  ON form_submissions FOR SELECT
  USING (
    org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can create submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can update own drafts"
  ON form_submissions FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Org admins can update submissions"
  ON form_submissions FOR UPDATE
  USING (
    (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can delete own drafts"
  ON form_submissions FOR DELETE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Org admins can delete submissions"
  ON form_submissions FOR DELETE
  USING (
    (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
    AND is_user_approved(auth.uid())
  );

-- Add updated_at triggers
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed AT&T Job Audit Template
INSERT INTO form_templates (org_id, name, slug, category, is_active, schema)
VALUES (
  'd7d395bf-651e-432a-8788-78d1fd90a258'::uuid,
  'Job Audit',
  'job-audit',
  'Quality Control',
  true,
  $TEMPLATE${
    "title": "Job Quality Inspection Report",
    "description": "Comprehensive technician quality audit at job site",
    "require_signature": true,
    "sections": [
      {
        "title": "Job Details",
        "fields": [
          {"key": "technician_name", "label": "Technician Name", "type": "text", "required": true},
          {"key": "ban", "label": "BAN", "type": "text", "required": true},
          {"key": "service_date", "label": "Service Date", "type": "date", "required": true},
          {"key": "address", "label": "Address", "type": "textarea", "required": true},
          {"key": "customer_name", "label": "Customer Name", "type": "text", "required": true},
          {"key": "can_be_reached", "label": "Can Be Reached", "type": "text", "placeholder": "Phone number"},
          {"key": "reported_by", "label": "Reported By", "type": "text"},
          {"key": "job_id", "label": "Related Job", "type": "job_lookup"}
        ]
      },
      {
        "title": "Observations",
        "fields": [
          {"key": "observations", "label": "General Observations", "type": "textarea", "maxLength": 2000}
        ]
      },
      {
        "title": "Administrative/Testing Checklist",
        "fields": [
          {
            "key": "admin_checklist",
            "label": "Administrative & Testing",
            "type": "checklist",
            "items": [
              "Conducted all proper required testing (Including Fiber / Copper TRUE Test)",
              "Detailed, accurate close out narrative provided, in addition to correct disposition / cause codes",
              "Bad Plant Condition (BPC) filled out properly and submitted",
              "Damage claim properly submitted (Non-Drop Related)",
              "Wi-Fi / Consultation",
              "Wi-Fi / Assessment for RG placement",
              "Wi-Fi / Assessment results and extender discussion",
              "Wi-Fi / SHM customer login and touchpoints (Do not handle customer device)",
              "Other"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Customer Experience Checklist",
        "fields": [
          {
            "key": "customer_checklist",
            "label": "Customer Experience",
            "type": "checklist",
            "items": [
              "Time Management",
              "No trouble after visit",
              "Tech visited prem first and closed job with customer",
              "Initiated proper customer contact (pre and post work); reviewed work request with customer; covered Service Promise with customer",
              "Introduced self; showed ATT ID; greeted customer by name",
              "Proper apparel and booties worn",
              "Confirmed all existing customer equipment working prior to job start",
              "Recommended additional products & services, as appropriate (you Refer)",
              "Verfied all services were working properly (upon job completion); provided customer education",
              "General housekeeping (inside & outside the home); respect the customer premises",
              "Other"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Drop Audit Checklist",
        "fields": [
          {
            "key": "drop_checklist",
            "label": "MAIN FOCUS/BSW AUDIT - Drop",
            "type": "checklist",
            "items": [
              "Buried drop properly placed in aerial plant",
              "BDR Submitted with Accurate Information",
              "BDR photos provided (Sidekick)",
              "Closure/Handhole/Terminal closed and secured",
              "Drop properly dug in at Closure/Handhole/Terminal",
              "Drop properly tagged at Terminal",
              "Copper drop bonded correctly",
              "Drop bonding meets specifications",
              "Fiber drop properly protected at building entrance",
              "Proper slack storage at premises"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Photos",
        "fields": [
          {
            "key": "photos",
            "label": "Upload Photos",
            "type": "file",
            "accept": [".jpg", ".jpeg", ".png"],
            "maxFiles": 50,
            "allowCaptions": true
          }
        ]
      }
    ]
  }$TEMPLATE$::jsonb
);

-- Seed AT&T Ride-Along Template
INSERT INTO form_templates (org_id, name, slug, category, is_active, schema)
VALUES (
  'd7d395bf-651e-432a-8788-78d1fd90a258'::uuid,
  'Ride-Along',
  'ride-along',
  'Training & Observation',
  true,
  $TEMPLATE${
    "title": "Ride-Along Observation Form",
    "description": "Comprehensive fiber install ride-along evaluation",
    "require_signature": true,
    "sections": [
      {
        "title": "Form Details",
        "fields": [
          {"key": "account_number", "label": "Account Number", "type": "text", "required": true},
          {"key": "address", "label": "Address", "type": "textarea", "required": true},
          {"key": "customer_name", "label": "Customer Name", "type": "text", "required": true},
          {"key": "technician_name", "label": "Technician Name", "type": "text", "required": true},
          {"key": "observer_name", "label": "Observer Name", "type": "text", "required": true, "default": "Sam Rozzi"},
          {"key": "can_be_reached", "label": "Can Be Reached", "type": "text"},
          {"key": "date", "label": "Date", "type": "date", "required": true},
          {"key": "start_time", "label": "Start Time", "type": "time", "required": true},
          {"key": "end_time", "label": "End Time", "type": "time", "required": true}
        ]
      },
      {
        "title": "Section 1: Pre-Call",
        "fields": [
          {
            "key": "pre_call_checklist",
            "label": "Pre-Call",
            "type": "checklist",
            "items": [
              "Introduce yourself",
              "Verify appointment",
              "Verify service to be installed",
              "Share ETA"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 2: Drive To Prem",
        "fields": [
          {
            "key": "drive_checklist",
            "label": "Drive To Premises",
            "type": "checklist",
            "items": ["Did the technician drive directly to the premises?"],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 3: Meet and Greet",
        "fields": [
          {
            "key": "meet_greet_checklist",
            "label": "Meet and Greet",
            "type": "checklist",
            "items": [
              "Introduce yourself",
              "Show badge",
              "Verify customer name",
              "Offer booties",
              "Verify service to be installed",
              "Set expectations",
              "Discuss RG Placement"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 4: Site Survey",
        "fields": [
          {
            "key": "site_survey_checklist",
            "label": "Site Survey",
            "type": "checklist",
            "items": [
              "Walk property with customer",
              "Locate utilities",
              "Identify obstacles",
              "Determine entry point",
              "Discuss installation plan"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 5: Installation",
        "fields": [
          {
            "key": "installation_checklist",
            "label": "Installation Process",
            "type": "checklist",
            "items": [
              "Proper safety equipment used",
              "Work area protected",
              "Quality workmanship",
              "Proper cable management",
              "Testing performed"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 6: Customer Education",
        "fields": [
          {
            "key": "education_checklist",
            "label": "Customer Education",
            "type": "checklist",
            "items": [
              "Equipment demonstrated",
              "Features explained",
              "Questions answered",
              "Contact information provided"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 7: Cleanup",
        "fields": [
          {
            "key": "cleanup_checklist",
            "label": "Cleanup",
            "type": "checklist",
            "items": [
              "All debris removed",
              "Work area cleaned",
              "Equipment organized",
              "Customer satisfied"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 8: Paperwork",
        "fields": [
          {
            "key": "paperwork_checklist",
            "label": "Paperwork",
            "type": "checklist",
            "items": [
              "Work order completed accurately",
              "Customer signature obtained",
              "Photos uploaded",
              "Job closed properly"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 9: Overall Assessment",
        "fields": [
          {"key": "overall_score", "label": "Overall Score (1-10)", "type": "number", "min": 1, "max": 10, "required": true},
          {"key": "strengths", "label": "Strengths", "type": "textarea", "maxLength": 1000},
          {"key": "areas_for_improvement", "label": "Areas for Improvement", "type": "textarea", "maxLength": 1000}
        ]
      },
      {
        "title": "Overall Notes",
        "fields": [
          {"key": "overall_notes", "label": "Overall Notes", "type": "textarea", "maxLength": 2000}
        ]
      },
      {
        "title": "Photos",
        "fields": [
          {
            "key": "photos",
            "label": "Upload Photos",
            "type": "file",
            "accept": [".jpg", ".jpeg", ".png"],
            "maxFiles": 50,
            "allowCaptions": true
          }
        ]
      }
    ]
  }$TEMPLATE$::jsonb
);