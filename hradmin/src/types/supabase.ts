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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      application_logs: {
        Row: {
          application_id: number
          changed_at: string | null
          changed_by: number
          comment: string | null
          log_id: number
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          application_id: number
          changed_at?: string | null
          changed_by: number
          comment?: string | null
          log_id?: number
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          application_id?: number
          changed_at?: string | null
          changed_by?: number
          comment?: string | null
          log_id?: number
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "application_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      applications: {
        Row: {
          application_id: number
          application_number: string
          created_at: string | null
          current_rank_at_time: string
          cycle_id: number
          faculty_id: number
          final_score: number | null
          hr_comment: string | null
          hr_reviewed_at: string | null
          hr_reviewed_by: number | null
          hr_score: number | null
          published_at: string | null
          status: string | null
          submitted_at: string | null
          target_position_id: number
          vpaa_comment: string | null
          vpaa_reviewed_at: string | null
          vpaa_reviewed_by: number | null
          vpaa_score: number | null
        }
        Insert: {
          application_id?: number
          application_number: string
          created_at?: string | null
          current_rank_at_time: string
          cycle_id: number
          faculty_id: number
          final_score?: number | null
          hr_comment?: string | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: number | null
          hr_score?: number | null
          published_at?: string | null
          status?: string | null
          submitted_at?: string | null
          target_position_id: number
          vpaa_comment?: string | null
          vpaa_reviewed_at?: string | null
          vpaa_reviewed_by?: number | null
          vpaa_score?: number | null
        }
        Update: {
          application_id?: number
          application_number?: string
          created_at?: string | null
          current_rank_at_time?: string
          cycle_id?: number
          faculty_id?: number
          final_score?: number | null
          hr_comment?: string | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: number | null
          hr_score?: number | null
          published_at?: string | null
          status?: string | null
          submitted_at?: string | null
          target_position_id?: number
          vpaa_comment?: string | null
          vpaa_reviewed_at?: string | null
          vpaa_reviewed_by?: number | null
          vpaa_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "ranking_cycles"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "applications_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "applications_hr_reviewed_by_fkey"
            columns: ["hr_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "applications_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "applications_vpaa_reviewed_by_fkey"
            columns: ["vpaa_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      area_submissions: {
        Row: {
          application_id: number
          area_id: number
          csv_total_average_rate: number | null
          file_path: string | null
          hr_points: number | null
          part_id: string | null
          submission_id: number
          user_id: number | null
          cycle_id: number | null
          uploaded_at: string | null
          vpaa_points: number | null
        }
        Insert: {
          application_id: number
          area_id: number
          csv_total_average_rate?: number | null
          file_path?: string | null
          hr_points?: number | null
          part_id?: string | null
          submission_id?: number
          user_id?: number | null
          cycle_id?: number | null
          uploaded_at?: string | null
          vpaa_points?: number | null
        }
        Update: {
          application_id?: number
          area_id?: number
          csv_total_average_rate?: number | null
          file_path?: string | null
          hr_points?: number | null
          part_id?: string | null
          submission_id?: number
          user_id?: number | null
          cycle_id?: number | null
          uploaded_at?: string | null
          vpaa_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "area_submissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "area_submissions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
        ]
      }
      area_submission_criterion_scores: {
        Row: {
          application_id: number
          area_id: number
          criterion_key: string
          criterion_label: string
          criterion_max_points: number
          capped_score: number | null
          criterion_title: string | null
          notes: string | null
          part_id: string | null
          excess_score: number | null
          reviewed_at: string | null
          reviewed_by: number | null
          score: number
          score_id: number
          submission_id: number
        }
        Insert: {
          application_id: number
          area_id: number
          criterion_key: string
          criterion_label: string
          criterion_max_points?: number
          capped_score?: number | null
          criterion_title?: string | null
          notes?: string | null
          part_id?: string | null
          excess_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: number | null
          score?: number
          score_id?: number
          submission_id: number
        }
        Update: {
          application_id?: number
          area_id?: number
          criterion_key?: string
          criterion_label?: string
          criterion_max_points?: number
          capped_score?: number | null
          criterion_title?: string | null
          notes?: string | null
          part_id?: string | null
          excess_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: number | null
          score?: number
          score_id?: number
          submission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "area_submission_criterion_scores_application_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "area_submission_criterion_scores_area_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "area_submission_criterion_scores_submission_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "area_submissions"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "area_submission_criterion_scores_participant_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      areas: {
        Row: {
          area_id: number
          area_name: string
          description: string | null
          max_possible_points: number | null
        }
        Insert: {
          area_id?: number
          area_name: string
          description?: string | null
          max_possible_points?: number | null
        }
        Update: {
          area_id?: number
          area_name?: string
          description?: string | null
          max_possible_points?: number | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          department_code: string | null
          department_id: number
          department_name: string
        }
        Insert: {
          department_code?: string | null
          department_id?: number
          department_name: string
        }
        Update: {
          department_code?: string | null
          department_id?: number
          department_name?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          description: string | null
          is_active: boolean | null
          position_id: number
          position_name: string
          required_area_count: number | null
        }
        Insert: {
          description?: string | null
          is_active?: boolean | null
          position_id?: number
          position_name: string
          required_area_count?: number | null
        }
        Update: {
          description?: string | null
          is_active?: boolean | null
          position_id?: number
          position_name?: string
          required_area_count?: number | null
        }
        Relationships: []
      }
      ranking_cycles: {
        Row: {
          created_at: string | null
          created_by: number | null
          cycle_id: number
          deadline: string | null
          semester: string | null
          start_date: string | null
          status: string | null
          title: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: number | null
          cycle_id?: number
          deadline?: string | null
          semester?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: number | null
          cycle_id?: number
          deadline?: string | null
          semester?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          applying_for: string | null
          created_at: string | null
          current_rank: string | null
          current_salary: number | null
          date_of_last_promotion: string | null
          department_id: number | null
          domain_email: string
          educational_attainment: string | null
          eligibility_exams: string | null
          industry_experience_years: number | null
          is_first_login: boolean | null
          name_first: string
          name_last: string
          name_middle: string | null
          nature_of_appointment: string | null
          password_hash: string
          role: string
          status: string | null
          teaching_experience_years: number | null
          user_id: number
        }
        Insert: {
          applying_for?: string | null
          created_at?: string | null
          current_rank?: string | null
          current_salary?: number | null
          date_of_last_promotion?: string | null
          department_id?: number | null
          domain_email: string
          educational_attainment?: string | null
          eligibility_exams?: string | null
          industry_experience_years?: number | null
          is_first_login?: boolean | null
          name_first: string
          name_last: string
          name_middle?: string | null
          nature_of_appointment?: string | null
          password_hash: string
          role: string
          status?: string | null
          teaching_experience_years?: number | null
          user_id?: number
        }
        Update: {
          applying_for?: string | null
          created_at?: string | null
          current_rank?: string | null
          current_salary?: number | null
          date_of_last_promotion?: string | null
          department_id?: number | null
          domain_email?: string
          educational_attainment?: string | null
          eligibility_exams?: string | null
          industry_experience_years?: number | null
          is_first_login?: boolean | null
          name_first?: string
          name_last?: string
          name_middle?: string | null
          nature_of_appointment?: string | null
          password_hash?: string
          role?: string
          status?: string | null
          teaching_experience_years?: number | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_id"]
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
