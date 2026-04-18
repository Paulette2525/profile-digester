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
          dm_delay_seconds: number
          dm_template: string | null
          id: string
          like_delay_seconds: number
          reply_delay_seconds: number
          reply_prompt: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_dm?: boolean
          auto_like?: boolean
          auto_reply?: boolean
          created_at?: string
          dm_delay_seconds?: number
          dm_template?: string | null
          id?: string
          like_delay_seconds?: number
          reply_delay_seconds?: number
          reply_prompt?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_dm?: boolean
          auto_like?: boolean
          auto_reply?: boolean
          created_at?: string
          dm_delay_seconds?: number
          dm_template?: string | null
          id?: string
          like_delay_seconds?: number
          reply_delay_seconds?: number
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
          auto_visuals: boolean
          content_mix: Json
          created_at: string
          daily_content_plan: Json
          enabled: boolean
          id: string
          industries_to_watch: string[]
          last_run_at: string | null
          posting_hours: number[]
          posts_per_day: number
          run_progress: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_days?: string[]
          approval_mode?: string
          auto_visuals?: boolean
          content_mix?: Json
          created_at?: string
          daily_content_plan?: Json
          enabled?: boolean
          id?: string
          industries_to_watch?: string[]
          last_run_at?: string | null
          posting_hours?: number[]
          posts_per_day?: number
          run_progress?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_days?: string[]
          approval_mode?: string
          auto_visuals?: boolean
          content_mix?: Json
          created_at?: string
          daily_content_plan?: Json
          enabled?: boolean
          id?: string
          industries_to_watch?: string[]
          last_run_at?: string | null
          posting_hours?: number[]
          posts_per_day?: number
          run_progress?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          content_type: string | null
          created_at: string
          id: string
          idea_text: string
          image_url: string | null
          resource_url: string | null
          used: boolean
          user_id: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          id?: string
          idea_text: string
          image_url?: string | null
          resource_url?: string | null
          used?: boolean
          user_id?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          id?: string
          idea_text?: string
          image_url?: string | null
          resource_url?: string | null
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
      engaged_config: {
        Row: {
          check_frequency_minutes: number
          comment_prompt: string
          created_at: string
          daily_comment_limit: number
          delay_between_actions_seconds: number
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_frequency_minutes?: number
          comment_prompt?: string
          created_at?: string
          daily_comment_limit?: number
          delay_between_actions_seconds?: number
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_frequency_minutes?: number
          comment_prompt?: string
          created_at?: string
          daily_comment_limit?: number
          delay_between_actions_seconds?: number
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      engaged_interactions: {
        Row: {
          action_type: string
          comment_text: string | null
          created_at: string
          engaged_profile_id: string
          error_message: string | null
          id: string
          linkedin_post_id: string
          post_content_preview: string | null
          post_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          comment_text?: string | null
          created_at?: string
          engaged_profile_id: string
          error_message?: string | null
          id?: string
          linkedin_post_id: string
          post_content_preview?: string | null
          post_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          comment_text?: string | null
          created_at?: string
          engaged_profile_id?: string
          error_message?: string | null
          id?: string
          linkedin_post_id?: string
          post_content_preview?: string | null
          post_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engaged_interactions_engaged_profile_id_fkey"
            columns: ["engaged_profile_id"]
            isOneToOne: false
            referencedRelation: "engaged_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engaged_profiles: {
        Row: {
          auto_comment: boolean
          auto_like: boolean
          avatar_url: string | null
          comment_tone: string
          created_at: string
          headline: string | null
          id: string
          is_active: boolean
          last_checked_at: string | null
          linkedin_url: string
          name: string
          unipile_provider_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_comment?: boolean
          auto_like?: boolean
          avatar_url?: string | null
          comment_tone?: string
          created_at?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          linkedin_url: string
          name: string
          unipile_provider_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_comment?: boolean
          auto_like?: boolean
          avatar_url?: string | null
          comment_tone?: string
          created_at?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          linkedin_url?: string
          name?: string
          unipile_provider_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_forms: {
        Row: {
          created_at: string
          description: string | null
          fields_config: Json
          form_slug: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields_config?: Json
          form_slug: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields_config?: Json
          form_slug?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          data: Json
          email: string | null
          form_id: string | null
          id: string
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          form_id?: string | null
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          form_id?: string | null
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
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
      prospection_autopilot_config: {
        Row: {
          commenters_enabled: boolean
          commenters_exclude_keywords: string | null
          commenters_filter_headline: string | null
          commenters_min_likes: number | null
          companies_enabled: boolean
          companies_industry_filter: string | null
          companies_location: string | null
          companies_size_max: number | null
          companies_size_min: number | null
          company_keywords: string | null
          conversation_guidelines: string | null
          created_at: string
          daily_contact_limit: number
          delay_between_messages: number
          id: string
          last_run_at: string | null
          message_template: string | null
          offer_description: string | null
          post_ids: string[]
          profiles_company_size: string | null
          profiles_enabled: boolean
          profiles_industry: string | null
          profiles_location: string | null
          profiles_title_filter: string | null
          search_query: string | null
          sequence_steps: Json
          updated_at: string
          user_id: string
          warmup_delay_hours: number
          warmup_enabled: boolean
        }
        Insert: {
          commenters_enabled?: boolean
          commenters_exclude_keywords?: string | null
          commenters_filter_headline?: string | null
          commenters_min_likes?: number | null
          companies_enabled?: boolean
          companies_industry_filter?: string | null
          companies_location?: string | null
          companies_size_max?: number | null
          companies_size_min?: number | null
          company_keywords?: string | null
          conversation_guidelines?: string | null
          created_at?: string
          daily_contact_limit?: number
          delay_between_messages?: number
          id?: string
          last_run_at?: string | null
          message_template?: string | null
          offer_description?: string | null
          post_ids?: string[]
          profiles_company_size?: string | null
          profiles_enabled?: boolean
          profiles_industry?: string | null
          profiles_location?: string | null
          profiles_title_filter?: string | null
          search_query?: string | null
          sequence_steps?: Json
          updated_at?: string
          user_id: string
          warmup_delay_hours?: number
          warmup_enabled?: boolean
        }
        Update: {
          commenters_enabled?: boolean
          commenters_exclude_keywords?: string | null
          commenters_filter_headline?: string | null
          commenters_min_likes?: number | null
          companies_enabled?: boolean
          companies_industry_filter?: string | null
          companies_location?: string | null
          companies_size_max?: number | null
          companies_size_min?: number | null
          company_keywords?: string | null
          conversation_guidelines?: string | null
          created_at?: string
          daily_contact_limit?: number
          delay_between_messages?: number
          id?: string
          last_run_at?: string | null
          message_template?: string | null
          offer_description?: string | null
          post_ids?: string[]
          profiles_company_size?: string | null
          profiles_enabled?: boolean
          profiles_industry?: string | null
          profiles_location?: string | null
          profiles_title_filter?: string | null
          search_query?: string | null
          sequence_steps?: Json
          updated_at?: string
          user_id?: string
          warmup_delay_hours?: number
          warmup_enabled?: boolean
        }
        Relationships: []
      }
      prospection_campaigns: {
        Row: {
          accepted_count: number
          created_at: string
          id: string
          message_template: string
          name: string
          reply_count: number
          sent_count: number
          status: string
          total_prospects: number
          updated_at: string
          user_id: string
          warmup_delay_hours: number
          warmup_enabled: boolean
        }
        Insert: {
          accepted_count?: number
          created_at?: string
          id?: string
          message_template: string
          name: string
          reply_count?: number
          sent_count?: number
          status?: string
          total_prospects?: number
          updated_at?: string
          user_id: string
          warmup_delay_hours?: number
          warmup_enabled?: boolean
        }
        Update: {
          accepted_count?: number
          created_at?: string
          id?: string
          message_template?: string
          name?: string
          reply_count?: number
          sent_count?: number
          status?: string
          total_prospects?: number
          updated_at?: string
          user_id?: string
          warmup_delay_hours?: number
          warmup_enabled?: boolean
        }
        Relationships: []
      }
      prospection_messages: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          message_sent: string | null
          next_followup_at: string | null
          prospect_avatar_url: string | null
          prospect_headline: string | null
          prospect_linkedin_url: string | null
          prospect_name: string | null
          replied_at: string | null
          sent_at: string | null
          status: string
          step_order: number
          user_id: string
          warmup_status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          message_sent?: string | null
          next_followup_at?: string | null
          prospect_avatar_url?: string | null
          prospect_headline?: string | null
          prospect_linkedin_url?: string | null
          prospect_name?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          step_order?: number
          user_id: string
          warmup_status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          message_sent?: string | null
          next_followup_at?: string | null
          prospect_avatar_url?: string | null
          prospect_headline?: string | null
          prospect_linkedin_url?: string | null
          prospect_name?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          step_order?: number
          user_id?: string
          warmup_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospection_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospection_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      prospection_sequence_steps: {
        Row: {
          campaign_id: string
          created_at: string
          delay_days: number
          id: string
          message_template: string
          step_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delay_days?: number
          id?: string
          message_template: string
          step_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delay_days?: number
          id?: string
          message_template?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "prospection_sequence_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospection_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_performance: Json | null
          post_type: string | null
          published_at: string | null
          scheduled_at: string | null
          source_analysis_id: string | null
          status: string
          topic: string | null
          unipile_post_id: string | null
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
          post_type?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          source_analysis_id?: string | null
          status?: string
          topic?: string | null
          unipile_post_id?: string | null
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
          post_type?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          source_analysis_id?: string | null
          status?: string
          topic?: string | null
          unipile_post_id?: string | null
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
          photo_category: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          photo_category?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          photo_category?: string | null
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
