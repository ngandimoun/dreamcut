export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          email_verified: boolean
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          email_verified?: boolean
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          email_verified?: boolean
          image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          expires_at: string
          token: string
          created_at: string
          updated_at: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          expires_at: string
          token: string
          created_at?: string
          updated_at?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          expires_at?: string
          token?: string
          created_at?: string
          updated_at?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
      }
      accounts: {
        Row: {
          id: string
          account_id: string
          provider_id: string
          user_id: string
          access_token: string | null
          refresh_token: string | null
          id_token: string | null
          access_token_expires_at: string | null
          refresh_token_expires_at: string | null
          scope: string | null
          password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          provider_id: string
          user_id: string
          access_token?: string | null
          refresh_token?: string | null
          id_token?: string | null
          access_token_expires_at?: string | null
          refresh_token_expires_at?: string | null
          scope?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          provider_id?: string
          user_id?: string
          access_token?: string | null
          refresh_token?: string | null
          id_token?: string | null
          access_token_expires_at?: string | null
          refresh_token_expires_at?: string | null
          scope?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      verifications: {
        Row: {
          id: string
          identifier: string
          value: string
          expires_at: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          identifier: string
          value: string
          expires_at: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          identifier?: string
          value?: string
          expires_at?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      waitlist: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
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
  }
}
