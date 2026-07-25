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
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_rating_count: number | null
          hours: Json | null
          id: string
          lat: number | null
          lng: number | null
          owner_name: string | null
          phone: string
          rating_count: number
          specialties: string[]
          updated_at: string
          user_id: string
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
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          phone: string
          rating_count?: number
          specialties?: string[]
          updated_at?: string
          user_id: string
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
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          phone?: string
          rating_count?: number
          specialties?: string[]
          updated_at?: string
          user_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number
          following_count: number
          id: string
          onboarding_completed: boolean
          post_count: number
          reputation: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id: string
          onboarding_completed?: boolean
          post_count?: number
          reputation?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id?: string
          onboarding_completed?: boolean
          post_count?: number
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
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          like_count: number
          parent_comment_id: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          avatar_url: string | null
          brand: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          founder_id: string
          id: string
          is_paid: boolean
          member_count: number
          model: string | null
          name: string
          price_amount: number | null
          price_currency: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brand?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          founder_id: string
          id?: string
          is_paid?: boolean
          member_count?: number
          model?: string | null
          name: string
          price_amount?: number | null
          price_currency?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brand?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          founder_id?: string
          id?: string
          is_paid?: boolean
          member_count?: number
          model?: string | null
          name?: string
          price_amount?: number | null
          price_currency?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          join_message: string | null
          payment_status: string
          responded_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          join_message?: string | null
          payment_status?: string
          responded_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          join_message?: string | null
          payment_status?: string
          responded_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          body: string
          community_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          community_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          is_solution: boolean
          like_count: number
          parent_reply_id: string | null
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_solution?: boolean
          like_count?: number
          parent_reply_id?: string | null
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_solution?: boolean
          like_count?: number
          parent_reply_id?: string | null
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          body: string
          category_id: string | null
          community_id: string | null
          created_at: string
          id: string
          like_count: number
          pinned: boolean
          reply_count: number
          save_count: number
          status: string
          title: string
          updated_at: string
          user_id: string
          vehicle_brand: string | null
          vehicle_model: string | null
          view_count: number
        }
        Insert: {
          body: string
          category_id?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          like_count?: number
          pinned?: boolean
          reply_count?: number
          save_count?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          view_count?: number
        }
        Update: {
          body?: string
          category_id?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          like_count?: number
          pinned?: boolean
          reply_count?: number
          save_count?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
          user_id?: string
        }
        Relationships: []
      }
      mechanic_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          mechanic_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          mechanic_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
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
      posts: {
        Row: {
          caption: string | null
          comment_count: number
          created_at: string
          id: string
          like_count: number
          live_ended_at: string | null
          live_started_at: string | null
          live_title: string | null
          media_urls: string[]
          save_count: number
          tag: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          live_ended_at?: string | null
          live_started_at?: string | null
          live_title?: string | null
          media_urls?: string[]
          save_count?: number
          tag?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          live_ended_at?: string | null
          live_started_at?: string | null
          live_title?: string | null
          media_urls?: string[]
          save_count?: number
          tag?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          community_id: string | null
          created_at: string
          details: string | null
          escalated: boolean
          handled_by: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          details?: string | null
          escalated?: boolean
          handled_by?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          details?: string | null
          escalated?: boolean
          handled_by?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
          user_id?: string
        }
        Relationships: []
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
      increment_thread_view: {
        Args: { _thread_id: string }
        Returns: undefined
      }
      is_active_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      mark_member_paid: {
        Args: { _member_id: string }
        Returns: undefined
      }
      mark_reply_solution: {
        Args: { _reply_id: string; _solved: boolean }
        Returns: undefined
      }
      remove_community_member: {
        Args: { _ban?: boolean; _member_id: string }
        Returns: undefined
      }
      request_join_community: {
        Args: { _community_id: string; _message?: string | null }
        Returns: {
          community_id: string
          created_at: string
          id: string
          join_message: string | null
          payment_status: string
          responded_at: string | null
          role: string
          status: string
          user_id: string
        }
      }
      respond_join_request: {
        Args: { _approve: boolean; _member_id: string }
        Returns: undefined
      }
      set_community_member_role: {
        Args: { _member_id: string; _role: string }
        Returns: undefined
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
      engagement_target: "post" | "forum_thread" | "forum_reply" | "comment"
      fuel_type: "gasoline" | "diesel" | "lpg" | "hybrid" | "electric" | "other"
      post_type: "text" | "image" | "video" | "live"
      report_reason:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "nudity"
        | "misinformation"
        | "scam"
        | "illegal"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      report_target:
        | "post"
        | "forum_thread"
        | "forum_reply"
        | "comment"
        | "community"
        | "community_message"
        | "mechanic"
        | "user"
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
      engagement_target: ["post", "forum_thread", "forum_reply", "comment"],
      fuel_type: ["gasoline", "diesel", "lpg", "hybrid", "electric", "other"],
      post_type: ["text", "image", "video", "live"],
      report_reason: [
        "spam",
        "harassment",
        "hate_speech",
        "nudity",
        "misinformation",
        "scam",
        "illegal",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      report_target: [
        "post",
        "forum_thread",
        "forum_reply",
        "comment",
        "community",
        "community_message",
        "mechanic",
        "user",
      ],
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
