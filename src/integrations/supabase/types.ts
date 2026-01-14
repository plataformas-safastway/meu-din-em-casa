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
      emergency_funds: {
        Row: {
          created_at: string
          current_amount: number
          family_id: string
          id: string
          target_amount: number
          target_months: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          family_id: string
          id?: string
          target_amount?: number
          target_months?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          family_id?: string
          id?: string
          target_amount?: number
          target_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_funds_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          income_range: string | null
          members_count: number
          name: string
          primary_objective: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          income_range?: string | null
          members_count?: number
          name: string
          primary_objective?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          display_name: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
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
      import_history: {
        Row: {
          created_at: string
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
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string
          created_at: string
          credit_card_id: string | null
          date: string
          description: string | null
          family_id: string
          id: string
          import_id: string | null
          is_recurring: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          subcategory_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id: string
          created_at?: string
          credit_card_id?: string | null
          date: string
          description?: string | null
          family_id: string
          id?: string
          import_id?: string | null
          is_recurring?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string | null
          family_id?: string
          id?: string
          import_id?: string | null
          is_recurring?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_family_id: { Args: never; Returns: string }
      is_family_member: { Args: { f_id: string }; Returns: boolean }
      is_family_owner: { Args: { f_id: string }; Returns: boolean }
    }
    Enums: {
      bank_account_type: "checking" | "savings" | "digital" | "salary"
      card_brand: "visa" | "mastercard" | "elo" | "amex" | "hipercard"
      card_type: "credit" | "debit" | "both"
      family_role: "owner" | "member"
      import_file_type: "ofx" | "xls" | "xlsx" | "pdf"
      import_status: "pending" | "processing" | "completed" | "failed"
      payment_method: "cash" | "debit" | "credit" | "pix" | "transfer"
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
      bank_account_type: ["checking", "savings", "digital", "salary"],
      card_brand: ["visa", "mastercard", "elo", "amex", "hipercard"],
      card_type: ["credit", "debit", "both"],
      family_role: ["owner", "member"],
      import_file_type: ["ofx", "xls", "xlsx", "pdf"],
      import_status: ["pending", "processing", "completed", "failed"],
      payment_method: ["cash", "debit", "credit", "pix", "transfer"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
