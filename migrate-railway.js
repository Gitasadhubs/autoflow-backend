import postgres from 'postgres';

// This script will run from within Railway where it has access to the internal database
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('🚀 Starting database migration...');
console.log('DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@')); // Hide password

try {
  const sql = postgres(DATABASE_URL);
  
  console.log('✅ Connected to database successfully!');
  
  // Create users table
  await sql`
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
  `;
  console.log('✅ Created users table');
  
  // Create projects table
  await sql`
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
  `;
  console.log('✅ Created projects table');
  
  // Create deployments table
  await sql`
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
  `;
  console.log('✅ Created deployments table');
  
  // Create activities table
  await sql`
    CREATE TABLE IF NOT EXISTS "activities" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "project_id" integer,
      "type" text NOT NULL,
      "description" text NOT NULL,
      "metadata" jsonb,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `;
  console.log('✅ Created activities table');
  
  // Create sessions table for connect-pg-simple
  await sql`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    );
  `;
  console.log('✅ Created user_sessions table');
  
  // Create index for sessions
  await sql`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
  `;
  console.log('✅ Created session index');
  
  console.log('🎉 All tables created successfully!');
  console.log('📊 Database is ready for AutoFlow backend!');
  
  await sql.end();
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
