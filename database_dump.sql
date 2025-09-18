-- Database dump for AutoFlow backend
-- Generated from migrate-railway.js

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "github_id" text,
  "avatar" text,
  "access_token" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_username_unique" UNIQUE("username"),
  CONSTRAINT "users_email_unique" UNIQUE("email"),
  CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);

-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "repository_url" text NOT NULL,
  "repository_name" text NOT NULL,
  "branch" text DEFAULT 'main' NOT NULL,
  "framework" text NOT NULL,
  "deployment_url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "last_deployment_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS "deployments" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "commit_hash" text,
  "commit_message" text,
  "build_logs" text,
  "deployment_url" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);

-- Create activities table
CREATE TABLE IF NOT EXISTS "activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "project_id" integer,
  "type" text NOT NULL,
  "description" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create sessions table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

-- Create index for sessions
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
