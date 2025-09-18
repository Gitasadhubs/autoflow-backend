import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Octokit } from "@octokit/rest";
import { storage } from "./storage.js";
import { requireAuth, getCurrentUser } from "./auth.js";
import { insertUserSchema, insertProjectSchema, insertDeploymentSchema, type Project } from "./shared/schema.js";
import { z } from "zod";
import crypto from "crypto";

// GitHub Actions workflow creation
async function createGitHubActionsWorkflow(accessToken: string, project: Project) {
  const octokit = new Octokit({ auth: accessToken });
  
  const [owner, repo] = project.repositoryName.split('/');
  
  const workflowContent = generateWorkflowYaml(project);
  
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: '.github/workflows/autoflow-deploy.yml',
      message: 'Add AutoFlow CI/CD workflow',
      content: Buffer.from(workflowContent).toString('base64'),
    });
  } catch (error: any) {
    if (error.status === 422) {
      // File already exists, update it
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.github/workflows/autoflow-deploy.yml',
      });
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: '.github/workflows/autoflow-deploy.yml',
        message: 'Update AutoFlow CI/CD workflow',
        content: Buffer.from(workflowContent).toString('base64'),
        sha: (existingFile as any).sha,
      });
    } else {
      throw error;
    }
  }
}

// Trigger GitHub Actions workflow
async function triggerGitHubActionsWorkflow(accessToken: string, project: Project, deploymentId: number) {
  const octokit = new Octokit({ auth: accessToken });
  
  const [owner, repo] = project.repositoryName.split('/');
  
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: 'autoflow-deploy.yml',
    ref: project.branch,
    inputs: {
      deployment_id: deploymentId.toString(),
      webhook_url: process.env.NODE_ENV === "production"
        ? `${process.env.BACKEND_URL}/api/webhook/github`
        : `http://localhost:5000/api/webhook/github`
    }
  });
}

// Generate workflow YAML based on project framework
function generateWorkflowYaml(project: Project): string {
  return `name: AutoFlow CI/CD

on:
  workflow_dispatch:
    inputs:
      deployment_id:
        description: 'Deployment ID'
        required: true
      webhook_url:
        description: 'Webhook URL for status updates'
        required: true
  push:
    branches: [ ${project.branch} ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build project
      run: npm run build
      
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.ORG_ID }}
        vercel-project-id: \${{ secrets.PROJECT_ID }}
        working-directory: ./
        
    - name: Notify deployment success
      if: success()
      run: |
        curl -X POST "\${{ github.event.inputs.webhook_url }}" \\
          -H "Content-Type: application/json" \\
          -d '{"deployment_id": "\${{ github.event.inputs.deployment_id }}", "status": "success", "logs": "Deployment completed successfully"}'
          
    - name: Notify deployment failure
      if: failure()
      run: |
        curl -X POST "\${{ github.event.inputs.webhook_url }}" \\
          -H "Content-Type: application/json" \\
          -d '{"deployment_id": "\${{ github.event.inputs.deployment_id }}", "status": "failed", "logs": "Deployment failed. Check the logs for details."}'`;
}

// Trigger Vercel deployment
async function triggerVercelDeployment(project: Project) {
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelOrgId = process.env.VERCEL_ORG_ID;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelOrgId || !vercelProjectId) {
    throw new Error("Vercel environment variables not set");
  }

  const response = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: project.name,
      gitSource: {
        type: 'github',
        repo: project.repositoryName,
        ref: project.branch,
      },
      projectSettings: {
        framework: project.framework.toLowerCase(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Vercel deployment failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

// Trigger Railway deployment
async function triggerRailwayDeployment(project: Project) {
  const railwayToken = process.env.RAILWAY_TOKEN;
  const railwayProjectId = process.env.RAILWAY_PROJECT_ID;
  const railwayServiceId = process.env.RAILWAY_SERVICE_ID;

  if (!railwayToken || !railwayProjectId || !railwayServiceId) {
    throw new Error("Railway environment variables not set");
  }

  const response = await fetch(`https://backboard.railway.app/graphql/v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${railwayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation deploy {
          deploy(input: {
            projectId: "${railwayProjectId}",
            serviceId: "${railwayServiceId}"
          }) {
            id
            status
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Railway deployment failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth endpoints
  app.get("/api/auth/user", (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(user);
  });

  app.get("/api/auth/github", passport.authenticate("github", {
    scope: ["user:email", "repo", "workflow"]
  }));

  app.get("/api/auth/github/callback", 
    passport.authenticate("github", { failureRedirect: "/login" }),
    (req, res) => {
      // Successful authentication, redirect to frontend dashboard
      const frontendUrl = process.env.FRONTEND_URL || "https://autoflow-frontend-rho.vercel.app";
      res.redirect(`${frontendUrl}/dashboard`);
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Project endpoints
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const projects = await storage.getProjectsByUserId(user.id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.accessToken) {
        return res.status(401).json({ message: "GitHub access token not found" });
      }

      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId: user.id
      });

      const project = await storage.createProject(projectData);
      
      // Create GitHub Actions workflow
      try {
        await createGitHubActionsWorkflow(user.accessToken, project);
      } catch (workflowError) {
        console.error("Failed to create GitHub Actions workflow:", workflowError);
        // Continue even if workflow creation fails
      }

      // Create initial activity
      await storage.createActivity({
        userId: user.id,
        projectId: project.id,
        type: "project_created",
        description: `Project "${project.name}" created`
      });

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Project creation error:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Deployment endpoints
  app.get("/api/projects/:id/deployments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deployments = await storage.getDeploymentsByProjectId(projectId);
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  // New endpoint to fetch all deployments for the authenticated user
  app.get("/api/deployments", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const deployments = await storage.getDeploymentsByUserId(user.id);
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.post("/api/projects/:id/deploy", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = getCurrentUser(req);
      if (!user || !user.accessToken) {
        return res.status(401).json({ message: "GitHub access token not found" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId,
        status: "building",
        commitHash: req.body.commitHash || "latest",
        commitMessage: req.body.commitMessage || "Deploy to production"
      });

      // Update project status
      await storage.updateProject(projectId, {
        status: "building"
      });

      // Create activity
      await storage.createActivity({
        userId: user.id,
        projectId,
        type: "deployment_started",
        description: `Deployment started for "${project.name}"`
      });

      // Trigger GitHub Actions workflow
      try {
        await triggerGitHubActionsWorkflow(user.accessToken, project, deployment.id);
      } catch (workflowError) {
        console.error("Failed to trigger GitHub Actions workflow:", workflowError);
        // Update deployment status to failed
        await storage.updateDeployment(deployment.id, {
          status: "failed",
          buildLogs: `Failed to trigger deployment: ${workflowError.message}`
        });
        
        await storage.updateProject(projectId, {
          status: "failed"
        });

        await storage.createActivity({
          userId: user.id,
          projectId,
          type: "deployment_failed",
          description: `Failed to trigger deployment for "${project.name}"`
        });
      }

      res.status(201).json(deployment);
    } catch (error) {
      console.error("Deploy error:", error);
      res.status(500).json({ message: "Failed to start deployment" });
    }
  });

  // Activity endpoints
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getActivitiesByUserId(user.id, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Repository endpoints (GitHub integration)
  app.get("/api/github/repositories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.accessToken) {
        return res.status(401).json({ message: "GitHub access token not found" });
      }

      const octokit = new Octokit({
        auth: user.accessToken,
      });

      const { data: repositories } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
      });

      const formattedRepos = repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || "",
        private: repo.private,
        html_url: repo.html_url,
        language: repo.language || "Unknown",
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
      }));

      res.json(formattedRepos);
    } catch (error) {
      console.error("GitHub API error:", error);
      res.status(500).json({ message: "Failed to fetch repositories from GitHub" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const projects = await storage.getProjectsByUserId(user.id);
      
      const stats = {
        totalProjects: projects.length,
        successfulDeployments: projects.filter(p => p.status === "deployed").length,
        avgBuildTime: "2.3min",
        successRate: projects.length > 0 ? Math.round((projects.filter(p => p.status === "deployed").length / projects.length) * 100) + "%" : "0%"
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Webhook endpoint for GitHub Actions
  app.post("/api/webhooks/github", async (req, res) => {
    try {
      const { deployment_id, status, logs, deployment_url } = req.body;
      
      if (!deployment_id) {
        return res.status(400).json({ message: "deployment_id is required" });
      }

      // Update deployment status
      const deployment = await storage.updateDeployment(parseInt(deployment_id), {
        status,
        buildLogs: logs,
        deploymentUrl: deployment_url
      });

      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      // Update project status
      const project = await storage.getProject(deployment.projectId);
      if (project) {
        await storage.updateProject(deployment.projectId, {
          status: status === "success" ? "deployed" : status,
          deploymentUrl: status === "success" ? deployment_url : undefined
        });

        // Create activity
        await storage.createActivity({
          userId: project.userId,
          projectId: deployment.projectId,
          type: status === "success" ? "deployment_success" : "deployment_failed",
          description: `Deployment ${status === "success" ? "completed successfully" : "failed"} for "${project.name}"`
        });
      }

      res.json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Webhook endpoint for GitHub push events
  app.post("/api/webhooks/github-push", async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const payload = JSON.stringify(req.body);
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      if (!secret) {
        console.error("GitHub webhook secret not set");
        return res.status(500).json({ message: "Server misconfiguration" });
      }

      if (!signature) {
        return res.status(400).json({ message: "Missing signature" });
      }

      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(payload).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = req.headers['x-github-event'];
      if (event !== 'push') {
        return res.status(400).json({ message: "Unsupported event type" });
      }

      const { repository, ref, head_commit } = req.body;
      if (!repository || !ref || !head_commit) {
        return res.status(400).json({ message: "Invalid payload" });
      }

      const repoFullName = repository.full_name;
      const branch = ref.replace('refs/heads/', '');
      const commitHash = head_commit.id;
      const commitMessage = head_commit.message;

      // Find project by repository name and branch
      const projects = await storage.getProjectsByRepositoryName(repoFullName);
      const project = projects.find(p => p.branch === branch);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId: project.id,
        status: "building",
        commitHash,
        commitMessage
      });

      // Update project status
      await storage.updateProject(project.id, {
        status: "building"
      });

      // Create activity
      await storage.createActivity({
        userId: project.userId,
        projectId: project.id,
        type: "deployment_started",
        description: `Deployment started for "${project.name}" via webhook`
      });

      // Trigger deployment via Vercel or Railway API
      if (project.framework.toLowerCase() === "react") {
        // Trigger Vercel deployment
        await triggerVercelDeployment(project);
      } else {
        // Trigger Railway deployment
        await triggerRailwayDeployment(project);
      }

      res.status(201).json({ message: "Deployment triggered", deploymentId: deployment.id });
    } catch (error) {
      console.error("GitHub push webhook error:", error);
      res.status(500).json({ message: "Failed to process GitHub push webhook" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Root route - redirect to frontend
  app.get("/", (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "https://autoflow-frontend-rho.vercel.app";
    res.redirect(frontendUrl);
  });

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
