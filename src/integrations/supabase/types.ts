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
      audit_logs: {
        Row: {
          action: string
          activity_type: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          performed_at: string
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          activity_type: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          company_code: string
          created_at: string | null
          email: string | null
          id: string
          manager_name: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_code: string
          created_at?: string | null
          email?: string | null
          id?: string
          manager_name?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_categories: {
        Row: {
          created_at: string | null
          created_by: number | null
          description: string | null
          id: number
          name: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: number | null
          description?: string | null
          id?: number
          name: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: number | null
          description?: string | null
          id?: number
          name?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          bill_number: string
          created_at: string | null
          customer_phone: string
          discount_amount: number | null
          discount_type: string
          discount_value: number
          id: string
          member_id: string | null
          redeemed_at: string
          redeemed_by: number
        }
        Insert: {
          bill_number: string
          created_at?: string | null
          customer_phone: string
          discount_amount?: number | null
          discount_type: string
          discount_value: number
          id?: string
          member_id?: string | null
          redeemed_at?: string
          redeemed_by: number
        }
        Update: {
          bill_number?: string
          created_at?: string | null
          customer_phone?: string
          discount_amount?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          member_id?: string | null
          redeemed_at?: string
          redeemed_by?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          category_id: number | null
          company_id: string | null
          created_at: string | null
          date_of_birth: string | null
          deactivation_note: string | null
          designation: string | null
          discount_amount: number | null
          discount_enabled: boolean | null
          discount_percentage: number | null
          discount_policy: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          last_name: string
          member_code: string | null
          mobile: string
          registered_date: string | null
          renew_date: string | null
          selected_offers: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category_id?: number | null
          company_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deactivation_note?: string | null
          designation?: string | null
          discount_amount?: number | null
          discount_enabled?: boolean | null
          discount_percentage?: number | null
          discount_policy?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          last_name: string
          member_code?: string | null
          mobile: string
          registered_date?: string | null
          renew_date?: string | null
          selected_offers?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category_id?: number | null
          company_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deactivation_note?: string | null
          designation?: string | null
          discount_amount?: number | null
          discount_enabled?: boolean | null
          discount_percentage?: number | null
          discount_policy?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          last_name?: string
          member_code?: string | null
          mobile?: string
          registered_date?: string | null
          renew_date?: string | null
          selected_offers?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          offer_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          offer_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_categories_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_redemptions: {
        Row: {
          bill_number: string | null
          customer_phone: string
          id: string
          offer_id: string | null
          reactivated_at: string | null
          reactivated_by: string | null
          redeemed_at: string | null
          redeemed_by: number
          status: string
        }
        Insert: {
          bill_number?: string | null
          customer_phone: string
          id?: string
          offer_id?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          redeemed_at?: string | null
          redeemed_by: number
          status?: string
        }
        Update: {
          bill_number?: string | null
          customer_phone?: string
          id?: string
          offer_id?: string | null
          reactivated_at?: string | null
          reactivated_by?: string | null
          redeemed_at?: string | null
          redeemed_by?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_id: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          is_recurrent: boolean | null
          max_discount_amount: number | null
          min_bill_value: number | null
          name: string
          updated_at: string | null
          usage_limit: number | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_recurrent?: boolean | null
          max_discount_amount?: number | null
          min_bill_value?: number | null
          name: string
          updated_at?: string | null
          usage_limit?: number | null
          valid_from: string
          valid_to: string
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_recurrent?: boolean | null
          max_discount_amount?: number | null
          min_bill_value?: number | null
          name?: string
          updated_at?: string | null
          usage_limit?: number | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_number_views: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          viewed_at: string
          viewer_info: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          viewed_at?: string
          viewer_info?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          viewed_at?: string
          viewer_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_number_views_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_member_code: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
