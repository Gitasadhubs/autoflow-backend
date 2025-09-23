# AutoFlow Backend

## Overview

AutoFlow is a CI/CD platform backend built with Express.js and TypeScript, designed to automate deployment workflows for GitHub repositories. The system provides GitHub OAuth authentication, project management, deployment tracking, and webhook handling for continuous integration and deployment processes. It's specifically configured for Railway deployment with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Express.js with TypeScript**: Core web framework providing RESTful API endpoints
- **Railway Deployment**: Cloud platform hosting with automatic builds and deployments
- **Session-based Authentication**: Express sessions with PostgreSQL store for user state management

### Database Layer
- **PostgreSQL with Drizzle ORM**: Type-safe database interactions using Drizzle ORM
- **Schema Design**: Four main entities - users, projects, deployments, and activities
- **Database Migrations**: Automated schema management with Drizzle Kit and custom Railway migration scripts

### Authentication System
- **GitHub OAuth Strategy**: Passport.js integration for GitHub-based user authentication
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Access Token Storage**: GitHub access tokens stored for repository operations

### API Architecture
- **RESTful Endpoints**: Standard HTTP methods for resource management
- **Middleware Stack**: CORS, Helmet security, rate limiting, and body parsing
- **Error Handling**: Centralized error responses with proper HTTP status codes

### CI/CD Integration
- **GitHub Actions Workflow Generation**: Automatic creation of deployment workflows in user repositories
- **Webhook Processing**: GitHub push event handling for triggering deployments
- **Octokit Integration**: GitHub API interactions for repository management

### Security Measures
- **Helmet**: Security headers and CSRF protection
- **Rate Limiting**: API endpoint protection against abuse
- **CORS Configuration**: Environment-specific origin allowlisting
- **Secure Session Configuration**: Production-ready session settings

### Data Models
- **Users**: GitHub profile data with access tokens
- **Projects**: Repository metadata with framework and deployment information
- **Deployments**: Build and deployment status tracking with logs
- **Activities**: User action logging for audit trails

## External Dependencies

### Authentication Services
- **GitHub OAuth**: OAuth 2.0 flow for user authentication and repository access
- **GitHub API (Octokit)**: Repository management, webhook creation, and workflow automation

### Database Infrastructure
- **Railway PostgreSQL**: Managed PostgreSQL database service
- **Connect-PG-Simple**: PostgreSQL session store for Express sessions

### Deployment Platform
- **Railway**: Container-based hosting platform with automatic deployments
- **Vercel Frontend Integration**: CORS configuration for frontend communication

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript Compiler**: Build process for production deployment
- **TSX**: Development server with hot reloading

### GitHub Integrations
- **GitHub Actions**: Automated workflow creation in user repositories
- **GitHub Webhooks**: Push event notifications for deployment triggering
- **Repository Management**: File creation and updates via GitHub API

### Security Dependencies
- **Helmet**: Security middleware for Express applications
- **Express Rate Limit**: API request throttling and abuse prevention
- **CORS**: Cross-origin resource sharing configuration