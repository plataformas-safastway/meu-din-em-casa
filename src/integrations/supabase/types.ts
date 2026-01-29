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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_user_access_scopes: {
        Row: {
          admin_user_id: string
          created_at: string
          created_by: string | null
          family_id: string | null
          id: string
          scope_type: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          scope_type?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_access_scopes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_access_scopes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"]
          avatar_url: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          mfa_required: boolean
          mfa_verified: boolean
          must_change_password: boolean
          phone_country: string | null
          phone_number: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"]
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_required?: boolean
          mfa_verified?: boolean
          must_change_password?: boolean
          phone_country?: string | null
          phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"]
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          mfa_required?: boolean
          mfa_verified?: boolean
          must_change_password?: boolean
          phone_country?: string | null
          phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          action_url: string | null
          alert_type: string
          category_id: string | null
          created_at: string
          family_id: string
          id: string
          is_read: boolean
          message: string
          severity: string
          title: string
        }
        Insert: {
          action_url?: string | null
          alert_type: string
          category_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          title: string
        }
        Update: {
          action_url?: string | null
          alert_type?: string
          category_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          family_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string | null
          new_value: Json | null
          old_value: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          family_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          family_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["bank_account_type"]
          bank_id: string | null
          created_at: string
          custom_bank_name: string | null
          family_id: string
          id: string
          initial_balance: number | null
          is_active: boolean
          nickname: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["bank_account_type"]
          bank_id?: string | null
          created_at?: string
          custom_bank_name?: string | null
          family_id: string
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          nickname: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["bank_account_type"]
          bank_id?: string | null
          created_at?: string
          custom_bank_name?: string | null
          family_id?: string
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          nickname?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      budget_template_applications: {
        Row: {
          applied_at: string
          applied_by: string | null
          created_at: string
          estimated_income_midpoint: number
          family_id: string
          has_dependents: boolean | null
          has_pets: boolean | null
          id: string
          income_band: string
          income_subband: string
          month_ref: string
          percentages_applied: Json
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          estimated_income_midpoint: number
          family_id: string
          has_dependents?: boolean | null
          has_pets?: boolean | null
          id?: string
          income_band: string
          income_subband: string
          month_ref: string
          percentages_applied?: Json
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          estimated_income_midpoint?: number
          family_id?: string
          has_dependents?: boolean | null
          has_pets?: boolean | null
          id?: string
          income_band?: string
          income_subband?: string
          month_ref?: string
          percentages_applied?: Json
        }
        Relationships: [
          {
            foreignKeyName: "budget_template_applications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_version_items: {
        Row: {
          budget_version_id: string
          category_id: string
          confidence: number | null
          created_at: string
          id: string
          max_amount: number | null
          min_amount: number | null
          rationale: string | null
          subcategory_id: string | null
          suggested_amount: number
        }
        Insert: {
          budget_version_id: string
          category_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          rationale?: string | null
          subcategory_id?: string | null
          suggested_amount: number
        }
        Update: {
          budget_version_id?: string
          category_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          rationale?: string | null
          subcategory_id?: string | null
          suggested_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_version_items_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          created_at: string
          created_by: string | null
          effective_month: string
          family_id: string
          id: string
          input_snapshot: Json | null
          notes: string | null
          source_type: Database["public"]["Enums"]["budget_version_source_type"]
          status: Database["public"]["Enums"]["budget_version_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_month: string
          family_id: string
          id?: string
          input_snapshot?: Json | null
          notes?: string | null
          source_type: Database["public"]["Enums"]["budget_version_source_type"]
          status?: Database["public"]["Enums"]["budget_version_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_month?: string
          family_id?: string
          id?: string
          input_snapshot?: Json | null
          notes?: string | null
          source_type?: Database["public"]["Enums"]["budget_version_source_type"]
          status?: Database["public"]["Enums"]["budget_version_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          average_spending: number | null
          category_id: string
          created_at: string
          family_id: string
          id: string
          is_active: boolean
          monthly_limit: number
          projected_amount: number | null
          subcategory_id: string | null
          updated_at: string
          use_income_reference: boolean
        }
        Insert: {
          average_spending?: number | null
          category_id: string
          created_at?: string
          family_id: string
          id?: string
          is_active?: boolean
          monthly_limit: number
          projected_amount?: number | null
          subcategory_id?: string | null
          updated_at?: string
          use_income_reference?: boolean
        }
        Update: {
          average_spending?: number | null
          category_id?: string
          created_at?: string
          family_id?: string
          id?: string
          is_active?: boolean
          monthly_limit?: number
          projected_amount?: number | null
          subcategory_id?: string | null
          updated_at?: string
          use_income_reference?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "budgets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_forecasts: {
        Row: {
          alert_level: string | null
          created_at: string
          family_id: string
          forecast_date: string
          id: string
          projected_balance: number
          projected_expenses: number
          projected_income: number
          projected_installments: number
        }
        Insert: {
          alert_level?: string | null
          created_at?: string
          family_id: string
          forecast_date: string
          id?: string
          projected_balance?: number
          projected_expenses?: number
          projected_income?: number
          projected_installments?: number
        }
        Update: {
          alert_level?: string | null
          created_at?: string
          family_id?: string
          forecast_date?: string
          id?: string
          projected_balance?: number
          projected_expenses?: number
          projected_income?: number
          projected_installments?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_forecasts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_feedback: {
        Row: {
          apply_scope: Database["public"]["Enums"]["learning_scope"]
          created_at: string
          family_id: string
          fingerprint_strong: string | null
          fingerprint_weak: string | null
          id: string
          normalized_descriptor: string
          predicted_category_id: string | null
          predicted_confidence: number | null
          predicted_source:
            | Database["public"]["Enums"]["prediction_source"]
            | null
          predicted_subcategory_id: string | null
          raw_descriptor: string
          transaction_id: string | null
          user_category_id: string
          user_id: string
          user_subcategory_id: string | null
          was_prediction_correct: boolean
        }
        Insert: {
          apply_scope?: Database["public"]["Enums"]["learning_scope"]
          created_at?: string
          family_id: string
          fingerprint_strong?: string | null
          fingerprint_weak?: string | null
          id?: string
          normalized_descriptor: string
          predicted_category_id?: string | null
          predicted_confidence?: number | null
          predicted_source?:
            | Database["public"]["Enums"]["prediction_source"]
            | null
          predicted_subcategory_id?: string | null
          raw_descriptor: string
          transaction_id?: string | null
          user_category_id: string
          user_id: string
          user_subcategory_id?: string | null
          was_prediction_correct?: boolean
        }
        Update: {
          apply_scope?: Database["public"]["Enums"]["learning_scope"]
          created_at?: string
          family_id?: string
          fingerprint_strong?: string | null
          fingerprint_weak?: string | null
          id?: string
          normalized_descriptor?: string
          predicted_category_id?: string | null
          predicted_confidence?: number | null
          predicted_source?:
            | Database["public"]["Enums"]["prediction_source"]
            | null
          predicted_subcategory_id?: string | null
          raw_descriptor?: string
          transaction_id?: string | null
          user_category_id?: string
          user_id?: string
          user_subcategory_id?: string | null
          was_prediction_correct?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categorization_feedback_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_feedback_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      category_change_logs: {
        Row: {
          action: string
          affected_transaction_count: number | null
          category_id: string | null
          family_id: string
          id: string
          metadata: Json | null
          new_category_id: string | null
          new_name: string | null
          old_category_id: string | null
          old_name: string | null
          performed_at: string
          performed_by_user_id: string | null
          subcategory_id: string | null
        }
        Insert: {
          action: string
          affected_transaction_count?: number | null
          category_id?: string | null
          family_id: string
          id?: string
          metadata?: Json | null
          new_category_id?: string | null
          new_name?: string | null
          old_category_id?: string | null
          old_name?: string | null
          performed_at?: string
          performed_by_user_id?: string | null
          subcategory_id?: string | null
        }
        Update: {
          action?: string
          affected_transaction_count?: number | null
          category_id?: string | null
          family_id?: string
          id?: string
          metadata?: Json | null
          new_category_id?: string | null
          new_name?: string | null
          old_category_id?: string | null
          old_name?: string | null
          performed_at?: string
          performed_by_user_id?: string | null
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_change_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_change_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_change_logs_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "user_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_import_mappings: {
        Row: {
          created_at: string
          family_id: string
          id: string
          imported_limit: number | null
          imported_name: string
          mapped_category_id: string
          mapped_subcategory_id: string | null
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          imported_limit?: number | null
          imported_name: string
          mapped_category_id: string
          mapped_subcategory_id?: string | null
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          imported_limit?: number | null
          imported_name?: string
          mapped_category_id?: string
          mapped_subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_import_mappings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      category_import_sessions: {
        Row: {
          categories_imported: number | null
          completed_at: string | null
          created_at: string | null
          decision: string | null
          family_id: string
          id: string
          import_type: string
          metadata: Json | null
          subcategories_imported: number | null
          transactions_count: number | null
        }
        Insert: {
          categories_imported?: number | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          family_id: string
          id?: string
          import_type: string
          metadata?: Json | null
          subcategories_imported?: number | null
          transactions_count?: number | null
        }
        Update: {
          categories_imported?: number | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          family_id?: string
          id?: string
          import_type?: string
          metadata?: Json | null
          subcategories_imported?: number | null
          transactions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_import_sessions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      category_reclassification_log: {
        Row: {
          created_at: string | null
          family_id: string
          id: string
          new_category_id: string | null
          new_subcategory_id: string | null
          old_category_id: string | null
          old_subcategory_id: string | null
          reclassification_source: string | null
          session_id: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          family_id: string
          id?: string
          new_category_id?: string | null
          new_subcategory_id?: string | null
          old_category_id?: string | null
          old_subcategory_id?: string | null
          reclassification_source?: string | null
          session_id?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string
          id?: string
          new_category_id?: string | null
          new_subcategory_id?: string | null
          old_category_id?: string | null
          old_subcategory_id?: string | null
          reclassification_source?: string | null
          session_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_reclassification_log_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_reclassification_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "category_import_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_reclassification_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          category_id: string
          created_at: string
          family_id: string
          id: string
          keyword: string
          subcategory_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          family_id: string
          id?: string
          keyword: string
          subcategory_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          family_id?: string
          id?: string
          keyword?: string
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_rules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_password_patterns: {
        Row: {
          bank_name: string
          cpf_pattern_length: number
          created_at: string
          document_type: string
          family_id: string
          id: string
          last_success_at: string
          success_count: number
          updated_at: string
        }
        Insert: {
          bank_name: string
          cpf_pattern_length: number
          created_at?: string
          document_type: string
          family_id: string
          id?: string
          last_success_at?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          bank_name?: string
          cpf_pattern_length?: number
          created_at?: string
          document_type?: string
          family_id?: string
          id?: string
          last_success_at?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          bank_account_id: string | null
          brand: Database["public"]["Enums"]["card_brand"]
          card_name: string
          card_type: Database["public"]["Enums"]["card_type"]
          closing_day: number | null
          created_at: string
          credit_limit: number | null
          due_day: number | null
          family_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          brand?: Database["public"]["Enums"]["card_brand"]
          card_name: string
          card_type?: Database["public"]["Enums"]["card_type"]
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          family_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          brand?: Database["public"]["Enums"]["card_brand"]
          card_name?: string
          card_type?: Database["public"]["Enums"]["card_type"]
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          family_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          family_id: string
          id: string
          notes: string | null
          performed_by: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          family_id: string
          id?: string
          notes?: string | null
          performed_by: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          family_id?: string
          id?: string
          notes?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_actions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_ai_suggestions: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          confidence_score: number | null
          created_at: string
          description: string
          executed_at: string | null
          expires_at: string | null
          family_id: string
          id: string
          priority: string | null
          reason: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          related_signals: string[] | null
          status: string | null
          suggested_action: Json | null
          suggestion_type: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          executed_at?: string | null
          expires_at?: string | null
          family_id: string
          id?: string
          priority?: string | null
          reason: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          related_signals?: string[] | null
          status?: string | null
          suggested_action?: Json | null
          suggestion_type: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          executed_at?: string | null
          expires_at?: string | null
          family_id?: string
          id?: string
          priority?: string | null
          reason?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          related_signals?: string[] | null
          status?: string | null
          suggested_action?: Json | null
          suggestion_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_ai_suggestions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_family_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_family_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_family_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cs_automation_executions: {
        Row: {
          action_payload: Json | null
          action_type: string
          consent_verified: boolean | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          family_id: string
          id: string
          result: Json | null
          rule_id: string | null
          status: string | null
          suggestion_id: string | null
          triggered_by: string
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          consent_verified?: boolean | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          family_id: string
          id?: string
          result?: Json | null
          rule_id?: string | null
          status?: string | null
          suggestion_id?: string | null
          triggered_by: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          consent_verified?: boolean | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          family_id?: string
          id?: string
          result?: Json | null
          rule_id?: string | null
          status?: string | null
          suggestion_id?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_automation_executions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cs_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_automation_executions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "cs_ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          cooldown_hours: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          requires_consent: boolean | null
          trigger_signal: string
          updated_at: string
        }
        Insert: {
          action_config: Json
          action_type: string
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          requires_consent?: boolean | null
          trigger_signal: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          requires_consent?: boolean | null
          trigger_signal?: string
          updated_at?: string
        }
        Relationships: []
      }
      cs_behavior_signals: {
        Row: {
          created_at: string
          detected_at: string
          family_id: string
          id: string
          is_active: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          signal_code: string
          signal_type: string
          signal_value: Json | null
        }
        Insert: {
          created_at?: string
          detected_at?: string
          family_id: string
          id?: string
          is_active?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signal_code: string
          signal_type: string
          signal_value?: Json | null
        }
        Update: {
          created_at?: string
          detected_at?: string
          family_id?: string
          id?: string
          is_active?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signal_code?: string
          signal_type?: string
          signal_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_behavior_signals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_engagement_metrics: {
        Row: {
          ai_analysis_at: string | null
          ai_churn_probability: number | null
          ai_engagement_prediction: string | null
          ai_next_best_action: string | null
          ai_risk_score: number | null
          calculated_at: string
          family_id: string
          has_budget: boolean | null
          has_goals: boolean | null
          has_import: boolean | null
          has_manual_transactions: boolean | null
          id: string
          last_login_at: string | null
          score: number
          score_breakdown: Json | null
          total_logins_30d: number | null
        }
        Insert: {
          ai_analysis_at?: string | null
          ai_churn_probability?: number | null
          ai_engagement_prediction?: string | null
          ai_next_best_action?: string | null
          ai_risk_score?: number | null
          calculated_at?: string
          family_id: string
          has_budget?: boolean | null
          has_goals?: boolean | null
          has_import?: boolean | null
          has_manual_transactions?: boolean | null
          id?: string
          last_login_at?: string | null
          score?: number
          score_breakdown?: Json | null
          total_logins_30d?: number | null
        }
        Update: {
          ai_analysis_at?: string | null
          ai_churn_probability?: number | null
          ai_engagement_prediction?: string | null
          ai_next_best_action?: string | null
          ai_risk_score?: number | null
          calculated_at?: string
          family_id?: string
          has_budget?: boolean | null
          has_goals?: boolean | null
          has_import?: boolean | null
          has_manual_transactions?: boolean | null
          id?: string
          last_login_at?: string | null
          score?: number
          score_breakdown?: Json | null
          total_logins_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_engagement_metrics_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_user_preferences: {
        Row: {
          allow_ai_analysis: boolean | null
          allow_notifications: boolean | null
          allow_proactive_contact: boolean | null
          allow_smart_tips: boolean | null
          family_id: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_ai_analysis?: boolean | null
          allow_notifications?: boolean | null
          allow_proactive_contact?: boolean | null
          allow_smart_tips?: boolean | null
          family_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_ai_analysis?: boolean | null
          allow_notifications?: boolean | null
          allow_proactive_contact?: boolean | null
          allow_smart_tips?: boolean | null
          family_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_user_preferences_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_user_status: {
        Row: {
          assigned_to: string | null
          created_at: string
          family_id: string
          id: string
          notes: string | null
          risk_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          family_id: string
          id?: string
          notes?: string | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          family_id?: string
          id?: string
          notes?: string | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_user_status_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_audit_logs: {
        Row: {
          actor_admin_id: string
          actor_role: string
          created_at: string
          event_type: string
          family_ref: string | null
          id: string
          ip_ref: string | null
          metadata_safe: Json | null
          target_user_ref: string | null
        }
        Insert: {
          actor_admin_id: string
          actor_role: string
          created_at?: string
          event_type: string
          family_ref?: string | null
          id?: string
          ip_ref?: string | null
          metadata_safe?: Json | null
          target_user_ref?: string | null
        }
        Update: {
          actor_admin_id?: string
          actor_role?: string
          created_at?: string
          event_type?: string
          family_ref?: string | null
          id?: string
          ip_ref?: string | null
          metadata_safe?: Json | null
          target_user_ref?: string | null
        }
        Relationships: []
      }
      ebook_ctas: {
        Row: {
          cover_url: string | null
          created_at: string
          cta_link: string
          cta_text: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          cta_link: string
          cta_text?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          cta_link?: string
          cta_text?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      education_content: {
        Row: {
          content: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          module: string
          tip_key: string
          title: string
          trigger_condition: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          module: string
          tip_key: string
          title: string
          trigger_condition?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          module?: string
          tip_key?: string
          title?: string
          trigger_condition?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      education_tips_shown: {
        Row: {
          dismissed_at: string | null
          family_id: string
          id: string
          shown_at: string
          tip_key: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          family_id: string
          id?: string
          shown_at?: string
          tip_key: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          family_id?: string
          id?: string
          shown_at?: string
          tip_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_tips_shown_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_reports_audit: {
        Row: {
          accessed_at: string
          action: string
          export_format: string | null
          id: string
          ip_address: string | null
          period_end: string | null
          period_start: string | null
          report_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          export_format?: string | null
          id?: string
          ip_address?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          export_format?: string | null
          id?: string
          ip_address?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      executive_reports_cache: {
        Row: {
          calculated_at: string
          created_by: string | null
          data: Json
          expires_at: string
          id: string
          period_end: string
          period_start: string
          report_type: string
        }
        Insert: {
          calculated_at?: string
          created_by?: string | null
          data: Json
          expires_at: string
          id?: string
          period_end: string
          period_start: string
          report_type: string
        }
        Update: {
          calculated_at?: string
          created_by?: string | null
          data?: Json
          expires_at?: string
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
        }
        Relationships: []
      }
      expense_nature_overrides: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          expense_nature: Database["public"]["Enums"]["expense_nature"]
          family_id: string
          id: string
          merchant_key: string | null
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_nature: Database["public"]["Enums"]["expense_nature"]
          family_id: string
          id?: string
          merchant_key?: string | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_nature?: Database["public"]["Enums"]["expense_nature"]
          family_id?: string
          id?: string
          merchant_key?: string | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_nature_overrides_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          accounting_regime: string
          budget_mode: string | null
          created_at: string
          email_report_day: number | null
          email_report_enabled: boolean
          email_report_recipient: string | null
          financial_stage: string | null
          has_dependents: boolean | null
          has_pets: boolean | null
          household_structure: string | null
          id: string
          income_anchor_value: number | null
          income_range: string | null
          income_subband: string | null
          income_type: string | null
          members_count: number
          name: string
          non_monthly_planning_level: string | null
          primary_objective: string | null
          updated_at: string
        }
        Insert: {
          accounting_regime?: string
          budget_mode?: string | null
          created_at?: string
          email_report_day?: number | null
          email_report_enabled?: boolean
          email_report_recipient?: string | null
          financial_stage?: string | null
          has_dependents?: boolean | null
          has_pets?: boolean | null
          household_structure?: string | null
          id?: string
          income_anchor_value?: number | null
          income_range?: string | null
          income_subband?: string | null
          income_type?: string | null
          members_count?: number
          name: string
          non_monthly_planning_level?: string | null
          primary_objective?: string | null
          updated_at?: string
        }
        Update: {
          accounting_regime?: string
          budget_mode?: string | null
          created_at?: string
          email_report_day?: number | null
          email_report_enabled?: boolean
          email_report_recipient?: string | null
          financial_stage?: string | null
          has_dependents?: boolean | null
          has_pets?: boolean | null
          household_structure?: string | null
          id?: string
          income_anchor_value?: number | null
          income_range?: string | null
          income_subband?: string | null
          income_type?: string | null
          members_count?: number
          name?: string
          non_monthly_planning_level?: string | null
          primary_objective?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_activities: {
        Row: {
          action_type: string
          actor_member_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          family_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_member_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          family_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_member_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          family_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "family_activities_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_activities_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          added_at: string | null
          added_by_user_id: string | null
          avatar_url: string | null
          birth_date: string | null
          blocked_at: string | null
          blocked_by_user_id: string | null
          blocked_reason: string | null
          cpf: string | null
          created_at: string
          display_name: string
          family_id: string
          id: string
          last_active_at: string | null
          phone_country: string | null
          phone_e164: string | null
          profession: string | null
          removed_at: string | null
          removed_by_user_id: string | null
          removed_reason: string | null
          role: Database["public"]["Enums"]["family_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_by_user_id?: string | null
          blocked_reason?: string | null
          cpf?: string | null
          created_at?: string
          display_name: string
          family_id: string
          id?: string
          last_active_at?: string | null
          phone_country?: string | null
          phone_e164?: string | null
          profession?: string | null
          removed_at?: string | null
          removed_by_user_id?: string | null
          removed_reason?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_by_user_id?: string | null
          blocked_reason?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          last_active_at?: string | null
          phone_country?: string | null
          phone_e164?: string | null
          profession?: string | null
          removed_at?: string | null
          removed_by_user_id?: string | null
          removed_reason?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_switch_log: {
        Row: {
          from_family_id: string | null
          id: string
          ip_address: string | null
          switched_at: string
          to_family_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          from_family_id?: string | null
          id?: string
          ip_address?: string | null
          switched_at?: string
          to_family_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          from_family_id?: string | null
          id?: string
          ip_address?: string | null
          switched_at?: string
          to_family_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_switch_log_from_family_id_fkey"
            columns: ["from_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_switch_log_to_family_id_fkey"
            columns: ["to_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_metrics_cache: {
        Row: {
          calculated_at: string
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
        }
        Insert: {
          calculated_at?: string
          id?: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
        }
        Update: {
          calculated_at?: string
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_at: string
          created_at: string
          description: string | null
          family_id: string
          goal_id: string
          id: string
        }
        Insert: {
          amount: number
          contributed_at?: string
          created_at?: string
          description?: string | null
          family_id: string
          goal_id: string
          id?: string
        }
        Update: {
          amount?: number
          contributed_at?: string
          created_at?: string
          description?: string | null
          family_id?: string
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          created_at: string
          current_amount: number | null
          description: string | null
          due_date: string | null
          family_id: string
          id: string
          status: string
          subcategory_id: string | null
          target_amount: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          status?: string
          subcategory_id?: string | null
          target_amount?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          status?: string
          subcategory_id?: string | null
          target_amount?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      import_category_rules: {
        Row: {
          category_id: string
          created_at: string
          family_id: string
          id: string
          keyword: string
          match_count: number
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          family_id: string
          id?: string
          keyword: string
          match_count?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          family_id?: string
          id?: string
          keyword?: string
          match_count?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_category_rules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      import_detected_sources: {
        Row: {
          account_number: string | null
          agency: string | null
          bank_name: string
          created_at: string
          family_id: string
          id: string
          import_id: string
          last4: string | null
          match_status: string
          matched_source_id: string | null
          source_type: string
          updated_at: string
          user_confirmed: boolean
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          bank_name: string
          created_at?: string
          family_id: string
          id?: string
          import_id: string
          last4?: string | null
          match_status?: string
          matched_source_id?: string | null
          source_type: string
          updated_at?: string
          user_confirmed?: boolean
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          bank_name?: string
          created_at?: string
          family_id?: string
          id?: string
          import_id?: string
          last4?: string | null
          match_status?: string
          matched_source_id?: string | null
          source_type?: string
          updated_at?: string
          user_confirmed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "import_detected_sources_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          family_id: string
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["import_file_type"]
          id: string
          imported_transactions: number | null
          processed_at: string | null
          source_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string | null
          total_transactions: number | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          family_id: string
          file_name: string
          file_size?: number | null
          file_type: Database["public"]["Enums"]["import_file_type"]
          id?: string
          imported_transactions?: number | null
          processed_at?: string | null
          source_id?: string | null
          source_type: string
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_transactions?: number | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          family_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["import_file_type"]
          id?: string
          imported_transactions?: number | null
          processed_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_transactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_history_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      import_pending_transactions: {
        Row: {
          amount: number
          category_id: string
          classification:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          confidence_score: number | null
          created_at: string
          date: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          duplicate_transaction_id: string | null
          family_id: string
          id: string
          import_id: string
          is_duplicate: boolean
          needs_review: boolean
          original_date: string | null
          raw_data: Json | null
          subcategory_id: string | null
          suggested_category_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category_id?: string
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          confidence_score?: number | null
          created_at?: string
          date: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          duplicate_transaction_id?: string | null
          family_id: string
          id?: string
          import_id: string
          is_duplicate?: boolean
          needs_review?: boolean
          original_date?: string | null
          raw_data?: Json | null
          subcategory_id?: string | null
          suggested_category_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category_id?: string
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          confidence_score?: number | null
          created_at?: string
          date?: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          duplicate_transaction_id?: string | null
          family_id?: string
          id?: string
          import_id?: string
          is_duplicate?: boolean
          needs_review?: boolean
          original_date?: string | null
          raw_data?: Json | null
          subcategory_id?: string | null
          suggested_category_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_pending_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_pending_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_categories: {
        Row: {
          color: string | null
          created_at: string | null
          family_id: string
          icon: string | null
          id: string
          import_session_id: string | null
          is_active: boolean | null
          mapped_to_category_id: string | null
          name: string
          normalized_name: string
          original_category_name: string | null
          source: string
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          family_id: string
          icon?: string | null
          id?: string
          import_session_id?: string | null
          is_active?: boolean | null
          mapped_to_category_id?: string | null
          name: string
          normalized_name: string
          original_category_name?: string | null
          source?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          family_id?: string
          icon?: string | null
          id?: string
          import_session_id?: string | null
          is_active?: boolean | null
          mapped_to_category_id?: string | null
          name?: string
          normalized_name?: string
          original_category_name?: string | null
          source?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_subcategories: {
        Row: {
          created_at: string | null
          family_id: string
          id: string
          imported_category_id: string
          is_active: boolean | null
          mapped_to_subcategory_id: string | null
          name: string
          normalized_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          family_id: string
          id?: string
          imported_category_id: string
          is_active?: boolean | null
          mapped_to_subcategory_id?: string | null
          name: string
          normalized_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          family_id?: string
          id?: string
          imported_category_id?: string
          is_active?: boolean | null
          mapped_to_subcategory_id?: string | null
          name?: string
          normalized_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_subcategories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_subcategories_imported_category_id_fkey"
            columns: ["imported_category_id"]
            isOneToOne: false
            referencedRelation: "imported_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          auto_detected: boolean | null
          confidence_level: string | null
          created_at: string
          created_by: string | null
          detected_account: string | null
          detected_agency: string | null
          detected_bank: string | null
          detected_document_type: string | null
          detected_last4: string | null
          error_code: string | null
          error_message: string | null
          expires_at: string | null
          family_id: string
          file_name: string
          file_type: string
          id: string
          import_type: string
          invoice_month: string | null
          password_pattern_used: number | null
          processed_at: string | null
          source_id: string
          status: string
          storage_path: string | null
          transactions_count: number | null
        }
        Insert: {
          auto_detected?: boolean | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          detected_account?: string | null
          detected_agency?: string | null
          detected_bank?: string | null
          detected_document_type?: string | null
          detected_last4?: string | null
          error_code?: string | null
          error_message?: string | null
          expires_at?: string | null
          family_id: string
          file_name: string
          file_type: string
          id?: string
          import_type: string
          invoice_month?: string | null
          password_pattern_used?: number | null
          processed_at?: string | null
          source_id: string
          status?: string
          storage_path?: string | null
          transactions_count?: number | null
        }
        Update: {
          auto_detected?: boolean | null
          confidence_level?: string | null
          created_at?: string
          created_by?: string | null
          detected_account?: string | null
          detected_agency?: string | null
          detected_bank?: string | null
          detected_document_type?: string | null
          detected_last4?: string | null
          error_code?: string | null
          error_message?: string | null
          expires_at?: string | null
          family_id?: string
          file_name?: string
          file_type?: string
          id?: string
          import_type?: string
          invoice_month?: string | null
          password_pattern_used?: number | null
          processed_at?: string | null
          source_id?: string
          status?: string
          storage_path?: string | null
          transactions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          installment_group_id: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          installment_group_id?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          installment_group_id?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_audit_log_installment_group_id_fkey"
            columns: ["installment_group_id"]
            isOneToOne: false
            referencedRelation: "installment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_groups: {
        Row: {
          bank_account_id: string | null
          category_id: string
          confidence_level:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          credit_card_id: string | null
          description: string | null
          family_id: string
          first_due_date: string
          id: string
          installment_value: number
          installments_total: number
          needs_user_confirmation: boolean | null
          parent_transaction_id: string | null
          source: string
          subcategory_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          category_id: string
          confidence_level?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string | null
          family_id: string
          first_due_date: string
          id?: string
          installment_value: number
          installments_total: number
          needs_user_confirmation?: boolean | null
          parent_transaction_id?: string | null
          source?: string
          subcategory_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          category_id?: string
          confidence_level?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string | null
          family_id?: string
          first_due_date?: string
          id?: string
          installment_value?: number
          installments_total?: number
          needs_user_confirmation?: boolean | null
          parent_transaction_id?: string | null
          source?: string
          subcategory_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_groups_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_groups_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_groups_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_groups_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_patterns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          pattern: string
          pattern_type: string
          priority: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern: string
          pattern_type: string
          priority?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern?: string
          pattern_type?: string
          priority?: number | null
        }
        Relationships: []
      }
      installments: {
        Row: {
          category_id: string
          created_at: string
          credit_card_id: string | null
          current_installment: number
          description: string
          family_id: string
          id: string
          installment_amount: number
          is_active: boolean
          start_date: string
          subcategory_id: string | null
          total_amount: number
          total_installments: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          credit_card_id?: string | null
          current_installment?: number
          description: string
          family_id: string
          id?: string
          installment_amount: number
          is_active?: boolean
          start_date: string
          subcategory_id?: string | null
          total_amount: number
          total_installments: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          credit_card_id?: string | null
          current_installment?: number
          description?: string
          family_id?: string
          id?: string
          installment_amount?: number
          is_active?: boolean
          start_date?: string
          subcategory_id?: string | null
          total_amount?: number
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_config: {
        Row: {
          config: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          is_enabled: boolean | null
          last_success_at: string | null
          last_test_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          status: Database["public"]["Enums"]["integration_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_success_at?: string | null
          last_test_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_enabled?: boolean | null
          last_success_at?: string | null
          last_test_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      integrations_metrics_daily: {
        Row: {
          created_at: string | null
          id: string
          metric_date: string
          metric_key: string
          metric_value: number | null
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_key: string
          metric_value?: number | null
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_key?: string
          metric_value?: number | null
          provider?: Database["public"]["Enums"]["integration_provider"]
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_document: string
          customer_email: string | null
          customer_name: string
          error_code: string | null
          error_message: string | null
          external_invoice_id: string | null
          family_id: string
          id: string
          invoice_number: string | null
          issued_at: string | null
          payment_id: string | null
          pdf_url: string | null
          retry_count: number | null
          service_description: string
          status: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_document: string
          customer_email?: string | null
          customer_name: string
          error_code?: string | null
          error_message?: string | null
          external_invoice_id?: string | null
          family_id: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          retry_count?: number | null
          service_description?: string
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_document?: string
          customer_email?: string | null
          customer_name?: string
          error_code?: string | null
          error_message?: string | null
          external_invoice_id?: string | null
          family_id?: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          retry_count?: number | null
          service_description?: string
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_merchant_rules: {
        Row: {
          category_id: string
          confidence_base: number
          conflict_count: number
          created_at: string
          examples_count: number
          family_id: string | null
          fingerprint: string
          fingerprint_type: Database["public"]["Enums"]["fingerprint_type"]
          id: string
          is_archived: boolean
          last_used_at: string
          merchant_canon: string | null
          scope_type: Database["public"]["Enums"]["learning_scope"]
          subcategory_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_id: string
          confidence_base?: number
          conflict_count?: number
          created_at?: string
          examples_count?: number
          family_id?: string | null
          fingerprint: string
          fingerprint_type: Database["public"]["Enums"]["fingerprint_type"]
          id?: string
          is_archived?: boolean
          last_used_at?: string
          merchant_canon?: string | null
          scope_type?: Database["public"]["Enums"]["learning_scope"]
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_id?: string
          confidence_base?: number
          conflict_count?: number
          created_at?: string
          examples_count?: number
          family_id?: string | null
          fingerprint?: string
          fingerprint_type?: Database["public"]["Enums"]["fingerprint_type"]
          id?: string
          is_archived?: boolean
          last_used_at?: string
          merchant_canon?: string | null
          scope_type?: Database["public"]["Enums"]["learning_scope"]
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learned_merchant_rules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_access_grants: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          family_id: string | null
          id: string
          mfa_verified: boolean | null
          reason_code: string
          reason_text: string
          requested_by: string
          scope: string
          status: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at: string
          family_id?: string | null
          id?: string
          mfa_verified?: boolean | null
          reason_code: string
          reason_text: string
          requested_by: string
          scope: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          family_id?: string | null
          id?: string
          mfa_verified?: boolean | null
          reason_code?: string
          reason_text?: string
          requested_by?: string
          scope?: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_vault: {
        Row: {
          created_at: string
          created_by: string
          data_type: string
          family_id: string
          id: string
          payload: Json
          retention_until: string
          sealed: boolean | null
          target_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_type: string
          family_id: string
          id?: string
          payload?: Json
          retention_until: string
          sealed?: boolean | null
          target_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_type?: string
          family_id?: string
          id?: string
          payload?: Json
          retention_until?: string
          sealed?: boolean | null
          target_user_id?: string
        }
        Relationships: []
      }
      lgpd_deletion_requests: {
        Row: {
          anonymized_data_hash: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          deadline_at: string
          family_id: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: Database["public"]["Enums"]["lgpd_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymized_data_hash?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          deadline_at?: string
          family_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["lgpd_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymized_data_hash?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          deadline_at?: string
          family_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["lgpd_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_deletion_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_notification_preferences: {
        Row: {
          created_at: string | null
          family_id: string
          id: string
          member_id: string
          push_budget_alerts: boolean | null
          push_location_context: boolean | null
          push_subscription: Json | null
          push_transactions: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          family_id: string
          id?: string
          member_id: string
          push_budget_alerts?: boolean | null
          push_location_context?: boolean | null
          push_subscription?: Json | null
          push_transactions?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          family_id?: string
          id?: string
          member_id?: string
          push_budget_alerts?: boolean | null
          push_location_context?: boolean | null
          push_subscription?: Json | null
          push_transactions?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_notification_preferences_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permissions: {
        Row: {
          can_delete_transactions: boolean | null
          can_edit_all: boolean | null
          can_insert_transactions: boolean | null
          can_manage_family: boolean | null
          can_view_all: boolean | null
          can_view_budget: boolean | null
          can_view_projection: boolean | null
          created_at: string | null
          family_id: string
          id: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          can_delete_transactions?: boolean | null
          can_edit_all?: boolean | null
          can_insert_transactions?: boolean | null
          can_manage_family?: boolean | null
          can_view_all?: boolean | null
          can_view_budget?: boolean | null
          can_view_projection?: boolean | null
          created_at?: string | null
          family_id: string
          id?: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          can_delete_transactions?: boolean | null
          can_edit_all?: boolean | null
          can_insert_transactions?: boolean | null
          can_manage_family?: boolean | null
          can_view_all?: boolean | null
          can_view_budget?: boolean | null
          can_view_projection?: boolean | null
          created_at?: string | null
          family_id?: string
          id?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_directory: {
        Row: {
          address: string | null
          category_id_suggested: string | null
          city: string | null
          cnpj: string | null
          confidence_default: number
          created_at: string
          detected_platform: string | null
          evidence_details: Json | null
          evidence_summary: string | null
          family_id: string | null
          id: string
          is_intermediary: boolean | null
          last_matched_at: string | null
          legal_name: string | null
          match_count: number | null
          merchant_name_display: string | null
          normalized_key: string
          sample_descriptors: string[] | null
          scope: string
          source: string
          state: string | null
          subcategory_id_suggested: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id_suggested?: string | null
          city?: string | null
          cnpj?: string | null
          confidence_default?: number
          created_at?: string
          detected_platform?: string | null
          evidence_details?: Json | null
          evidence_summary?: string | null
          family_id?: string | null
          id?: string
          is_intermediary?: boolean | null
          last_matched_at?: string | null
          legal_name?: string | null
          match_count?: number | null
          merchant_name_display?: string | null
          normalized_key: string
          sample_descriptors?: string[] | null
          scope?: string
          source?: string
          state?: string | null
          subcategory_id_suggested?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id_suggested?: string | null
          city?: string | null
          cnpj?: string | null
          confidence_default?: number
          created_at?: string
          detected_platform?: string | null
          evidence_details?: Json | null
          evidence_summary?: string | null
          family_id?: string | null
          id?: string
          is_intermediary?: boolean | null
          last_matched_at?: string | null
          legal_name?: string | null
          match_count?: number | null
          merchant_name_display?: string | null
          normalized_key?: string
          sample_descriptors?: string[] | null
          scope?: string
          source?: string
          state?: string | null
          subcategory_id_suggested?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_directory_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_ai_reports: {
        Row: {
          created_at: string
          email_recipient: string | null
          email_sent_at: string | null
          family_id: string
          id: string
          month: number
          report_content: Json
          year: number
        }
        Insert: {
          created_at?: string
          email_recipient?: string | null
          email_sent_at?: string | null
          family_id: string
          id?: string
          month: number
          report_content: Json
          year: number
        }
        Update: {
          created_at?: string
          email_recipient?: string | null
          email_sent_at?: string | null
          family_id?: string
          id?: string
          month?: number
          report_content?: Json
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_ai_reports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fixed_costs: {
        Row: {
          calculated_at: string
          category_breakdown: Json | null
          created_at: string
          family_id: string
          id: string
          month_ref: string
          total_fixed_amount: number
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          category_breakdown?: Json | null
          created_at?: string
          family_id: string
          id?: string
          month_ref: string
          total_fixed_amount?: number
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          category_breakdown?: Json | null
          created_at?: string
          family_id?: string
          id?: string
          month_ref?: string
          total_fixed_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fixed_costs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          family_id: string
          id: string
          issues: Json | null
          month_ref: string
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          family_id: string
          id?: string
          issues?: Json | null
          month_ref: string
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          family_id?: string
          id?: string
          issues?: Json | null
          month_ref?: string
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          category_id: string | null
          created_at: string
          family_id: string
          id: string
          message: string | null
          notification_type: string
          place_id: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          message?: string | null
          notification_type: string
          place_id?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          message?: string | null
          notification_type?: string
          place_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_batches: {
        Row: {
          created_at: string
          error_items: number | null
          family_id: string
          id: string
          processed_items: number | null
          ready_items: number | null
          status: string
          total_items: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_items?: number | null
          family_id: string
          id?: string
          processed_items?: number | null
          ready_items?: number | null
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_items?: number | null
          family_id?: string
          id?: string
          processed_items?: number | null
          ready_items?: number | null
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_batches_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_items: {
        Row: {
          batch_id: string
          confidence: number | null
          created_at: string
          duplicate_reason: string | null
          error_message: string | null
          extracted_data: Json | null
          family_id: string
          final_bank_account_id: string | null
          final_category_id: string | null
          final_credit_card_id: string | null
          final_payment_method: string | null
          final_subcategory_id: string | null
          id: string
          image_path: string | null
          image_url: string
          is_duplicate_suspect: boolean | null
          is_recurring: boolean | null
          normalized_amount: number | null
          normalized_cnpj: string | null
          normalized_date: string | null
          normalized_description: string | null
          normalized_merchant: string | null
          normalized_payment_method: string | null
          status: string
          suggested_category_id: string | null
          suggested_subcategory_id: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id: string
          confidence?: number | null
          created_at?: string
          duplicate_reason?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          family_id: string
          final_bank_account_id?: string | null
          final_category_id?: string | null
          final_credit_card_id?: string | null
          final_payment_method?: string | null
          final_subcategory_id?: string | null
          id?: string
          image_path?: string | null
          image_url: string
          is_duplicate_suspect?: boolean | null
          is_recurring?: boolean | null
          normalized_amount?: number | null
          normalized_cnpj?: string | null
          normalized_date?: string | null
          normalized_description?: string | null
          normalized_merchant?: string | null
          normalized_payment_method?: string | null
          status?: string
          suggested_category_id?: string | null
          suggested_subcategory_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          confidence?: number | null
          created_at?: string
          duplicate_reason?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          family_id?: string
          final_bank_account_id?: string | null
          final_category_id?: string | null
          final_credit_card_id?: string | null
          final_payment_method?: string | null
          final_subcategory_id?: string | null
          id?: string
          image_path?: string | null
          image_url?: string
          is_duplicate_suspect?: boolean | null
          is_recurring?: boolean | null
          normalized_amount?: number | null
          normalized_cnpj?: string | null
          normalized_date?: string | null
          normalized_description?: string | null
          normalized_merchant?: string | null
          normalized_payment_method?: string | null
          status?: string
          suggested_category_id?: string | null
          suggested_subcategory_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ocr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_items_final_bank_account_id_fkey"
            columns: ["final_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_items_final_credit_card_id_fkey"
            columns: ["final_credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          created_at: string
          family_id: string
          id: string
          response_key: string
          response_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          response_key: string
          response_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          response_key?: string
          response_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      openfinance_accounts: {
        Row: {
          account_type: string
          available_balance: number | null
          connection_id: string
          created_at: string
          currency: string | null
          current_balance: number | null
          external_account_id: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          nickname: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          available_balance?: number | null
          connection_id: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          external_account_id: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          available_balance?: number | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          external_account_id?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          nickname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openfinance_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "openfinance_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      openfinance_cards: {
        Row: {
          available_limit: number | null
          brand: string | null
          connection_id: string
          created_at: string
          credit_limit: number | null
          display_name: string | null
          due_day: number | null
          external_card_id: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last4: string | null
          statement_close_day: number | null
          updated_at: string
        }
        Insert: {
          available_limit?: number | null
          brand?: string | null
          connection_id: string
          created_at?: string
          credit_limit?: number | null
          display_name?: string | null
          due_day?: number | null
          external_card_id: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last4?: string | null
          statement_close_day?: number | null
          updated_at?: string
        }
        Update: {
          available_limit?: number | null
          brand?: string | null
          connection_id?: string
          created_at?: string
          credit_limit?: number | null
          display_name?: string | null
          due_day?: number | null
          external_card_id?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last4?: string | null
          statement_close_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openfinance_cards_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "openfinance_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      openfinance_connections: {
        Row: {
          consent_created_at: string | null
          consent_expires_at: string | null
          consent_scopes: string[] | null
          created_at: string
          error_message: string | null
          external_item_id: string | null
          family_id: string
          id: string
          institution_id: string
          institution_logo_url: string | null
          institution_name: string
          last_sync_at: string | null
          next_sync_at: string | null
          provider_name: string
          status: string
          updated_at: string
        }
        Insert: {
          consent_created_at?: string | null
          consent_expires_at?: string | null
          consent_scopes?: string[] | null
          created_at?: string
          error_message?: string | null
          external_item_id?: string | null
          family_id: string
          id?: string
          institution_id: string
          institution_logo_url?: string | null
          institution_name: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          consent_created_at?: string | null
          consent_expires_at?: string | null
          consent_scopes?: string[] | null
          created_at?: string
          error_message?: string | null
          external_item_id?: string | null
          family_id?: string
          id?: string
          institution_id?: string
          institution_logo_url?: string | null
          institution_name?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openfinance_connections_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      openfinance_sync_logs: {
        Row: {
          accounts_synced: number | null
          cards_synced: number | null
          completed_at: string | null
          connection_id: string
          created_at: string
          error_message: string | null
          id: string
          started_at: string
          status: string
          sync_type: string
          transactions_imported: number | null
        }
        Insert: {
          accounts_synced?: number | null
          cards_synced?: number | null
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string
          status: string
          sync_type: string
          transactions_imported?: number | null
        }
        Update: {
          accounts_synced?: number | null
          cards_synced?: number | null
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
          transactions_imported?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "openfinance_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "openfinance_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      openfinance_transactions_raw: {
        Row: {
          amount: number
          category_hint: string | null
          currency: string | null
          date: string
          description: string | null
          external_transaction_id: string | null
          family_id: string
          id: string
          imported_at: string
          merchant: string | null
          raw_payload: Json | null
          source_id: string
          source_type: string
        }
        Insert: {
          amount: number
          category_hint?: string | null
          currency?: string | null
          date: string
          description?: string | null
          external_transaction_id?: string | null
          family_id: string
          id?: string
          imported_at?: string
          merchant?: string | null
          raw_payload?: Json | null
          source_id: string
          source_type: string
        }
        Update: {
          amount?: number
          category_hint?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          external_transaction_id?: string | null
          family_id?: string
          id?: string
          imported_at?: string
          merchant?: string | null
          raw_payload?: Json | null
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "openfinance_transactions_raw_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_keys: {
        Row: {
          bank_account_id: string
          created_at: string
          family_id: string
          id: string
          key_type: string
          key_value_masked: string
        }
        Insert: {
          bank_account_id: string
          created_at?: string
          family_id: string
          id?: string
          key_type: string
          key_value_masked: string
        }
        Update: {
          bank_account_id?: string
          created_at?: string
          family_id?: string
          id?: string
          key_type?: string
          key_value_masked?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_keys_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_keys_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      place_category_mapping: {
        Row: {
          category_id: string
          created_at: string
          id: string
          place_type: string
          subcategory_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          place_type: string
          subcategory_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          place_type?: string
          subcategory_id?: string | null
        }
        Relationships: []
      }
      planned_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          family_id: string
          id: string
          installment_group_id: string
          installment_index: number
          reconciled_at: string | null
          reconciled_transaction_id: string | null
          status: Database["public"]["Enums"]["installment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          family_id: string
          id?: string
          installment_group_id: string
          installment_index: number
          reconciled_at?: string | null
          reconciled_transaction_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          family_id?: string
          id?: string
          installment_group_id?: string
          installment_index?: number
          reconciled_at?: string | null
          reconciled_transaction_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_installments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_installments_installment_group_id_fkey"
            columns: ["installment_group_id"]
            isOneToOne: false
            referencedRelation: "installment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_installments_reconciled_transaction_id_fkey"
            columns: ["reconciled_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          created_at?: string | null
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      recurring_alerts_sent: {
        Row: {
          alert_date: string
          channel: string
          days_before: number
          family_id: string
          id: string
          recurring_transaction_id: string
          sent_at: string
        }
        Insert: {
          alert_date: string
          channel?: string
          days_before: number
          family_id: string
          id?: string
          recurring_transaction_id: string
          sent_at?: string
        }
        Update: {
          alert_date?: string
          channel?: string
          days_before?: number
          family_id?: string
          id?: string
          recurring_transaction_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_alerts_sent_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_alerts_sent_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          alert_channels: string[] | null
          alerts_enabled: boolean | null
          amount: number
          bank_account_id: string | null
          category_id: string
          created_at: string
          credit_card_id: string | null
          day_of_month: number | null
          description: string
          end_date: string | null
          expense_type: string | null
          family_id: string
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          notify_days_before: number[] | null
          notify_member_id: string | null
          payment_method: string
          start_date: string
          subcategory_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          alert_channels?: string[] | null
          alerts_enabled?: boolean | null
          amount: number
          bank_account_id?: string | null
          category_id: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description: string
          end_date?: string | null
          expense_type?: string | null
          family_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          notify_days_before?: number[] | null
          notify_member_id?: string | null
          payment_method?: string
          start_date: string
          subcategory_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          alert_channels?: string[] | null
          alerts_enabled?: boolean | null
          amount?: number
          bank_account_id?: string | null
          category_id?: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          expense_type?: string | null
          family_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          notify_days_before?: number[] | null
          notify_member_id?: string | null
          payment_method?: string
          start_date?: string
          subcategory_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_notify_member_id_fkey"
            columns: ["notify_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string
          expires_at: string | null
          family_id: string
          file_path: string | null
          id: string
          month_ref: string
          requested_by: string
          signed_url: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          family_id: string
          file_path?: string | null
          id?: string
          month_ref: string
          requested_by: string
          signed_url?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          family_id?: string
          file_path?: string | null
          id?: string
          month_ref?: string
          requested_by?: string
          signed_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          attempts: number
          created_at: string
          due_date: string
          external_payment_id: string | null
          failure_reason: string | null
          family_id: string
          id: string
          last_attempt_at: string | null
          paid_at: string | null
          payment_method: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          attempts?: number
          created_at?: string
          due_date: string
          external_payment_id?: string | null
          failure_reason?: string | null
          family_id: string
          id?: string
          last_attempt_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attempts?: number
          created_at?: string
          due_date?: string
          external_payment_id?: string | null
          failure_reason?: string | null
          family_id?: string
          id?: string
          last_attempt_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_error_id: string | null
          target_family_id: string | null
          target_session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_error_id?: string | null
          target_family_id?: string | null
          target_session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_error_id?: string | null
          target_family_id?: string | null
          target_session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_errors: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          error_code: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          family_id: string | null
          id: string
          internal_notes: string | null
          metadata: Json | null
          module: string | null
          os: string | null
          resolved_at: string | null
          resolved_by: string | null
          screen: string | null
          status: string
          user_action: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_code?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          family_id?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          module?: string | null
          os?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen?: string | null
          status?: string
          user_action?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_code?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          family_id?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          module?: string | null
          os?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen?: string | null
          status?: string
          user_action?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_errors_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      support_notes: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          id: string
          is_pinned: boolean | null
          note: string
          note_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          is_pinned?: boolean | null
          note: string
          note_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          is_pinned?: boolean | null
          note?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_notes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          actions_performed: Json | null
          approved_at: string | null
          approved_by: string | null
          ended_at: string | null
          id: string
          reason: string
          screens_visited: string[] | null
          session_type: string
          started_at: string
          support_user_id: string
          target_family_id: string
          target_user_id: string | null
        }
        Insert: {
          actions_performed?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          ended_at?: string | null
          id?: string
          reason: string
          screens_visited?: string[] | null
          session_type?: string
          started_at?: string
          support_user_id: string
          target_family_id: string
          target_user_id?: string | null
        }
        Update: {
          actions_performed?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          ended_at?: string | null
          id?: string
          reason?: string
          screens_visited?: string[] | null
          session_type?: string
          started_at?: string
          support_user_id?: string
          target_family_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_target_family_id_fkey"
            columns: ["target_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_api_keys: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          expires_at: string | null
          id: string
          key_prefix: string
          key_suffix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          revoked_by: string | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_prefix: string
          key_suffix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          revoked_by?: string | null
          service: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          expires_at?: string | null
          id?: string
          key_prefix?: string
          key_suffix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          revoked_by?: string | null
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tech_feature_flags: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_name: string
          environment: string
          id: string
          is_enabled: boolean | null
          name: string
          rollout_percentage: number | null
          target_families: string[] | null
          target_roles: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_name: string
          environment?: string
          id?: string
          is_enabled?: boolean | null
          name: string
          rollout_percentage?: number | null
          target_families?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_name?: string
          environment?: string
          id?: string
          is_enabled?: boolean | null
          name?: string
          rollout_percentage?: number | null
          target_families?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tech_integrations: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          display_name: string
          environment: string
          failed_calls: number | null
          id: string
          is_critical: boolean | null
          last_failure_at: string | null
          last_success_at: string | null
          name: string
          status: string
          success_rate: number | null
          total_calls: number | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          environment?: string
          failed_calls?: number | null
          id?: string
          is_critical?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          name: string
          status?: string
          success_rate?: number | null
          total_calls?: number | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          environment?: string
          failed_calls?: number | null
          id?: string
          is_critical?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          name?: string
          status?: string
          success_rate?: number | null
          total_calls?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tech_logs: {
        Row: {
          context: Json | null
          correlation_id: string | null
          created_at: string
          environment: string
          family_id_masked: string | null
          id: string
          level: string
          message: string
          module: string | null
          origin: string
          request_id: string | null
          route: string | null
          service: string
          stack_trace: string | null
          user_id_masked: string | null
        }
        Insert: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string
          environment?: string
          family_id_masked?: string | null
          id?: string
          level: string
          message: string
          module?: string | null
          origin: string
          request_id?: string | null
          route?: string | null
          service: string
          stack_trace?: string | null
          user_id_masked?: string | null
        }
        Update: {
          context?: Json | null
          correlation_id?: string | null
          created_at?: string
          environment?: string
          family_id_masked?: string | null
          id?: string
          level?: string
          message?: string
          module?: string | null
          origin?: string
          request_id?: string | null
          route?: string | null
          service?: string
          stack_trace?: string | null
          user_id_masked?: string | null
        }
        Relationships: []
      }
      tech_performance_metrics: {
        Row: {
          avg_duration_ms: number | null
          call_count: number | null
          created_at: string
          environment: string
          error_count: number | null
          id: string
          metric_type: string
          name: string
          p95_duration_ms: number | null
          p99_duration_ms: number | null
          period_end: string
          period_start: string
        }
        Insert: {
          avg_duration_ms?: number | null
          call_count?: number | null
          created_at?: string
          environment?: string
          error_count?: number | null
          id?: string
          metric_type: string
          name: string
          p95_duration_ms?: number | null
          p99_duration_ms?: number | null
          period_end: string
          period_start: string
        }
        Update: {
          avg_duration_ms?: number | null
          call_count?: number | null
          created_at?: string
          environment?: string
          error_count?: number | null
          id?: string
          metric_type?: string
          name?: string
          p95_duration_ms?: number | null
          p99_duration_ms?: number | null
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      tech_system_health: {
        Row: {
          avg_response_ms: number | null
          checked_at: string
          created_at: string
          errors_last_24h: number | null
          errors_last_hour: number | null
          id: string
          last_incident_at: string | null
          message: string | null
          status: string
          uptime_percentage: number | null
        }
        Insert: {
          avg_response_ms?: number | null
          checked_at?: string
          created_at?: string
          errors_last_24h?: number | null
          errors_last_hour?: number | null
          id?: string
          last_incident_at?: string | null
          message?: string | null
          status?: string
          uptime_percentage?: number | null
        }
        Update: {
          avg_response_ms?: number | null
          checked_at?: string
          created_at?: string
          errors_last_24h?: number | null
          errors_last_hour?: number | null
          id?: string
          last_incident_at?: string | null
          message?: string | null
          status?: string
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      transaction_attachments: {
        Row: {
          created_at: string | null
          family_id: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          ocr_extracted_data: Json | null
          transaction_id: string | null
          type: string
          updated_at: string | null
          uploaded_by: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          family_id: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          ocr_extracted_data?: Json | null
          transaction_id?: string | null
          type?: string
          updated_at?: string | null
          uploaded_by: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          family_id?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          ocr_extracted_data?: Json | null
          transaction_id?: string | null
          type?: string
          updated_at?: string | null
          uploaded_by?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_change_logs: {
        Row: {
          batch_id: string | null
          changed_at: string
          changed_by_user_id: string
          changed_by_user_name: string
          family_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          source: string
          transaction_id: string
        }
        Insert: {
          batch_id?: string | null
          changed_at?: string
          changed_by_user_id: string
          changed_by_user_name: string
          family_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          transaction_id: string
        }
        Update: {
          batch_id?: string | null
          changed_at?: string
          changed_by_user_id?: string
          changed_by_user_name?: string
          family_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_change_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_change_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_privacy: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          family_id: string
          id: string
          is_private: boolean
          max_privacy_days: number
          reason: string | null
          reveal_at: string | null
          revealed_at: string | null
          source: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          family_id: string
          id?: string
          is_private?: boolean
          max_privacy_days?: number
          reason?: string | null
          reveal_at?: string | null
          revealed_at?: string | null
          source?: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          family_id?: string
          id?: string
          is_private?: boolean
          max_privacy_days?: number
          reason?: string | null
          reveal_at?: string | null
          revealed_at?: string | null
          source?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_privacy_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_privacy_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          budget_month: string | null
          card_charge_type:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          cash_date: string | null
          category_id: string
          check_number: string | null
          classification:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          credit_card_id: string | null
          date: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          event_date: string
          expense_nature: Database["public"]["Enums"]["expense_nature"] | null
          expense_nature_source:
            | Database["public"]["Enums"]["expense_nature_source"]
            | null
          family_id: string
          goal_id: string | null
          id: string
          import_id: string | null
          import_source: string | null
          installment_group_id: string | null
          installment_index: number | null
          installments_total: number | null
          is_auto_generated: boolean
          is_recurrent: boolean | null
          is_recurring: boolean
          last_edited_at: string | null
          last_edited_by_user_id: string | null
          notes: string | null
          ocr_confidence: number | null
          original_category_id: string | null
          original_date: string | null
          original_description: string | null
          original_subcategory_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recurrence_pattern: string | null
          recurring_transaction_id: string | null
          review_status: string | null
          source: string
          source_ref_id: string | null
          subcategory_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_description: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          budget_month?: string | null
          card_charge_type?:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          cash_date?: string | null
          category_id: string
          check_number?: string | null
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          credit_card_id?: string | null
          date: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          event_date?: string
          expense_nature?: Database["public"]["Enums"]["expense_nature"] | null
          expense_nature_source?:
            | Database["public"]["Enums"]["expense_nature_source"]
            | null
          family_id: string
          goal_id?: string | null
          id?: string
          import_id?: string | null
          import_source?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          installments_total?: number | null
          is_auto_generated?: boolean
          is_recurrent?: boolean | null
          is_recurring?: boolean
          last_edited_at?: string | null
          last_edited_by_user_id?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          original_category_id?: string | null
          original_date?: string | null
          original_description?: string | null
          original_subcategory_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurrence_pattern?: string | null
          recurring_transaction_id?: string | null
          review_status?: string | null
          source?: string
          source_ref_id?: string | null
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_description?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          budget_month?: string | null
          card_charge_type?:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          cash_date?: string | null
          category_id?: string
          check_number?: string | null
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          credit_card_id?: string | null
          date?: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          event_date?: string
          expense_nature?: Database["public"]["Enums"]["expense_nature"] | null
          expense_nature_source?:
            | Database["public"]["Enums"]["expense_nature_source"]
            | null
          family_id?: string
          goal_id?: string | null
          id?: string
          import_id?: string | null
          import_source?: string | null
          installment_group_id?: string | null
          installment_index?: number | null
          installments_total?: number | null
          is_auto_generated?: boolean
          is_recurrent?: boolean | null
          is_recurring?: boolean
          last_edited_at?: string | null
          last_edited_by_user_id?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          original_category_id?: string | null
          original_date?: string | null
          original_description?: string | null
          original_subcategory_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurrence_pattern?: string | null
          recurring_transaction_id?: string | null
          review_status?: string | null
          source?: string
          source_ref_id?: string | null
          subcategory_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_group_id_fkey"
            columns: ["installment_group_id"]
            isOneToOne: false
            referencedRelation: "installment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_status_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          ip_address: string | null
          reason: string | null
          status: Database["public"]["Enums"]["user_account_status"]
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["user_account_status"]
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["user_account_status"]
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          archived_at: string | null
          archived_by_user_id: string | null
          color: string | null
          created_at: string
          created_by_user_id: string | null
          display_order: number | null
          family_id: string
          icon_key: string
          id: string
          name: string
          replaced_by_category_id: string | null
          source: string
          status: string
          transaction_count: number | null
          type: string
        }
        Insert: {
          archived_at?: string | null
          archived_by_user_id?: string | null
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          display_order?: number | null
          family_id: string
          icon_key: string
          id?: string
          name: string
          replaced_by_category_id?: string | null
          source?: string
          status?: string
          transaction_count?: number | null
          type: string
        }
        Update: {
          archived_at?: string | null
          archived_by_user_id?: string | null
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          display_order?: number | null
          family_id?: string
          icon_key?: string
          id?: string
          name?: string
          replaced_by_category_id?: string | null
          source?: string
          status?: string
          transaction_count?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_replaced_by_category_id_fkey"
            columns: ["replaced_by_category_id"]
            isOneToOne: false
            referencedRelation: "user_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          ai_budget_generated_at: string | null
          contextual_hints_enabled: boolean
          created_at: string
          education_tips_enabled: boolean
          family_id: string
          has_seen_welcome: boolean
          id: string
          onboarding_wizard_completed_at: string | null
          progress_percent: number
          status: Database["public"]["Enums"]["onboarding_status"]
          step_account_created_at: string | null
          step_bank_account_at: string | null
          step_budget_at: string | null
          step_family_invite_at: string | null
          step_goal_at: string | null
          step_import_at: string | null
          suggested_budget_generated_at: string | null
          updated_at: string
          user_id: string
          welcome_seen_at: string | null
        }
        Insert: {
          ai_budget_generated_at?: string | null
          contextual_hints_enabled?: boolean
          created_at?: string
          education_tips_enabled?: boolean
          family_id: string
          has_seen_welcome?: boolean
          id?: string
          onboarding_wizard_completed_at?: string | null
          progress_percent?: number
          status?: Database["public"]["Enums"]["onboarding_status"]
          step_account_created_at?: string | null
          step_bank_account_at?: string | null
          step_budget_at?: string | null
          step_family_invite_at?: string | null
          step_goal_at?: string | null
          step_import_at?: string | null
          suggested_budget_generated_at?: string | null
          updated_at?: string
          user_id: string
          welcome_seen_at?: string | null
        }
        Update: {
          ai_budget_generated_at?: string | null
          contextual_hints_enabled?: boolean
          created_at?: string
          education_tips_enabled?: boolean
          family_id?: string
          has_seen_welcome?: boolean
          id?: string
          onboarding_wizard_completed_at?: string | null
          progress_percent?: number
          status?: Database["public"]["Enums"]["onboarding_status"]
          step_account_created_at?: string | null
          step_bank_account_at?: string | null
          step_budget_at?: string | null
          step_family_invite_at?: string | null
          step_goal_at?: string | null
          step_import_at?: string | null
          suggested_budget_generated_at?: string | null
          updated_at?: string
          user_id?: string
          welcome_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_settings: {
        Row: {
          created_at: string
          id: string
          must_change_password: boolean
          password_changed_at: string | null
          temp_password_created_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          password_changed_at?: string | null
          temp_password_created_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          password_changed_at?: string | null
          temp_password_created_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_status_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          ip_address: string | null
          new_status: Database["public"]["Enums"]["user_account_status"]
          old_status: Database["public"]["Enums"]["user_account_status"] | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          ip_address?: string | null
          new_status: Database["public"]["Enums"]["user_account_status"]
          old_status?: Database["public"]["Enums"]["user_account_status"] | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          ip_address?: string | null
          new_status?: Database["public"]["Enums"]["user_account_status"]
          old_status?: Database["public"]["Enums"]["user_account_status"] | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subcategories: {
        Row: {
          archived_at: string | null
          archived_by_user_id: string | null
          category_id: string
          created_at: string
          created_by_user_id: string | null
          display_order: number | null
          family_id: string
          id: string
          name: string
          replaced_by_subcategory_id: string | null
          status: string
          transaction_count: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by_user_id?: string | null
          category_id: string
          created_at?: string
          created_by_user_id?: string | null
          display_order?: number | null
          family_id: string
          id?: string
          name: string
          replaced_by_subcategory_id?: string | null
          status?: string
          transaction_count?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by_user_id?: string | null
          category_id?: string
          created_at?: string
          created_by_user_id?: string | null
          display_order?: number | null
          family_id?: string
          id?: string
          name?: string
          replaced_by_subcategory_id?: string | null
          status?: string
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subcategories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subcategories_replaced_by_subcategory_id_fkey"
            columns: ["replaced_by_subcategory_id"]
            isOneToOne: false
            referencedRelation: "user_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          family_id: string
          id: string
          notes: string | null
          payment_method: string | null
          plan_id: string
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          family_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          family_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      audit_logs_safe: {
        Row: {
          action: string | null
          actor_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          family_id: string | null
          id: string | null
          metadata_safe: Json | null
          module: string | null
          severity: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string | null
          metadata_safe?: never
          module?: string | null
          severity?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string | null
          metadata_safe?: never
          module?: string | null
          severity?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_family_invite: {
        Args: {
          invite_token: string
          p_birth_date?: string
          p_display_name: string
          p_phone_country?: string
          p_phone_e164?: string
          p_profession?: string
        }
        Returns: {
          error_message: string
          family_id: string
          member_id: string
          success: boolean
        }[]
      }
      admin_reset_user_password: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      auto_reveal_expired_privacy: { Args: never; Returns: undefined }
      bulk_reclassify_transactions: {
        Args: {
          p_family_id: string
          p_new_category_id: string
          p_new_subcategory_id?: string
          p_old_category_id: string
          p_old_subcategory_id?: string
          p_performed_by?: string
        }
        Returns: number
      }
      calculate_cs_signals: { Args: { _family_id: string }; Returns: Json }
      calculate_onboarding_progress: {
        Args: {
          onboarding_row: Database["public"]["Tables"]["user_onboarding"]["Row"]
        }
        Returns: number
      }
      can_change_admin_role: {
        Args: {
          _caller_id: string
          _new_role: Database["public"]["Enums"]["admin_role"]
          _target_id: string
        }
        Returns: boolean
      }
      can_manage_admins: { Args: { _user_id: string }; Returns: boolean }
      change_user_account_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["user_account_status"]
          _reason?: string
          _user_id: string
        }
        Returns: boolean
      }
      check_member_permission: {
        Args: { _family_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_lgpd_codes: { Args: never; Returns: undefined }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      create_family_invite: {
        Args: {
          p_family_id: string
          p_invited_email?: string
          p_permissions?: Json
          p_role?: string
        }
        Returns: {
          error_message: string
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      create_planned_installments: {
        Args: { p_group_id: string; p_start_index?: number }
        Returns: undefined
      }
      expire_old_imports: { Args: never; Returns: undefined }
      get_active_budget_for_month: {
        Args: { p_family_id: string; p_month: string }
        Returns: string
      }
      get_admin_role: { Args: { _user_id: string }; Returns: string }
      get_category_transaction_count: {
        Args: { p_category_id: string; p_family_id: string }
        Returns: number
      }
      get_engagement_metrics_report: { Args: never; Returns: Json }
      get_executive_metrics: {
        Args: { _period_end?: string; _period_start?: string }
        Returns: Json
      }
      get_growth_metrics: { Args: { _months?: number }; Returns: Json }
      get_learned_categorization: {
        Args: {
          p_family_id: string
          p_fingerprint_strong: string
          p_fingerprint_weak: string
          p_user_id: string
        }
        Returns: {
          category_id: string
          confidence: number
          examples_count: number
          fingerprint_matched: Database["public"]["Enums"]["fingerprint_type"]
          merchant_canon: string
          source_scope: Database["public"]["Enums"]["learning_scope"]
          subcategory_id: string
        }[]
      }
      get_member_permissions: {
        Args: { _family_id: string; _user_id: string }
        Returns: Json
      }
      get_product_stability_metrics: { Args: never; Returns: Json }
      get_revenue_metrics: { Args: { _months?: number }; Returns: Json }
      get_user_access_profile: { Args: { _user_id: string }; Returns: Json }
      get_user_account_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_account_status"]
      }
      get_user_families: {
        Args: { _user_id: string }
        Returns: {
          family_id: string
          family_name: string
          is_owner: boolean
          last_active_at: string
          member_role: string
          members_count: number
        }[]
      }
      get_user_family_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_breakglass: {
        Args: { _family_id?: string; _scope: string; _user_id: string }
        Returns: boolean
      }
      has_admin_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | { Args: { p_roles: string[] }; Returns: boolean }
      has_any_admin: { Args: never; Returns: boolean }
      has_cs_access: { Args: { _user_id: string }; Returns: boolean }
      has_cs_access_scoped: { Args: { p_family_id: string }; Returns: boolean }
      has_executive_access: { Args: { _user_id: string }; Returns: boolean }
      has_financial_access: { Args: { _user_id: string }; Returns: boolean }
      has_legal_access: { Args: { _user_id: string }; Returns: boolean }
      has_pending_lgpd_request: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_support_access: { Args: { _user_id: string }; Returns: boolean }
      has_tech_access: { Args: { _user_id: string }; Returns: boolean }
      hash_identifier: { Args: { identifier: string }; Returns: string }
      is_admin_master: { Args: { _user_id: string }; Returns: boolean }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_family_member: { Args: { f_id: string }; Returns: boolean }
      is_family_owner: { Args: { p_family_id: string }; Returns: boolean }
      is_family_owner_or_manager: {
        Args: { p_family_id: string }
        Returns: boolean
      }
      is_openfinance_connection_member: {
        Args: { p_connection_id: string }
        Returns: boolean
      }
      is_transaction_private_for_user: {
        Args: { _transaction_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      log_admin_login: {
        Args: { _blocked_reason?: string; _success: boolean }
        Returns: undefined
      }
      log_dashboard_access: {
        Args: {
          _actor_id: string
          _actor_role: string
          _event_type: string
          _family_id?: string
          _ip_address?: string
          _metadata?: Json
          _target_user_id?: string
        }
        Returns: string
      }
      mark_password_changed: { Args: { _user_id: string }; Returns: boolean }
      reconcile_installment: {
        Args: { p_planned_id: string; p_transaction_id: string }
        Returns: boolean
      }
      record_categorization_feedback: {
        Args: {
          p_apply_scope?: Database["public"]["Enums"]["learning_scope"]
          p_apply_to_future?: boolean
          p_family_id: string
          p_fingerprint_strong: string
          p_fingerprint_weak: string
          p_normalized_descriptor: string
          p_predicted_category_id: string
          p_predicted_confidence: number
          p_predicted_source: Database["public"]["Enums"]["prediction_source"]
          p_predicted_subcategory_id: string
          p_raw_descriptor: string
          p_transaction_id: string
          p_user_category_id: string
          p_user_id: string
          p_user_subcategory_id: string
        }
        Returns: Json
      }
      restore_family_member: {
        Args: { _member_id: string; _restored_by: string }
        Returns: boolean
      }
      soft_delete_family_member: {
        Args: { _member_id: string; _reason?: string; _removed_by: string }
        Returns: boolean
      }
      switch_active_family: {
        Args: { _to_family_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_family: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      user_must_change_password: {
        Args: { _user_id: string }
        Returns: boolean
      }
      user_shares_family_with: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      validate_invite_token: {
        Args: { invite_token: string }
        Returns: {
          error_message: string
          family_id: string
          family_name: string
          invite_id: string
          invited_email: string
          inviter_name: string
          is_valid: boolean
          permissions: Json
          role: string
        }[]
      }
    }
    Enums: {
      admin_role: "CS" | "ADMIN" | "LEGAL" | "MASTER"
      app_role:
        | "user"
        | "admin"
        | "cs"
        | "admin_master"
        | "financeiro"
        | "tecnologia"
        | "suporte"
        | "customer_success"
        | "diretoria"
        | "gestao_estrategica"
        | "legal"
      bank_account_type: "checking" | "savings" | "digital" | "salary"
      budget_version_source_type: "onboarding_only" | "transactions_based"
      budget_version_status: "draft" | "active" | "archived"
      card_brand: "visa" | "mastercard" | "elo" | "amex" | "hipercard"
      card_charge_type: "ONE_SHOT" | "INSTALLMENT" | "RECURRENT"
      card_type: "credit" | "debit" | "both"
      confidence_level: "HIGH" | "MEDIUM" | "LOW"
      expense_nature: "FIXED" | "VARIABLE" | "EVENTUAL" | "UNKNOWN"
      expense_nature_source: "USER" | "SYSTEM_RULE" | "AI_INFERENCE"
      family_role: "owner" | "member"
      fingerprint_type: "strong" | "weak"
      import_file_type: "ofx" | "xls" | "xlsx" | "pdf"
      import_status: "pending" | "processing" | "completed" | "failed"
      installment_status: "POSTED" | "PLANNED" | "RECONCILED" | "CANCELLED"
      integration_provider:
        | "OPEN_FINANCE"
        | "ACQUIRER"
        | "RESEND"
        | "ENOTAS"
        | "GOOGLE_DRIVE"
        | "ONEDRIVE"
        | "LOVABLE_AI"
        | "OPENSTREETMAP"
      integration_status: "ACTIVE" | "INACTIVE" | "PENDING" | "ERROR"
      learning_scope: "user" | "family" | "global"
      lgpd_request_status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
      member_status: "INVITED" | "ACTIVE" | "REMOVED" | "DISABLED" | "BLOCKED"
      onboarding_status: "not_started" | "in_progress" | "completed"
      payment_method:
        | "cash"
        | "debit"
        | "credit"
        | "pix"
        | "transfer"
        | "cheque"
      prediction_source: "learned" | "regex" | "heuristic" | "fallback"
      transaction_classification:
        | "income"
        | "expense"
        | "transfer"
        | "reimbursement"
        | "adjustment"
      transaction_direction: "credit" | "debit"
      transaction_type: "income" | "expense"
      user_account_status: "ACTIVE" | "DISABLED" | "BLOCKED"
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
      admin_role: ["CS", "ADMIN", "LEGAL", "MASTER"],
      app_role: [
        "user",
        "admin",
        "cs",
        "admin_master",
        "financeiro",
        "tecnologia",
        "suporte",
        "customer_success",
        "diretoria",
        "gestao_estrategica",
        "legal",
      ],
      bank_account_type: ["checking", "savings", "digital", "salary"],
      budget_version_source_type: ["onboarding_only", "transactions_based"],
      budget_version_status: ["draft", "active", "archived"],
      card_brand: ["visa", "mastercard", "elo", "amex", "hipercard"],
      card_charge_type: ["ONE_SHOT", "INSTALLMENT", "RECURRENT"],
      card_type: ["credit", "debit", "both"],
      confidence_level: ["HIGH", "MEDIUM", "LOW"],
      expense_nature: ["FIXED", "VARIABLE", "EVENTUAL", "UNKNOWN"],
      expense_nature_source: ["USER", "SYSTEM_RULE", "AI_INFERENCE"],
      family_role: ["owner", "member"],
      fingerprint_type: ["strong", "weak"],
      import_file_type: ["ofx", "xls", "xlsx", "pdf"],
      import_status: ["pending", "processing", "completed", "failed"],
      installment_status: ["POSTED", "PLANNED", "RECONCILED", "CANCELLED"],
      integration_provider: [
        "OPEN_FINANCE",
        "ACQUIRER",
        "RESEND",
        "ENOTAS",
        "GOOGLE_DRIVE",
        "ONEDRIVE",
        "LOVABLE_AI",
        "OPENSTREETMAP",
      ],
      integration_status: ["ACTIVE", "INACTIVE", "PENDING", "ERROR"],
      learning_scope: ["user", "family", "global"],
      lgpd_request_status: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
      member_status: ["INVITED", "ACTIVE", "REMOVED", "DISABLED", "BLOCKED"],
      onboarding_status: ["not_started", "in_progress", "completed"],
      payment_method: ["cash", "debit", "credit", "pix", "transfer", "cheque"],
      prediction_source: ["learned", "regex", "heuristic", "fallback"],
      transaction_classification: [
        "income",
        "expense",
        "transfer",
        "reimbursement",
        "adjustment",
      ],
      transaction_direction: ["credit", "debit"],
      transaction_type: ["income", "expense"],
      user_account_status: ["ACTIVE", "DISABLED", "BLOCKED"],
    },
  },
} as const
