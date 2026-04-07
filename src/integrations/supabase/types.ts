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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          actor_id: string
          actor_name: string
          change_detail: Json | null
          created_at: string
          expense_snapshot: Json | null
          group_id: string
          id: string
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_name: string
          change_detail?: Json | null
          created_at?: string
          expense_snapshot?: Json | null
          group_id: string
          id?: string
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_name?: string
          change_detail?: Json | null
          created_at?: string
          expense_snapshot?: Json | null
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          is_settled: boolean
          member_name: string
          settled_at: string | null
          share_amount: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          is_settled?: boolean
          member_name: string
          settled_at?: string | null
          share_amount: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          is_settled?: boolean
          member_name?: string
          settled_at?: string | null
          share_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          date: string
          description: string
          expense_type: string
          group_id: string
          id: string
          is_settled: boolean
          paid_by_name: string
          paid_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          date?: string
          description: string
          expense_type?: string
          group_id: string
          id?: string
          is_settled?: boolean
          paid_by_name: string
          paid_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          expense_type?: string
          group_id?: string
          id?: string
          is_settled?: boolean
          paid_by_name?: string
          paid_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          avatar_color: string | null
          avatar_index: number | null
          group_id: string
          id: string
          is_placeholder: boolean
          joined_at: string
          left_at: string | null
          name: string
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_index?: number | null
          group_id: string
          id?: string
          is_placeholder?: boolean
          joined_at?: string
          left_at?: string | null
          name: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_index?: number | null
          group_id?: string
          id?: string
          is_placeholder?: boolean
          joined_at?: string
          left_at?: string | null
          name?: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          banner_gradient: string
          created_at: string
          created_by: string
          deleted_at: string | null
          emoji: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          banner_gradient?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          emoji?: string
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          banner_gradient?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          emoji?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_match_dismissals: {
        Row: {
          dismissed_at: string
          dismissed_by: string
          expense_id_1: string
          expense_id_2: string
          group_id: string
          id: string
        }
        Insert: {
          dismissed_at?: string
          dismissed_by: string
          expense_id_1: string
          expense_id_2: string
          group_id: string
          id?: string
        }
        Update: {
          dismissed_at?: string
          dismissed_by?: string
          expense_id_1?: string
          expense_id_2?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_match_dismissals_expense_id_1_fkey"
            columns: ["expense_id_1"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_match_dismissals_expense_id_2_fkey"
            columns: ["expense_id_2"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_match_dismissals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_placeholder_member: {
        Args: {
          p_avatar_color: string
          p_avatar_index: number
          p_group_id: string
          p_name: string
        }
        Returns: Json
      }
      claim_placeholder:
        | { Args: { p_placeholder_id: string }; Returns: string }
        | {
            Args: { p_invite_code?: string; p_placeholder_id: string }
            Returns: string
          }
      create_expense_with_splits: {
        Args: {
          p_amount: number
          p_description: string
          p_expense_type?: string
          p_group_id: string
          p_paid_by_name: string
          p_paid_by_user_id: string
          p_splits: Json
        }
        Returns: Json
      }
      create_group_with_creator: {
        Args: {
          p_avatar_color: string
          p_avatar_index: number
          p_display_name: string
          p_emoji: string
          p_invite_code: string
          p_name: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_expense: {
        Args: { p_actor_name: string; p_expense_id: string }
        Returns: Json
      }
      edit_expense:
        | {
            Args: {
              p_actor_name: string
              p_amount: number
              p_description: string
              p_expense_id: string
              p_splits: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_actor_name: string
              p_amount: number
              p_description: string
              p_expense_id: string
              p_expense_type?: string
              p_splits: Json
            }
            Returns: Json
          }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_group_splits: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          expense_id: string
          id: string
          is_settled: boolean
          member_name: string
          settled_at: string | null
          share_amount: number
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "expense_splits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_placeholders_for_join: {
        Args: { p_group_id: string }
        Returns: {
          id: string
          name: string
          total_expenses: number
        }[]
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      join_group:
        | {
            Args: {
              p_avatar_color: string
              p_avatar_index: number
              p_display_name: string
              p_group_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_avatar_color: string
              p_avatar_index: number
              p_display_name: string
              p_group_id: string
              p_invite_code?: string
            }
            Returns: Json
          }
      log_member_joined: {
        Args: { p_actor_name: string; p_group_id: string }
        Returns: undefined
      }
      lookup_group_by_invite: {
        Args: { p_invite_code: string }
        Returns: {
          banner_gradient: string
          emoji: string
          id: string
          name: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      regenerate_invite_code: { Args: { p_group_id: string }; Returns: Json }
      settle_all: { Args: { p_expense_id: string }; Returns: Json }
      settle_member_and_remove: {
        Args: { p_group_id: string; p_member_id: string }
        Returns: Json
      }
      settle_member_share: {
        Args: { p_expense_id: string; p_split_id: string }
        Returns: Json
      }
      settle_my_share: { Args: { p_expense_id: string }; Returns: Json }
      transfer_group_ownership: {
        Args: { p_group_id: string; p_new_owner_id: string }
        Returns: Json
      }
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
