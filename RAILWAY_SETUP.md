migra# Railway Deployment Setup

## Environment Variables Required

Set these environment variables in your Railway project dashboard:

### Database
```
DATABASE_URL=postgresql://username:password@host:port/database
```
- Railway will provide this automatically if you add a PostgreSQL service
- Or use your own PostgreSQL database URL

### GitHub OAuth (Required for authentication)
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Application URLs
```
NODE_ENV=production
BACKEND_URL=https://your-railway-app.railway.app
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Session Security
```
SESSION_SECRET=your_very_secure_random_string_here
```

## Railway Configuration

1. **Add PostgreSQL Service**: In Railway dashboard, add a PostgreSQL database service
2. **Set Environment Variables**: Add all the variables listed above
3. **Deploy**: Connect your GitHub repository and deploy

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - **Application name**: AutoFlow Backend
   - **Homepage URL**: `https://your-vercel-app.vercel.app`
   - **Authorization callback URL**: `https://your-railway-app.railway.app/api/auth/github/callback`
3. Copy the Client ID and Client Secret to Railway environment variables

## Vercel Frontend Configuration

Make sure your frontend is configured to use your Railway backend URL:
```
VITE_API_URL=https://your-railway-app.railway.app
```

## Health Check

Your app includes a health check endpoint at `/api/health` that Railway can use for monitoring.
