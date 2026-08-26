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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ad_requests: {
        Row: {
          ad_type: string
          admin_note: string | null
          advertiser_id: string
          budget_try: number
          business_name: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          cta_label: string
          description: string
          duration_days: number
          ends_at: string | null
          id: string
          image_url: string | null
          starts_at: string | null
          status: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          ad_type: string
          admin_note?: string | null
          advertiser_id: string
          budget_try?: number
          business_name: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          cta_label?: string
          description: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          status?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          ad_type?: string
          admin_note?: string | null
          advertiser_id?: string
          budget_try?: number
          business_name?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          cta_label?: string
          description?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          status?: string
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          agent?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          last_seen_at: string
          platform: string | null
          push_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string
          platform?: string | null
          push_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string
          platform?: string | null
          push_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fact_checks: {
        Row: {
          created_at: string
          id: string
          input_text: string
          input_url: string | null
          passed: boolean
          score: number
          target_type: string
          user_id: string
          vehicle_id: string | null
          verdict: Json
        }
        Insert: {
          created_at?: string
          id?: string
          input_text: string
          input_url?: string | null
          passed: boolean
          score: number
          target_type: string
          user_id: string
          vehicle_id?: string | null
          verdict: Json
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string
          input_url?: string | null
          passed?: boolean
          score?: number
          target_type?: string
          user_id?: string
          vehicle_id?: string | null
          verdict?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fact_checks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_avatar: string
          author_name: string
          content: string
          created_at: string
          id: string
          like_count: number
          post_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar?: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          like_count?: number
          post_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          post_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_avatar: string
          author_name: string
          body: string
          comment_count: number
          created_at: string
          id: string
          like_count: number
          media_type: string | null
          media_url: string | null
          source: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar?: string
          author_name?: string
          body: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          source?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar?: string
          author_name?: string
          body?: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          source?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          height: number | null
          id: string
          mime_type: string | null
          public_url: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
          vehicle_id: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
          vehicle_id?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
          vehicle_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          brand: string | null
          content: string
          created_at: string
          embedding: string | null
          engine_code: string | null
          id: string
          model: string | null
          source: string
          title: string | null
          url: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          brand?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          engine_code?: string | null
          id?: string
          model?: string | null
          source: string
          title?: string | null
          url?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          brand?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          engine_code?: string | null
          id?: string
          model?: string | null
          source?: string
          title?: string | null
          url?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: []
      }
      mechanic_reviews: {
        Row: {
          author_avatar: string | null
          author_name: string
          comment: string | null
          created_at: string
          id: string
          mechanic_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          mechanic_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          mechanic_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_scrape_log: {
        Row: {
          cell_key: string
          id: string
          lat: number
          lng: number
          radius_km: number
          result_count: number
          scraped_at: string
          specialties: string[]
        }
        Insert: {
          cell_key: string
          id?: string
          lat: number
          lng: number
          radius_km: number
          result_count?: number
          scraped_at?: string
          specialties?: string[]
        }
        Update: {
          cell_key?: string
          id?: string
          lat?: number
          lng?: number
          radius_km?: number
          result_count?: number
          scraped_at?: string
          specialties?: string[]
        }
        Relationships: []
      }
      mechanics: {
        Row: {
          active: boolean
          address: string
          avg_rating: number
          bio: string | null
          brands: string[]
          business_name: string
          city: string
          created_at: string
          district: string | null
          email: string | null
          external_id: string | null
          hours: Json | null
          id: string
          lat: number | null
          lng: number | null
          owner_name: string | null
          phone: string
          rating_count: number
          source: string
          specialties: string[]
          updated_at: string
          user_id: string | null
          verified: boolean
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address: string
          avg_rating?: number
          bio?: string | null
          brands?: string[]
          business_name: string
          city: string
          created_at?: string
          district?: string | null
          email?: string | null
          external_id?: string | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          phone: string
          rating_count?: number
          source?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string
          avg_rating?: number
          bio?: string | null
          brands?: string[]
          business_name?: string
          city?: string
          created_at?: string
          district?: string | null
          email?: string | null
          external_id?: string | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          phone?: string
          rating_count?: number
          source?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
          role: string
          user_id: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role: string
          user_id: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_ratings: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          rater_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          rater_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          rater_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_ratings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed: boolean
          rating_count: number
          reputation: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed?: boolean
          rating_count?: number
          reputation?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          rating_count?: number
          reputation?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          conversation_id: string | null
          created_at: string
          diagnosis_snapshot: string | null
          id: string
          issue_summary: string
          mechanic_id: string
          preferred_contact: string
          status: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          diagnosis_snapshot?: string | null
          id?: string
          issue_summary: string
          mechanic_id: string
          preferred_contact?: string
          status?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          diagnosis_snapshot?: string | null
          id?: string
          issue_summary?: string
          mechanic_id?: string
          preferred_contact?: string
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_responses: {
        Row: {
          created_at: string
          currency: string
          eta_days: number | null
          id: string
          mechanic_id: string
          message: string
          parts_included: boolean
          price_max: number | null
          price_min: number | null
          request_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          eta_days?: number | null
          id?: string
          mechanic_id: string
          message: string
          parts_included?: boolean
          price_max?: number | null
          price_min?: number | null
          request_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          eta_days?: number | null
          id?: string
          mechanic_id?: string
          message?: string
          parts_included?: boolean
          price_max?: number | null
          price_min?: number | null
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_responses_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_vehicles: {
        Row: {
          brand: string
          created_at: string
          id: string
          model: string
          note: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          model: string
          note?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          model?: string
          note?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          author_avatar: string
          author_name: string
          caption: string | null
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          like_count: number
          media_type: string
          media_url: string
          source: string
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar?: string
          author_name?: string
          caption?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          like_count?: number
          media_type: string
          media_url: string
          source?: string
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar?: string
          author_name?: string
          caption?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          like_count?: number
          media_type?: string
          media_url?: string
          source?: string
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          engine_cc: number | null
          engine_code: string | null
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          is_active: boolean
          mileage_km: number | null
          model: string
          nickname: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          engine_cc?: number | null
          engine_code?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          is_active?: boolean
          mileage_km?: number | null
          model: string
          nickname?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          engine_cc?: number | null
          engine_code?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          is_active?: boolean
          mileage_km?: number | null
          model?: string
          nickname?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          diagnosis_snapshot: string | null
          id: string
          mechanic_id: string
          message: string
          phone: string
          specialties: string[]
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          diagnosis_snapshot?: string | null
          id?: string
          mechanic_id: string
          message: string
          phone: string
          specialties?: string[]
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          diagnosis_snapshot?: string | null
          id?: string
          mechanic_id?: string
          message?: string
          phone?: string
          specialties?: string[]
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          filter_brand?: string
          filter_model?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          brand: string
          content: string
          id: string
          model: string
          similarity: number
          source: string
          title: string
          url: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "expert" | "user" | "mechanic"
      fuel_type: "gasoline" | "diesel" | "lpg" | "hybrid" | "electric" | "other"
      transmission_type:
        | "manual"
        | "automatic"
        | "semi_automatic"
        | "cvt"
        | "dct"
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
      app_role: ["admin", "moderator", "expert", "user", "mechanic"],
      fuel_type: ["gasoline", "diesel", "lpg", "hybrid", "electric", "other"],
      transmission_type: [
        "manual",
        "automatic",
        "semi_automatic",
        "cvt",
        "dct",
      ],
    },
  },
} as const
