import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { storage } from "./storage";
import type { User } from "../shared/schema";

if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn("GitHub OAuth credentials not found. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.");
  console.warn("Authentication will be disabled until credentials are provided.");
} else {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === "production" 
      ? `${process.env.BACKEND_URL}/api/auth/github/callback`
      : "http://localhost:5000/api/auth/github/callback"
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const githubUser = {
        username: profile.username,
        email: profile.emails?.[0]?.value || `${profile.username}@users.noreply.github.com`,
        githubId: profile.id,
        avatar: profile.photos?.[0]?.value,
        accessToken
      };

      let user = await storage.getUserByGithubId(githubUser.githubId);
      
      if (!user) {
        user = await storage.createUser(githubUser);
      } else {
        user = await storage.updateUser(user.id, {
          accessToken: githubUser.accessToken,
          avatar: githubUser.avatar
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to ensure user is authenticated
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

// Middleware to get current user
export const getCurrentUser = (req: any): User | null => {
  return req.user || null;
};