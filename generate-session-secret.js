#!/usr/bin/env node

// Script to generate a secure session secret for your AutoFlow backend

import crypto from 'crypto';

// Generate a secure random session secret
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log("🔐 AutoFlow Session Secret Generator");
console.log("====================================");
console.log("");
console.log("Your secure session secret is:");
console.log(`🔑 ${sessionSecret}`);
console.log("");
console.log("Add this to your Railway environment variables:");
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log("");
console.log("📋 Complete Environment Variables for Railway:");
console.log("==============================================");
console.log(`BACKEND_URL=https://autoflow-backend-production.up.railway.app`);
console.log(`FRONTEND_URL=https://autoflow-frontend-rho.vercel.app`);
console.log(`WEBHOOK_URL=https://autoflow-backend-production.up.railway.app/api/webhooks/github`);
console.log(`GITHUB_CLIENT_ID=Iv23liTVfs2kCnBu2syn`);
console.log(`GITHUB_CLIENT_SECRET=173a1528191f24f7454e6e98694105a737fd9b3d`);
console.log(`NODE_ENV=production`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`DATABASE_URL=postgresql://postgres:pOMhryuWPvZAWicbuuXMjKetbPvEjCTi@postgres-dgrl.railway.internal:5432/railway`);
console.log("");
console.log("⚠️  IMPORTANT SECURITY NOTES:");
console.log("- Keep this secret secure and never share it");
console.log("- Use this exact secret in your Railway environment variables");
console.log("- Don't commit this secret to your code repository");
console.log("- If compromised, generate a new one immediately");
