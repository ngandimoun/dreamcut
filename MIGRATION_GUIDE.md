# OpenCut to DreamCut Migration Guide

## 🎯 What We've Accomplished

Your OpenCut project has been successfully migrated to use **Supabase** as the backend! Here's what's been set up:

### ✅ Database Migration
- **Supabase Database**: All tables (users, sessions, accounts, verifications, waitlist) have been created
- **Schema**: Migrated from local PostgreSQL to Supabase with proper RLS policies
- **Connection**: Updated database configuration to use Supabase connection string

### ✅ Authentication System
- **Supabase Auth**: Replaced better-auth with Supabase Auth
- **Google OAuth**: Implemented Google Sign-In/Sign-Up
- **Components**: Created new auth components:
  - `LoginWithGoogleButton`
  - `SignUpWithGoogleButton` 
  - `UserProfile`
  - `useSupabaseAuth` hook

### ✅ Storage Setup
- **Storage Buckets**: Created buckets for images, videos, audio, and documents
- **Security**: Implemented Row Level Security (RLS) policies
- **Utilities**: Created storage upload/download functions

### ✅ Code Updates
- **Login/Signup Pages**: Updated to use Supabase authentication
- **Header**: Added user profile and authentication status
- **Middleware**: Added route protection for authenticated routes
- **Environment**: Updated configuration for Supabase

## 🚀 Next Steps

### 1. Create Environment File
Create `apps/web/.env.local` with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database URL (you'll need to get this from Supabase)
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Google OAuth (configure in Google Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 2. Get Database Connection String
1. Go to your Supabase project dashboard
2. Navigate to **Settings > Database**
3. Copy the connection string and replace `your-password` with your actual database password

### 3. Test the Migration
1. Start your development server: `bun dev`
2. Visit `/api/test-supabase` to verify connections
3. Try signing in with Google at `/login`

### 4. Clean Up Old Code (Optional)
Once everything is working, you can remove:
- `packages/auth/` directory
- Old auth hooks (`useLogin`, `useSignUp`)
- Better-auth dependencies from `package.json`

## 🔧 Configuration

### Google OAuth Setup
Your Google OAuth is already configured in Supabase. The redirect URL should be:
```
https://your-project-ref.supabase.co/auth/v1/callback
```