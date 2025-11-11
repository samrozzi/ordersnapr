export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string | null
          end_at: string | null
          id: string
          meta: Json | null
          org_id: string
          start_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_at?: string | null
          id?: string
          meta?: Json | null
          org_id: string
          start_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_at?: string | null
          id?: string
          meta?: Json | null
          org_id?: string
          start_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          organization_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          organization_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          organization_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          entity_type: string
          field_config: Json
          field_key: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          entity_type: string
          field_config?: Json
          field_key: string
          field_name: string
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          entity_type?: string
          field_config?: Json
          field_key?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          meta: Json | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          meta?: Json | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          meta?: Json | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string | null
          id: string
          meta: Json | null
          name: string
          org_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          name: string
          org_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          created_at: string
          id: string
          layout_data: Json | null
          page_path: string | null
          position: number
          settings: Json | null
          size: string | null
          updated_at: string
          user_id: string
          widget_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_data?: Json | null
          page_path?: string | null
          position: number
          settings?: Json | null
          size?: string | null
          updated_at?: string
          user_id: string
          widget_type: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_data?: Json | null
          page_path?: string | null
          position?: number
          settings?: Json | null
          size?: string | null
          updated_at?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: []
      }
      email_change_requests: {
        Row: {
          current_email: string
          id: string
          requested_at: string
          requested_email: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          current_email: string
          id?: string
          requested_at?: string
          requested_email: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          current_email?: string
          id?: string
          requested_at?: string
          requested_email?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      form_drafts: {
        Row: {
          created_at: string | null
          draft_name: string | null
          form_data: Json
          form_type: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          draft_name?: string | null
          form_data: Json
          form_type: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          draft_name?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          answers: Json
          attachments: Json | null
          created_at: string | null
          created_by: string
          form_template_id: string
          id: string
          job_id: string | null
          metadata: Json | null
          org_id: string | null
          signature: Json | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          answers?: Json
          attachments?: Json | null
          created_at?: string | null
          created_by: string
          form_template_id: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          org_id?: string | null
          signature?: Json | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json
          attachments?: Json | null
          created_at?: string | null
          created_by?: string
          form_template_id?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          org_id?: string | null
          signature?: Json | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          name: string
          org_id: string | null
          schema: Json
          scope: string | null
          slug: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          org_id?: string | null
          schema: Json
          scope?: string | null
          slug: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          org_id?: string | null
          schema?: Json
          scope?: string | null
          slug?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          due_date: string | null
          external_ref: string | null
          id: string
          number: string | null
          org_id: string
          paid_amount_cents: number | null
          status: string | null
          total_cents: number
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          external_ref?: string | null
          id?: string
          number?: string | null
          org_id: string
          paid_amount_cents?: number | null
          status?: string | null
          total_cents?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          external_ref?: string | null
          id?: string
          number?: string | null
          org_id?: string
          paid_amount_cents?: number | null
          status?: string | null
          total_cents?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      note_templates: {
        Row: {
          category: string
          created_at: string
          default_blocks: Json
          default_title: string
          description: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_blocks?: Json
          default_title: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_blocks?: Json
          default_title?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          background_color: string | null
          banner_image: string | null
          content: Json
          created_at: string
          id: string
          is_favorite: boolean
          is_pinned: boolean
          is_presentation_mode: boolean
          kanban_column: string | null
          kanban_position: number | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          org_id: string | null
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
          view_mode: string
        }
        Insert: {
          background_color?: string | null
          banner_image?: string | null
          content?: Json
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          is_presentation_mode?: boolean
          kanban_column?: string | null
          kanban_position?: number | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          org_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
          view_mode?: string
        }
        Update: {
          background_color?: string | null
          banner_image?: string | null
          content?: Json
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          is_presentation_mode?: boolean
          kanban_column?: string | null
          kanban_position?: number | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          org_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_features: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean
          id: string
          module: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          module: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          module?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_features_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_page_widgets: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          org_page_id: string
          position: Json
          widget_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          org_page_id: string
          position: Json
          widget_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          org_page_id?: string
          position?: Json
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_page_widgets_org_page_id_fkey"
            columns: ["org_page_id"]
            isOneToOne: false
            referencedRelation: "org_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pages: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          layout: Json | null
          org_id: string
          path: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          layout?: Json | null
          org_id: string
          path: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          layout?: Json | null
          org_id?: string
          path?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          custom_theme_color: string | null
          id: string
          logo_url: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_theme_color?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_theme_color?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          industry: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_org_id: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          organization_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          active_org_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          organization_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          active_org_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          organization_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_id_fkey"
            columns: ["active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_information: string | null
          address: string | null
          contact: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          organization_id: string | null
          property_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_information?: string | null
          address?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string | null
          property_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_information?: string | null
          address?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string | null
          property_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          display_order: number | null
          entity_id: string
          entity_type: string
          id: string
          org_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          entity_id: string
          entity_type: string
          id?: string
          org_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          org_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes_preferences: {
        Row: {
          checklist_move_completed: boolean
          checklist_strikethrough: boolean
          created_at: string
          default_view: string
          id: string
          kanban_columns: Json
          list_sort_by: string
          list_sort_order: string
          sidebar_dropdown_open: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_move_completed?: boolean
          checklist_strikethrough?: boolean
          created_at?: string
          default_view?: string
          id?: string
          kanban_columns?: Json
          list_sort_by?: string
          list_sort_order?: string
          sidebar_dropdown_open?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_move_completed?: boolean
          checklist_strikethrough?: boolean
          created_at?: string
          default_view?: string
          id?: string
          kanban_columns?: Json
          list_sort_by?: string
          list_sort_order?: string
          sidebar_dropdown_open?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          nav_order: Json | null
          quick_add_enabled: boolean | null
          quick_add_items: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nav_order?: Json | null
          quick_add_enabled?: boolean | null
          quick_add_items?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nav_order?: Json | null
          quick_add_enabled?: boolean | null
          quick_add_items?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          access_notes: string | null
          access_required: boolean
          address: string | null
          assigned_to: string | null
          ban: string | null
          bpc: string | null
          checklist: Json | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          contact_info: string | null
          created_at: string | null
          custom_data: Json | null
          customer_name: string
          id: string
          job_id: string | null
          linked_invoice_id: string | null
          notes: string | null
          organization_id: string | null
          package: string | null
          photos: string[] | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_notes?: string | null
          access_required?: boolean
          address?: string | null
          assigned_to?: string | null
          ban?: string | null
          bpc?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          contact_info?: string | null
          created_at?: string | null
          custom_data?: Json | null
          customer_name: string
          id?: string
          job_id?: string | null
          linked_invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          package?: string | null
          photos?: string[] | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_notes?: string | null
          access_required?: boolean
          address?: string | null
          assigned_to?: string | null
          ban?: string | null
          bpc?: string | null
          checklist?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          contact_info?: string | null
          created_at?: string | null
          custom_data?: Json | null
          customer_name?: string
          id?: string
          job_id?: string | null
          linked_invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          package?: string | null
          photos?: string[] | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_org_member: {
        Args: { _acting_user_id: string; _target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_same_org: { Args: { _u1: string; _u2: string }; Returns: boolean }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      set_username: { Args: { new_username: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "org_admin"
      approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "org_admin"],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
