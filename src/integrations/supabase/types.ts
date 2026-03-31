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
      account_stats_history: {
        Row: {
          connections: number
          created_at: string
          followers: number
          id: string
          snapshot_date: string
          user_id: string
        }
        Insert: {
          connections?: number
          created_at?: string
          followers?: number
          id?: string
          snapshot_date?: string
          user_id: string
        }
        Update: {
          connections?: number
          created_at?: string
          followers?: number
          id?: string
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_engagement_config: {
        Row: {
          auto_dm: boolean
          auto_like: boolean
          auto_reply: boolean
          created_at: string
          dm_template: string | null
          id: string
          reply_prompt: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_dm?: boolean
          auto_like?: boolean
          auto_reply?: boolean
          created_at?: string
          dm_template?: string | null
          id?: string
          reply_prompt?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_dm?: boolean
          auto_like?: boolean
          auto_reply?: boolean
          created_at?: string
          dm_template?: string | null
          id?: string
          reply_prompt?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      auto_engagement_logs: {
        Row: {
          action_type: string
          author_linkedin_url: string | null
          author_name: string | null
          comment_id: string | null
          content_sent: string | null
          created_at: string
          error_message: string | null
          id: string
          post_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          author_linkedin_url?: string | null
          author_name?: string | null
          comment_id?: string | null
          content_sent?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          post_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          author_linkedin_url?: string | null
          author_name?: string | null
          comment_id?: string | null
          content_sent?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          post_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_engagement_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "suggested_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_config: {
        Row: {
          active_days: string[]
          approval_mode: string
          created_at: string
          enabled: boolean
          id: string
          industries_to_watch: string[]
          last_run_at: string | null
          posting_hours: number[]
          posts_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_days?: string[]
          approval_mode?: string
          created_at?: string
          enabled?: boolean
          id?: string
          industries_to_watch?: string[]
          last_run_at?: string | null
          posting_hours?: number[]
          posts_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_days?: string[]
          approval_mode?: string
          created_at?: string
          enabled?: boolean
          id?: string
          industries_to_watch?: string[]
          last_run_at?: string | null
          posting_hours?: number[]
          posts_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          created_at: string
          id: string
          idea_text: string
          image_url: string | null
          used: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          idea_text: string
          image_url?: string | null
          used?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          idea_text?: string
          image_url?: string | null
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      content_strategy: {
        Row: {
          created_at: string
          id: string
          strategy_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          strategy_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          strategy_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          id: string
          impressions_count: number | null
          likes_count: number
          media_type: string | null
          media_urls: Json | null
          post_url: string | null
          posted_at: string | null
          profile_id: string
          shares_count: number
          unipile_post_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          impressions_count?: number | null
          likes_count?: number
          media_type?: string | null
          media_urls?: Json | null
          post_url?: string | null
          posted_at?: string | null
          profile_id: string
          shares_count?: number
          unipile_post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          impressions_count?: number | null
          likes_count?: number
          media_type?: string | null
          media_urls?: Json | null
          post_url?: string | null
          posted_at?: string | null
          profile_id?: string
          shares_count?: number
          unipile_post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "tracked_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_dm_rules: {
        Row: {
          created_at: string | null
          dm_message: string
          id: string
          is_active: boolean | null
          post_id: string | null
          resource_url: string | null
          trigger_keyword: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dm_message: string
          id?: string
          is_active?: boolean | null
          post_id?: string | null
          resource_url?: string | null
          trigger_keyword: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dm_message?: string
          id?: string
          is_active?: boolean | null
          post_id?: string | null
          resource_url?: string | null
          trigger_keyword?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_dm_rules_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "suggested_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_interactions: {
        Row: {
          author_avatar_url: string | null
          author_linkedin_url: string | null
          author_name: string | null
          comment_text: string | null
          created_at: string
          id: string
          interaction_type: string
          post_id: string
          unipile_comment_id: string | null
          user_id: string | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_linkedin_url?: string | null
          author_name?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          post_id: string
          unipile_comment_id?: string | null
          user_id?: string | null
        }
        Update: {
          author_avatar_url?: string | null
          author_linkedin_url?: string | null
          author_name?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          post_id?: string
          unipile_comment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggested_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_performance: Json | null
          published_at: string | null
          scheduled_at: string | null
          source_analysis_id: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string | null
          virality_score: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_performance?: Json | null
          published_at?: string | null
          scheduled_at?: string | null
          source_analysis_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
          virality_score?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_performance?: Json | null
          published_at?: string | null
          scheduled_at?: string | null
          source_analysis_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
          virality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suggested_posts_source_analysis_id_fkey"
            columns: ["source_analysis_id"]
            isOneToOne: false
            referencedRelation: "virality_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_profiles: {
        Row: {
          analysis_summary: Json | null
          avatar_url: string | null
          created_at: string
          headline: string | null
          id: string
          last_analyzed_at: string | null
          linkedin_url: string
          name: string
          unipile_account_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_summary?: Json | null
          avatar_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          last_analyzed_at?: string | null
          linkedin_url: string
          name: string
          unipile_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_summary?: Json | null
          avatar_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          last_analyzed_at?: string | null
          linkedin_url?: string
          name?: string
          unipile_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trend_insights: {
        Row: {
          created_at: string
          id: string
          source: string | null
          summary: string | null
          topic: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string | null
          summary?: string | null
          topic: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string | null
          summary?: string | null
          topic?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          achievements: string | null
          additional_notes: string | null
          ambitions: string | null
          audience_pain_points: string | null
          brand_keywords: string[] | null
          call_to_action_style: string | null
          company: string | null
          competitors: string | null
          content_pillars: string[] | null
          content_themes: string[] | null
          content_types: string[] | null
          created_at: string
          differentiators: string | null
          expertise_areas: string | null
          full_name: string | null
          goal_timeline: string | null
          id: string
          industry: string | null
          key_results: string | null
          linkedin_goals: string | null
          offers_description: string | null
          personal_story: string | null
          posting_frequency: string | null
          preferred_formats: string | null
          profession: string | null
          target_audience: string | null
          target_connections: number | null
          target_engagement_rate: number | null
          target_followers: number | null
          tone_of_voice: string | null
          unique_methodology: string | null
          updated_at: string
          user_id: string | null
          values: string | null
          writing_instructions: string | null
        }
        Insert: {
          achievements?: string | null
          additional_notes?: string | null
          ambitions?: string | null
          audience_pain_points?: string | null
          brand_keywords?: string[] | null
          call_to_action_style?: string | null
          company?: string | null
          competitors?: string | null
          content_pillars?: string[] | null
          content_themes?: string[] | null
          content_types?: string[] | null
          created_at?: string
          differentiators?: string | null
          expertise_areas?: string | null
          full_name?: string | null
          goal_timeline?: string | null
          id?: string
          industry?: string | null
          key_results?: string | null
          linkedin_goals?: string | null
          offers_description?: string | null
          personal_story?: string | null
          posting_frequency?: string | null
          preferred_formats?: string | null
          profession?: string | null
          target_audience?: string | null
          target_connections?: number | null
          target_engagement_rate?: number | null
          target_followers?: number | null
          tone_of_voice?: string | null
          unique_methodology?: string | null
          updated_at?: string
          user_id?: string | null
          values?: string | null
          writing_instructions?: string | null
        }
        Update: {
          achievements?: string | null
          additional_notes?: string | null
          ambitions?: string | null
          audience_pain_points?: string | null
          brand_keywords?: string[] | null
          call_to_action_style?: string | null
          company?: string | null
          competitors?: string | null
          content_pillars?: string[] | null
          content_themes?: string[] | null
          content_types?: string[] | null
          created_at?: string
          differentiators?: string | null
          expertise_areas?: string | null
          full_name?: string | null
          goal_timeline?: string | null
          id?: string
          industry?: string | null
          key_results?: string | null
          linkedin_goals?: string | null
          offers_description?: string | null
          personal_story?: string | null
          posting_frequency?: string | null
          preferred_formats?: string | null
          profession?: string | null
          target_audience?: string | null
          target_connections?: number | null
          target_engagement_rate?: number | null
          target_followers?: number | null
          tone_of_voice?: string | null
          unique_methodology?: string | null
          updated_at?: string
          user_id?: string | null
          values?: string | null
          writing_instructions?: string | null
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      virality_analyses: {
        Row: {
          analysis_json: Json
          created_at: string
          id: string
          profile_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          analysis_json?: Json
          created_at?: string
          id?: string
          profile_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          analysis_json?: Json
          created_at?: string
          id?: string
          profile_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virality_analyses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "tracked_profiles"
            referencedColumns: ["id"]
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
