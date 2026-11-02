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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      construction_blocks: {
        Row: {
          block_id: string
          block_name: string
          project_id: string | null
        }
        Insert: {
          block_id?: string
          block_name: string
          project_id?: string | null
        }
        Update: {
          block_id?: string
          block_name?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      corporate_users: {
        Row: {
          email: string | null
          full_name: string
          role_level: string
          user_id: string
        }
        Insert: {
          email?: string | null
          full_name: string
          role_level: string
          user_id?: string
        }
        Update: {
          email?: string | null
          full_name?: string
          role_level?: string
          user_id?: string
        }
        Relationships: []
      }
      material_catalog: {
        Row: {
          base_cost_eur: number
          category: string
          consumption_metric: string | null
          consumption_rate: number | null
          item_id: string
          item_name_en: string
          item_name_tr: string
          unit_of_measure: string
        }
        Insert: {
          base_cost_eur: number
          category: string
          consumption_metric?: string | null
          consumption_rate?: number | null
          item_id: string
          item_name_en: string
          item_name_tr: string
          unit_of_measure: string
        }
        Update: {
          base_cost_eur?: number
          category?: string
          consumption_metric?: string | null
          consumption_rate?: number | null
          item_id?: string
          item_name_en?: string
          item_name_tr?: string
          unit_of_measure?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          project_id: string
          project_name: string
        }
        Insert: {
          project_id?: string
          project_name: string
        }
        Update: {
          project_id?: string
          project_name?: string
        }
        Relationships: []
      }
      purchase_requisitions: {
        Row: {
          approval_tier: number
          architectural_volume: number
          block_id: string | null
          created_at: string
          estimated_total_eur: number | null
          material_id: string | null
          predicted_quantity: number
          requested_by: string | null
          requested_quantity: number
          status: string | null
          ticket_id: string
          updated_at: string
          variance_justification: string | null
        }
        Insert: {
          approval_tier: number
          architectural_volume: number
          block_id?: string | null
          created_at?: string
          estimated_total_eur?: number | null
          material_id?: string | null
          predicted_quantity: number
          requested_by?: string | null
          requested_quantity: number
          status?: string | null
          ticket_id?: string
          updated_at?: string
          variance_justification?: string | null
        }
        Update: {
          approval_tier?: number
          architectural_volume?: number
          block_id?: string | null
          created_at?: string
          estimated_total_eur?: number | null
          material_id?: string | null
          predicted_quantity?: number
          requested_by?: string | null
          requested_quantity?: number
          status?: string | null
          ticket_id?: string
          updated_at?: string
          variance_justification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "construction_blocks"
            referencedColumns: ["block_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "corporate_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      requisition_approvals: {
        Row: {
          approval_id: string
          approval_notes: string | null
          approved_at: string
          approver_id: string | null
          ticket_id: string | null
          tier_level: number
        }
        Insert: {
          approval_id?: string
          approval_notes?: string | null
          approved_at?: string
          approver_id?: string | null
          ticket_id?: string | null
          tier_level: number
        }
        Update: {
          approval_id?: string
          approval_notes?: string | null
          approved_at?: string
          approver_id?: string | null
          ticket_id?: string | null
          tier_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisition_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "corporate_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisition_approvals_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
