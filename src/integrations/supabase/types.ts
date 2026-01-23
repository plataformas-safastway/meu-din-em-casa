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
          new_value: Json | null
          old_value: Json | null
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
          new_value?: Json | null
          old_value?: Json | null
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
          new_value?: Json | null
          old_value?: Json | null
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
      families: {
        Row: {
          created_at: string
          email_report_day: number | null
          email_report_enabled: boolean
          email_report_recipient: string | null
          id: string
          income_range: string | null
          members_count: number
          name: string
          primary_objective: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_report_day?: number | null
          email_report_enabled?: boolean
          email_report_recipient?: string | null
          id?: string
          income_range?: string | null
          members_count?: number
          name: string
          primary_objective?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_report_day?: number | null
          email_report_enabled?: boolean
          email_report_recipient?: string | null
          id?: string
          income_range?: string | null
          members_count?: number
          name?: string
          primary_objective?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          display_name: string
          family_id: string
          id: string
          phone_country: string | null
          phone_e164: string | null
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          display_name: string
          family_id: string
          id?: string
          phone_country?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          phone_country?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["family_role"]
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
      imports: {
        Row: {
          auto_detected: boolean | null
          created_at: string
          created_by: string | null
          detected_bank: string | null
          detected_document_type: string | null
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
          created_at?: string
          created_by?: string | null
          detected_bank?: string | null
          detected_document_type?: string | null
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
          created_at?: string
          created_by?: string | null
          detected_bank?: string | null
          detected_document_type?: string | null
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
      recurring_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string
          created_at: string
          credit_card_id: string | null
          day_of_month: number | null
          description: string
          end_date: string | null
          family_id: string
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          payment_method: string
          start_date: string
          subcategory_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description: string
          end_date?: string | null
          family_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          payment_method?: string
          start_date: string
          subcategory_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          family_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
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
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string
          check_number: string | null
          classification:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at: string
          credit_card_id: string | null
          date: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          family_id: string
          goal_id: string | null
          id: string
          import_id: string | null
          is_auto_generated: boolean
          is_recurring: boolean
          notes: string | null
          original_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recurring_transaction_id: string | null
          review_status: string | null
          source: string | null
          source_ref_id: string | null
          subcategory_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id: string
          check_number?: string | null
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at?: string
          credit_card_id?: string | null
          date: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          family_id: string
          goal_id?: string | null
          id?: string
          import_id?: string | null
          is_auto_generated?: boolean
          is_recurring?: boolean
          notes?: string | null
          original_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurring_transaction_id?: string | null
          review_status?: string | null
          source?: string | null
          source_ref_id?: string | null
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string
          check_number?: string | null
          classification?:
            | Database["public"]["Enums"]["transaction_classification"]
            | null
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string | null
          direction?:
            | Database["public"]["Enums"]["transaction_direction"]
            | null
          family_id?: string
          goal_id?: string | null
          id?: string
          import_id?: string | null
          is_auto_generated?: boolean
          is_recurring?: boolean
          notes?: string | null
          original_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recurring_transaction_id?: string | null
          review_status?: string | null
          source?: string | null
          source_ref_id?: string | null
          subcategory_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
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
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_imports: { Args: never; Returns: undefined }
      get_user_family_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_family_member: { Args: { f_id: string }; Returns: boolean }
      is_family_owner: { Args: { f_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "cs"
      bank_account_type: "checking" | "savings" | "digital" | "salary"
      card_brand: "visa" | "mastercard" | "elo" | "amex" | "hipercard"
      card_type: "credit" | "debit" | "both"
      family_role: "owner" | "member"
      import_file_type: "ofx" | "xls" | "xlsx" | "pdf"
      import_status: "pending" | "processing" | "completed" | "failed"
      payment_method:
        | "cash"
        | "debit"
        | "credit"
        | "pix"
        | "transfer"
        | "cheque"
      transaction_classification:
        | "income"
        | "expense"
        | "transfer"
        | "reimbursement"
        | "adjustment"
      transaction_direction: "credit" | "debit"
      transaction_type: "income" | "expense"
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
      app_role: ["user", "admin", "cs"],
      bank_account_type: ["checking", "savings", "digital", "salary"],
      card_brand: ["visa", "mastercard", "elo", "amex", "hipercard"],
      card_type: ["credit", "debit", "both"],
      family_role: ["owner", "member"],
      import_file_type: ["ofx", "xls", "xlsx", "pdf"],
      import_status: ["pending", "processing", "completed", "failed"],
      payment_method: ["cash", "debit", "credit", "pix", "transfer", "cheque"],
      transaction_classification: [
        "income",
        "expense",
        "transfer",
        "reimbursement",
        "adjustment",
      ],
      transaction_direction: ["credit", "debit"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
