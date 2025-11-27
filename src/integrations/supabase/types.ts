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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_activation_log: {
        Row: {
          activated_at: string
          activated_by: string
          activation_reason: string | null
          admin_notes: string | null
          has_referral: boolean | null
          id: string
          referrer_id: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          activated_by: string
          activation_reason?: string | null
          admin_notes?: string | null
          has_referral?: boolean | null
          id?: string
          referrer_id?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string
          activated_by?: string
          activation_reason?: string | null
          admin_notes?: string | null
          has_referral?: boolean | null
          id?: string
          referrer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_activation_log_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_activation_log_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_activation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      aliexpress_orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          exchange_rate: number
          id: string
          processed_at: string | null
          processed_by: string | null
          product_images: Json | null
          product_price: number
          product_url: string
          shipping_cost: number
          status: string
          total_dzd: number
          total_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          exchange_rate: number
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          product_images?: Json | null
          product_price: number
          product_url: string
          shipping_cost: number
          status?: string
          total_dzd: number
          total_usd: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          exchange_rate?: number
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          product_images?: Json | null
          product_price?: number
          product_url?: string
          shipping_cost?: number
          status?: string
          total_dzd?: number
          total_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      betting_accounts: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          platform_id: string
          player_id: string
          promo_code: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          platform_id: string
          player_id: string
          promo_code?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          platform_id?: string
          player_id?: string
          promo_code?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "betting_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "game_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "betting_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      betting_transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          platform_id: string
          player_id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
          withdrawal_code: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          platform_id: string
          player_id: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          user_id: string
          withdrawal_code?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          platform_id?: string
          player_id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          withdrawal_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "betting_transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "game_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "betting_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      card_delivery_orders: {
        Row: {
          address: string
          admin_notes: string | null
          card_amount: number
          created_at: string
          delivery_fee: number
          delivery_notes: string | null
          full_name: string
          id: string
          payment_status: string
          phone: string
          processed_at: string | null
          processed_by: string | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
          wilaya: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          card_amount: number
          created_at?: string
          delivery_fee: number
          delivery_notes?: string | null
          full_name: string
          id?: string
          payment_status?: string
          phone: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          wilaya: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          card_amount?: number
          created_at?: string
          delivery_fee?: number
          delivery_notes?: string | null
          full_name?: string
          id?: string
          payment_status?: string
          phone?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          wilaya?: string
        }
        Relationships: []
      }
      delivery_fee_settings: {
        Row: {
          created_at: string
          default_fee: number
          id: string
          updated_at: string
          wilaya_specific_fees: Json | null
        }
        Insert: {
          created_at?: string
          default_fee?: number
          id?: string
          updated_at?: string
          wilaya_specific_fees?: Json | null
        }
        Update: {
          created_at?: string
          default_fee?: number
          id?: string
          updated_at?: string
          wilaya_specific_fees?: Json | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          receipt_image: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_image?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_image?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diaspora_transfers: {
        Row: {
          admin_notes: string | null
          amount: number
          amount_dzd: number | null
          created_at: string
          exchange_rate: number | null
          id: string
          note: string | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          sender_city: string | null
          sender_country: string
          sender_id: string
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          amount_dzd?: number | null
          created_at?: string
          exchange_rate?: number | null
          id?: string
          note?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          sender_city?: string | null
          sender_country: string
          sender_id: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          amount_dzd?: number | null
          created_at?: string
          exchange_rate?: number | null
          id?: string
          note?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          sender_city?: string | null
          sender_country?: string
          sender_id?: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      digital_card_fee_settings: {
        Row: {
          created_at: string
          fee_type: string
          fee_value: number
          id: string
          max_fee: number | null
          min_fee: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_type?: string
          fee_value?: number
          id?: string
          max_fee?: number | null
          min_fee?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_type?: string
          fee_value?: number
          id?: string
          max_fee?: number | null
          min_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      digital_card_orders: {
        Row: {
          account_id: string
          admin_notes: string | null
          amount: number
          amount_usd: number
          card_code: string | null
          card_details: Json | null
          card_pin: string | null
          card_type_id: string
          created_at: string
          exchange_rate_used: number
          fee_amount: number
          id: string
          price_paid: number
          processed_at: string | null
          processed_by: string | null
          receipt_image: string | null
          status: string
          total_dzd: number
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          admin_notes?: string | null
          amount: number
          amount_usd?: number
          card_code?: string | null
          card_details?: Json | null
          card_pin?: string | null
          card_type_id: string
          created_at?: string
          exchange_rate_used?: number
          fee_amount?: number
          id?: string
          price_paid: number
          processed_at?: string | null
          processed_by?: string | null
          receipt_image?: string | null
          status?: string
          total_dzd?: number
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          amount?: number
          amount_usd?: number
          card_code?: string | null
          card_details?: Json | null
          card_pin?: string | null
          card_type_id?: string
          created_at?: string
          exchange_rate_used?: number
          fee_amount?: number
          id?: string
          price_paid?: number
          processed_at?: string | null
          processed_by?: string | null
          receipt_image?: string | null
          status?: string
          total_dzd?: number
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_card_orders_card_type_id_fkey"
            columns: ["card_type_id"]
            isOneToOne: false
            referencedRelation: "digital_card_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_card_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      digital_card_types: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          description_ar: string | null
          display_order: number
          exchange_rate: number
          id: string
          is_active: boolean
          logo_url: string | null
          max_amount: number
          min_amount: number
          name: string
          name_ar: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name: string
          name_ar: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name?: string
          name_ar?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_ar: string
          platform_id: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          platform_id: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          platform_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_packages_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "game_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_platforms: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          name_ar: string
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          name_ar: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          name_ar?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_topup_orders: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          notes: string | null
          package_id: string
          platform_id: string
          player_id: string
          processed_at: string | null
          processed_by: string | null
          proof_image_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          package_id: string
          platform_id: string
          player_id: string
          processed_at?: string | null
          processed_by?: string | null
          proof_image_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          package_id?: string
          platform_id?: string
          player_id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_image_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_topup_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "game_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_topup_orders_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "game_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          amount: number
          card_code: string
          created_at: string
          generated_by_merchant_id: string | null
          id: string
          is_used: boolean
          merchant_commission: number | null
          merchant_purchase_price: number | null
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          card_code: string
          created_at?: string
          generated_by_merchant_id?: string | null
          id?: string
          is_used?: boolean
          merchant_commission?: number | null
          merchant_purchase_price?: number | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          card_code?: string
          created_at?: string
          generated_by_merchant_id?: string | null
          id?: string
          is_used?: boolean
          merchant_commission?: number | null
          merchant_purchase_price?: number | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_generated_by_merchant_id_fkey"
            columns: ["generated_by_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_requests: {
        Row: {
          address: string
          business_name: string
          business_type: string
          created_at: string
          id: string
          national_id: string
          notes: string | null
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          business_name: string
          business_type: string
          created_at?: string
          id?: string
          national_id: string
          notes?: string | null
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          business_name?: string
          business_type?: string
          created_at?: string
          id?: string
          national_id?: string
          notes?: string | null
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_transactions: {
        Row: {
          amount: number
          commission_amount: number | null
          created_at: string
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          merchant_id: string
          notes: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          commission_amount?: number | null
          created_at?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          merchant_id: string
          notes?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          commission_amount?: number | null
          created_at?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          merchant_id?: string
          notes?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string
          balance: number
          business_name: string
          business_type: string
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          merchant_code: string
          merchant_tier: string
          phone: string
          total_earnings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          balance?: number
          business_name: string
          business_type: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_code: string
          merchant_tier?: string
          phone: string
          total_earnings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          balance?: number
          business_name?: string
          business_type?: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_code?: string
          merchant_tier?: string
          phone?: string
          total_earnings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_ledger: {
        Row: {
          created_at: string
          currency: string | null
          fee_amount: number
          fee_fixed: number | null
          fee_percentage: number | null
          id: string
          original_amount: number
          transaction_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          fee_amount: number
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          original_amount: number
          transaction_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          fee_amount?: number
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          original_amount?: number
          transaction_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          failed_redeem_attempts: number
          full_name: string | null
          id: string
          identity_verification_status: string | null
          is_account_activated: boolean | null
          is_identity_verified: boolean | null
          is_phone_verified: boolean | null
          national_id: string | null
          phone: string | null
          redeem_locked_until: string | null
          referred_by_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_redeem_attempts?: number
          full_name?: string | null
          id?: string
          identity_verification_status?: string | null
          is_account_activated?: boolean | null
          is_identity_verified?: boolean | null
          is_phone_verified?: boolean | null
          national_id?: string | null
          phone?: string | null
          redeem_locked_until?: string | null
          referred_by_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_redeem_attempts?: number
          full_name?: string | null
          id?: string
          identity_verification_status?: string | null
          is_account_activated?: boolean | null
          is_identity_verified?: boolean | null
          is_phone_verified?: boolean | null
          national_id?: string | null
          phone?: string | null
          redeem_locked_until?: string | null
          referred_by_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          operation: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          operation: string
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          operation?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          active_referrals_count: number
          created_at: string
          id: string
          rewards_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_referrals_count?: number
          created_at?: string
          id?: string
          rewards_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_referrals_count?: number
          created_at?: string
          id?: string
          rewards_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_withdrawals: {
        Row: {
          active_referrals_count: number
          amount: number
          created_at: string
          fee_amount: number
          fee_percentage: number
          id: string
          net_amount: number
          status: string
          user_id: string
        }
        Insert: {
          active_referrals_count: number
          amount: number
          created_at?: string
          fee_amount: number
          fee_percentage: number
          id?: string
          net_amount: number
          status?: string
          user_id: string
        }
        Update: {
          active_referrals_count?: number
          amount?: number
          created_at?: string
          fee_amount?: number
          fee_percentage?: number
          id?: string
          net_amount?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      suspicious_referrals: {
        Row: {
          admin_notes: string | null
          duplicate_count: number | null
          duplicate_phone: string | null
          flagged_at: string
          id: string
          referral_id: string
          referred_user_id: string
          referrer_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suspicious_reason: string
        }
        Insert: {
          admin_notes?: string | null
          duplicate_count?: number | null
          duplicate_phone?: string | null
          flagged_at?: string
          id?: string
          referral_id: string
          referred_user_id: string
          referrer_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspicious_reason: string
        }
        Update: {
          admin_notes?: string | null
          duplicate_count?: number | null
          duplicate_phone?: string | null
          flagged_at?: string
          id?: string
          referral_id?: string
          referred_user_id?: string
          referrer_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspicious_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_referrals_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicious_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "suspicious_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "suspicious_referrals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          recipient_id: string
          recipient_phone: string
          sender_id: string
          sender_phone: string
          status: string
          transaction_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_id: string
          recipient_phone: string
          sender_id: string
          sender_phone: string
          status?: string
          transaction_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_id?: string
          recipient_phone?: string
          sender_id?: string
          sender_phone?: string
          status?: string
          transaction_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          id: string
          reward_amount: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          id?: string
          reward_amount?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          id?: string
          reward_amount?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
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
      verification_requests: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          id_back_image: string
          id_front_image: string
          national_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          id_back_image: string
          id_front_image: string
          national_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          id_back_image?: string
          id_front_image?: string
          national_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          cash_location: string | null
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          withdrawal_method: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          cash_location?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          withdrawal_method: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          cash_location?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          withdrawal_method?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_approved_accounts_and_process_referrals: {
        Args: { _admin_id?: string }
        Returns: Json
      }
      admin_activate_account: {
        Args: { _admin_id: string; _admin_notes?: string; _user_id: string }
        Returns: Json
      }
      admin_adjust_balance: {
        Args: { _amount: number; _note?: string; _target_user: string }
        Returns: Json
      }
      admin_delete_user: {
        Args: { _admin_id: string; _target_user_id: string }
        Returns: Json
      }
      approve_betting_deposit: {
        Args: { _admin_notes?: string; _transaction_id: string }
        Returns: Json
      }
      approve_deposit:
        | {
            Args: {
              _adjusted_amount?: number
              _admin_id: string
              _deposit_id: string
              _notes?: string
            }
            Returns: undefined
          }
        | {
            Args: { _admin_id: string; _deposit_id: string; _notes?: string }
            Returns: undefined
          }
      approve_diaspora_transfer: {
        Args: {
          _admin_id: string
          _admin_notes?: string
          _exchange_rate: number
          _received_amount?: number
          _transfer_id: string
        }
        Returns: Json
      }
      approve_digital_card_order:
        | { Args: { _admin_notes?: string; _order_id: string }; Returns: Json }
        | {
            Args: {
              _admin_notes?: string
              _order_id: string
              _receipt_image: string
              _transaction_reference: string
            }
            Returns: Json
          }
      approve_game_topup_order: {
        Args: { _admin_notes?: string; _order_id: string }
        Returns: Json
      }
      approve_merchant_request: {
        Args: {
          _admin_id: string
          _commission_rate?: number
          _request_id: string
        }
        Returns: Json
      }
      approve_verification: { Args: { request_id: string }; Returns: undefined }
      approve_verification_request: {
        Args: { _admin_id: string; _request_id: string }
        Returns: undefined
      }
      approve_withdrawal: {
        Args: { _admin_id: string; _notes?: string; _withdrawal_id: string }
        Returns: undefined
      }
      ban_fraudulent_user: {
        Args: { _admin_id: string; _ban_reason?: string; _user_id: string }
        Returns: Json
      }
      calculate_fee: {
        Args: { _amount: number; _fee_config: Json }
        Returns: Json
      }
      calculate_withdrawal_fee_percentage: {
        Args: { _active_referrals: number }
        Returns: number
      }
      cancel_fraudulent_referral: {
        Args: { _admin_id: string; _admin_notes?: string; _referral_id: string }
        Returns: Json
      }
      check_and_award_achievements: {
        Args: { _user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          _max_count: number
          _operation: string
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      deduct_balance: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      ensure_referral_for_current_user: { Args: never; Returns: Json }
      ensure_user_referral: { Args: { _user_id: string }; Returns: Json }
      flag_suspicious_referrals: { Args: never; Returns: Json }
      generate_merchant_code: { Args: never; Returns: string }
      generate_transfer_transaction_number: { Args: never; Returns: string }
      generate_unique_referral_code: { Args: never; Returns: string }
      get_user_gift_card_redemptions: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          id: string
          used_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merchant_recharge_customer: {
        Args: { _amount: number; _customer_phone: string }
        Returns: Json
      }
      merchant_transfer_from_user_balance: {
        Args: { _amount: number }
        Returns: Json
      }
      process_betting_deposit: {
        Args: { _amount: number; _platform_id: string; _player_id: string }
        Returns: Json
      }
      process_digital_card_order: {
        Args: {
          _account_id: string
          _amount_usd: number
          _card_type_id: string
        }
        Returns: Json
      }
      process_game_topup_order: {
        Args: {
          _amount: number
          _notes?: string
          _package_id: string
          _platform_id: string
          _player_id: string
        }
        Returns: Json
      }
      process_transfer: {
        Args: {
          amount_param: number
          note_param?: string
          recipient_phone_param: string
        }
        Returns: Json
      }
      recalculate_all_balances: { Args: never; Returns: undefined }
      recalculate_user_balance: {
        Args: { _user_id: string }
        Returns: undefined
      }
      record_platform_revenue: {
        Args: {
          _fee_info: Json
          _original_amount: number
          _transaction_id: string
          _transaction_type: string
          _user_id: string
        }
        Returns: undefined
      }
      redeem_gift_card: { Args: { _card_code: string }; Returns: Json }
      reject_betting_deposit: {
        Args: { _admin_notes?: string; _transaction_id: string }
        Returns: Json
      }
      reject_diaspora_transfer: {
        Args: {
          _admin_id: string
          _rejection_reason: string
          _transfer_id: string
        }
        Returns: Json
      }
      reject_digital_card_order: {
        Args: { _admin_notes?: string; _order_id: string }
        Returns: Json
      }
      reject_game_topup_order: {
        Args: { _admin_notes?: string; _order_id: string }
        Returns: Json
      }
      reject_merchant_request: {
        Args: { _admin_id: string; _reason: string; _request_id: string }
        Returns: Json
      }
      reject_verification: {
        Args: { reason: string; request_id: string }
        Returns: undefined
      }
      reject_verification_request: {
        Args: { _admin_id: string; _reason: string; _request_id: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { _admin_id: string; _reason: string; _withdrawal_id: string }
        Returns: undefined
      }
      sync_existing_users_data: { Args: never; Returns: Json }
      sync_referred_by_code_from_auth: { Args: never; Returns: Json }
      validate_luhn_check_digit: {
        Args: { _card_code: string }
        Returns: boolean
      }
      verify_betting_account: {
        Args: { _platform_id: string; _player_id: string; _promo_code: string }
        Returns: Json
      }
      withdraw_referral_rewards: { Args: { _amount: number }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
