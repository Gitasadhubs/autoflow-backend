import {
  users,
  projects,
  deployments,
  activities,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Deployment,
  type InsertDeployment,
  type Activity,
  type InsertActivity
} from "./shared/schema.js";
import { db } from "./db.js";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  getProjectsByRepositoryName(repositoryName: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Deployment methods
  getDeployment(id: number): Promise<Deployment | undefined>;
  getDeploymentsByProjectId(projectId: number): Promise<Deployment[]>;
  getDeploymentsByUserId(userId: number): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: number, updates: Partial<InsertDeployment>): Promise<Deployment | undefined>;

  // Activity methods
  getActivitiesByUserId(userId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.githubId, githubId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser as any)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates as any)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByRepositoryName(repositoryName: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.repositoryName, repositoryName))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject as any)
      .returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(updates as any)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.length > 0;
  }

  // Deployment methods
  async getDeployment(id: number): Promise<Deployment | undefined> {
    const [deployment] = await db.select().from(deployments).where(eq(deployments.id, id));
    return deployment || undefined;
  }

  async getDeploymentsByProjectId(projectId: number): Promise<Deployment[]> {
    return await db
      .select()
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.startedAt));
  }

  async getDeploymentsByUserId(userId: number): Promise<Deployment[]> {
    return await db
      .select({
        id: deployments.id,
        deploymentUrl: deployments.deploymentUrl,
        status: deployments.status,
        projectId: deployments.projectId,
        commitHash: deployments.commitHash,
        commitMessage: deployments.commitMessage,
        buildLogs: deployments.buildLogs,
        startedAt: deployments.startedAt,
        completedAt: deployments.completedAt
      })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(projects.userId, userId))
      .orderBy(desc(deployments.startedAt));
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const [deployment] = await db
      .insert(deployments)
      .values(insertDeployment as any)
      .returning();
    return deployment;
  }

  async updateDeployment(id: number, updates: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const [deployment] = await db
      .update(deployments)
      .set(updates as any)
      .where(eq(deployments.id, id))
      .returning();
    return deployment || undefined;
  }

  // Activity methods
  async getActivitiesByUserId(userId: number, limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity as any)
      .returning();
    return activity;
  }
}

export const storage = new DatabaseStorage();
