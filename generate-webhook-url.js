#!/usr/bin/env node

// Script to generate the correct webhook URL for your AutoFlow backend

const backendUrl = process.env.BACKEND_URL || "https://autoflow-backend-production.up.railway.app";
const webhookUrl = `${backendUrl}/api/webhooks/github`;

console.log("🔗 AutoFlow Webhook URL Generator");
console.log("=================================");
console.log("");
console.log("Your webhook URL is:");
console.log(`📡 ${webhookUrl}`);
console.log("");
console.log("Add this to your Railway environment variables:");
console.log(`WEBHOOK_URL=${webhookUrl}`);
console.log("");
console.log("📋 Complete Environment Variables for Railway:");
console.log("==============================================");
console.log(`BACKEND_URL=${backendUrl}`);
console.log(`FRONTEND_URL=https://autoflow-frontend-rho.vercel.app`);
console.log(`WEBHOOK_URL=${webhookUrl}`);
console.log(`GITHUB_CLIENT_ID=Iv23liTVfs2kCnBu2syn`);
console.log(`GITHUB_CLIENT_SECRET=173a1528191f24f7454e6e98694105a737fd9b3d`);
console.log(`NODE_ENV=production`);
console.log(`SESSION_SECRET=your_very_secure_random_string_here_12345`);
console.log(`DATABASE_URL=postgresql://postgres:pOMhryuWPvZAWicbuuXMjKetbPvEjCTi@postgres-dgrl.railway.internal:5432/railway`);
console.log("");
console.log("🧪 Test your webhook endpoint:");
console.log(`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"deployment_id": 1, "status": "success"}'`);
console.log("");
console.log("✅ Expected response: {\"message\":\"Webhook processed successfully\"}");

