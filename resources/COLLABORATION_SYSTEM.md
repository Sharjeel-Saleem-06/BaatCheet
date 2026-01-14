# 🤝 Collaboration System Documentation

## Overview

The BaatCheet Collaboration System allows multiple users to work together on projects, share chats, and collaborate in real-time. This document outlines the complete implementation, features, limitations, and usage guidelines.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend (Android) Implementation](#frontend-android-implementation)
6. [API Endpoints](#api-endpoints)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Limitations](#limitations)
9. [Usage Examples](#usage-examples)
10. [Security Considerations](#security-considerations)
11. [Future Enhancements](#future-enhancements)

---

## Features

### ✅ Current Implementation

- **Project Collaboration**: Multiple users can collaborate on projects
- **Invitation System**: Project owners can invite users by email
- **Role-Based Access**: Owner, Editor, and Viewer roles
- **Pending Invitations**: Users can accept or reject collaboration invitations
- **Collaboration Tab**: Dedicated UI section for managing collaborations
- **Real-time Updates**: Collaborators see shared projects in their sidebar
- **Badge Notifications**: Visual indicators for pending invitations
- **Access Control**: Role-based permissions for project actions

### 🚧 Planned Features

- **Chat-Level Collaboration**: Share individual chats (not just projects)
- **Real-time Presence**: See who's currently viewing/editing
- **Comments & Annotations**: Add comments to specific messages
- **Version History**: Track changes and revert if needed
- **Activity Feed**: See what collaborators are doing
- **Fine-grained Permissions**: Custom permissions per collaborator
- **Team Spaces**: Organize collaborations into teams

---

## Architecture

### High-Level Flow

```
┌─────────────┐     Invite      ┌──────────────┐
│   Owner     │ ───────────────> │ Collaborator │
│  (User A)   │                  │   (User B)   │
└─────────────┘                  └──────────────┘
      │                                 │
      │ Create Project                  │ Receives Invitation
      ▼                                 ▼
┌─────────────────────────────────────────────────┐
│              Backend (HuggingFace)              │
│  ┌───────────────────────────────────────────┐  │
│  │         Project Management Service        │  │
│  ├───────────────────────────────────────────┤  │
│  │  - Create Project                         │  │
│  │  - Send Invitation                        │  │
│  │  - Accept/Reject Invitation               │  │
│  │  - Manage Collaborators                   │  │
│  │  - Check Permissions                      │  │
│  └───────────────────────────────────────────┘  │
│                       │                          │
│                       ▼                          │
│  ┌───────────────────────────────────────────┐  │
│  │         Database (PostgreSQL/Neon)        │  │
│  │  - Projects                               │  │
│  │  - ProjectInvitations                     │  │
│  │  - ProjectCollaborators                   │  │
│  │  - Conversations                          │  │
│  │  - Messages                               │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Component Interaction

```
Android UI (ChatScreen)
    ↓
ChatViewModel
    ↓
ChatRepository
    ↓
BaatCheetApi (Retrofit)
    ↓
Backend API (Express.js)
    ↓
Prisma ORM
    ↓
PostgreSQL Database (Neon)
```

---

## Database Schema

### Tables

#### 1. **Project**
```prisma
model Project {
  id                String   @id @default(cuid())
  name              String
  description       String?
  color             String?
  userId            String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // AI-Generated Context
  context           String?
  keyTopics         String[]
  techStack         String[]
  goals             String[]
  lastContextUpdate DateTime?
  
  // Relations
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversations     Conversation[]
  collaborators     ProjectCollaborator[]
  invitations       ProjectInvitation[]
  
  @@index([userId])
}
```

#### 2. **ProjectCollaborator**
```prisma
model ProjectCollaborator {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("viewer") // owner, editor, viewer
  addedAt   DateTime @default(now())
  addedBy   String?  // User ID who added this collaborator
  
  // Relations
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@index([userId])
  @@index([projectId])
}
```

#### 3. **ProjectInvitation**
```prisma
model ProjectInvitation {
  id        String   @id @default(cuid())
  projectId String
  inviterId String   // User who sent the invitation
  inviteeEmail String // Email of the person being invited
  inviteeId String?  // User ID if they have an account
  role      String   @default("viewer")
  status    String   @default("pending") // pending, accepted, rejected, expired
  message   String?  // Optional message from inviter
  expiresAt DateTime?
  createdAt DateTime @default(now())
  respondedAt DateTime?
  
  // Relations
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  inviter   User     @relation("InvitationsSent", fields: [inviterId], references: [id])
  invitee   User?    @relation("InvitationsReceived", fields: [inviteeId], references: [id])
  
  @@index([inviteeEmail])
  @@index([inviteeId])
  @@index([projectId])
  @@index([status])
}
```

#### 4. **User** (Extended)
```prisma
model User {
  // ... existing fields ...
  
  // Collaboration Relations
  projects              Project[]
  collaborations        ProjectCollaborator[]
  invitationsSent       ProjectInvitation[] @relation("InvitationsSent")
  invitationsReceived   ProjectInvitation[] @relation("InvitationsReceived")
}
```

---

## Backend Implementation

### File Structure

```
backend/src/
├── routes/
│   └── projects.ts          # Project & collaboration routes
├── services/
│   └── (future) CollaborationService.ts
├── middleware/
│   └── auth.ts              # Authentication middleware
└── prisma/
    └── schema.prisma        # Database schema
```

### Key Routes (`routes/projects.ts`)

#### 1. **Invite Collaborator**
```typescript
POST /api/v1/projects/:id/invite
```

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor",
  "message": "Let's work on this project together!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inv_123",
    "projectId": "proj_456",
    "inviteeEmail": "collaborator@example.com",
    "role": "editor",
    "status": "pending",
    "createdAt": "2026-01-14T10:00:00Z"
  }
}
```

**Logic:**
- Check if user is project owner
- Check if email is already a collaborator
- Create invitation in database
- Send email notification (if configured)
- Return invitation details

#### 2. **Get Pending Invitations**
```typescript
GET /api/v1/projects/invitations/pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "project": {
        "id": "proj_456",
        "name": "Mobile App Development",
        "description": "Building the next-gen chat app"
      },
      "inviter": {
        "id": "user_789",
        "firstName": "John",
        "username": "john_dev"
      },
      "role": "editor",
      "message": "Let's collaborate!",
      "createdAt": "2026-01-14T10:00:00Z"
    }
  ]
}
```

#### 3. **Respond to Invitation**
```typescript
POST /api/v1/projects/invitations/:id/respond
```

**Request Body:**
```json
{
  "action": "accept" // or "reject"
}
```

**Response (Accept):**
```json
{
  "success": true,
  "message": "Invitation accepted",
  "data": {
    "projectId": "proj_456",
    "role": "editor"
  }
}
```

**Logic (Accept):**
- Verify invitation exists and is pending
- Create ProjectCollaborator record
- Update invitation status to "accepted"
- Add user to project's collaborator list
- Return project details

**Logic (Reject):**
- Update invitation status to "rejected"
- Do not create collaborator record

#### 4. **Get Collaborations**
```typescript
GET /api/v1/projects/collaborations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_456",
      "name": "Mobile App Development",
      "description": "Building the next-gen chat app",
      "owner": {
        "id": "user_789",
        "username": "john_dev",
        "firstName": "John"
      },
      "myRole": "editor",
      "conversationCount": 15,
      "createdAt": "2026-01-10T08:00:00Z"
    }
  ]
}
```

**Logic:**
- Fetch all projects where user is a collaborator (not owner)
- Include project details, owner info, and role
- Sort by most recently updated

#### 5. **Get Project Collaborators**
```typescript
GET /api/v1/projects/:id/collaborators
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "collab_123",
      "user": {
        "id": "user_456",
        "username": "jane_designer",
        "firstName": "Jane",
        "avatar": "https://..."
      },
      "role": "editor",
      "addedAt": "2026-01-12T14:00:00Z"
    },
    {
      "id": "collab_789",
      "user": {
        "id": "user_101",
        "username": "bob_viewer",
        "firstName": "Bob",
        "avatar": "https://..."
      },
      "role": "viewer",
      "addedAt": "2026-01-13T09:00:00Z"
    }
  ]
}
```

#### 6. **Remove Collaborator**
```typescript
DELETE /api/v1/projects/:id/collaborators/:userId
```

**Response:**
```json
{
  "success": true,
  "message": "Collaborator removed"
}
```

**Logic:**
- Verify requester is project owner
- Cannot remove the owner
- Delete ProjectCollaborator record
- Return success

#### 7. **Get Pending Invitations Count**
```typescript
GET /api/v1/projects/invitations/pending/count
```

**Response:**
```json
{
  "success": true,
  "data": 3
}
```

---

## Frontend (Android) Implementation

### File Structure

```
android/app/src/main/java/com/baatcheet/app/
├── ui/
│   ├── chat/
│   │   ├── ChatScreen.kt           # Main chat UI with drawer
│   │   └── ChatViewModel.kt        # State management
│   └── settings/
│       └── SettingsScreen.kt       # Settings with collaboration options
├── data/
│   ├── repository/
│   │   └── ChatRepository.kt       # API calls
│   └── remote/
│       ├── api/
│       │   └── BaatCheetApi.kt     # Retrofit interface
│       └── dto/
│           └── ApiModels.kt        # Data transfer objects
└── domain/
    └── model/
        └── Project.kt              # Domain models
```

### Key Components

#### 1. **ChatDrawerContent** (Left Sidebar)

**Location:** `ui/chat/ChatScreen.kt`

**Features:**
- **Collaborations Tab**: Replaces "Images" tab
- **Badge**: Shows total collaborations + pending invitations
- **Click Action**: Opens `CollaborationsBottomSheet`

```kotlin
DrawerMenuItemWithBadge(
    icon = Icons.Outlined.Group,
    text = "Collaborations",
    badge = state.collaborations.size + state.pendingInvitationsCount,
    onClick = onCollaborationsClick
)
```

#### 2. **CollaborationsBottomSheet**

**Location:** `ui/chat/ChatScreen.kt`

**Features:**
- Lists all projects user is collaborating on
- Shows owner info for each project
- Empty state when no collaborations
- Pending invitations indicator
- Click to open project

```kotlin
@Composable
private fun CollaborationsBottomSheet(
    collaborations: List<Project>,
    pendingInvitations: Int,
    onDismiss: () -> Unit,
    onProjectClick: (String) -> Unit,
    onViewInvitations: () -> Unit
)
```

#### 3. **ChatViewModel** (State Management)

**Location:** `ui/chat/ChatViewModel.kt`

**State:**
```kotlin
data class ChatState(
    // ... other fields ...
    val collaborations: List<Project> = emptyList(),
    val pendingInvitationsCount: Int = 0
)
```

**Functions:**
```kotlin
// Load collaborations
fun loadCollaborations()

// Load pending invitation count
fun loadPendingInvitationsCount()

// Invite collaborator
fun inviteCollaborator(projectId: String, email: String)

// Respond to invitation
fun respondToInvitation(invitationId: String, accept: Boolean)

// Remove collaborator
fun removeCollaborator(projectId: String, userId: String)
```

#### 4. **ChatRepository** (Data Layer)

**Location:** `data/repository/ChatRepository.kt`

**Functions:**
```kotlin
suspend fun inviteCollaborator(
    projectId: String,
    email: String,
    role: String = "viewer",
    message: String? = null
): ApiResult<ProjectInvitationResponse>

suspend fun getCollaborations(): ApiResult<List<Project>>

suspend fun getPendingInvitationsCount(): ApiResult<Int>

suspend fun respondToInvitation(
    invitationId: String,
    accept: Boolean
): ApiResult<Unit>

suspend fun getProjectCollaborators(projectId: String): ApiResult<List<ProjectCollaboratorResponse>>

suspend fun removeCollaborator(
    projectId: String,
    userId: String
): ApiResult<Unit>
```

#### 5. **BaatCheetApi** (Retrofit Interface)

**Location:** `data/remote/api/BaatCheetApi.kt`

```kotlin
@POST("projects/{id}/invite")
suspend fun inviteCollaborator(
    @Path("id") projectId: String,
    @Body request: InviteCollaboratorRequest
): Response<BaseResponse<ProjectInvitationData>>

@GET("projects/collaborations")
suspend fun getCollaborations(): Response<BaseResponse<CollaborationsData>>

@GET("projects/invitations/pending")
suspend fun getPendingInvitations(): Response<BaseResponse<PendingInvitationsData>>

@POST("projects/invitations/{id}/respond")
suspend fun respondToInvitation(
    @Path("id") invitationId: String,
    @Body request: RespondInvitationRequest
): Response<BaseResponse<Any>>

@GET("projects/{id}/collaborators")
suspend fun getProjectCollaborators(
    @Path("id") projectId: String
): Response<BaseResponse<List<ProjectCollaboratorData>>>

@DELETE("projects/{id}/collaborators/{userId}")
suspend fun removeCollaborator(
    @Path("id") projectId: String,
    @Path("userId") userId: String
): Response<BaseResponse<Any>>
```

---

## API Endpoints

### Complete List

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/projects` | Create project | ✅ |
| GET | `/api/v1/projects` | List user's projects | ✅ |
| GET | `/api/v1/projects/:id` | Get project details | ✅ |
| PUT | `/api/v1/projects/:id` | Update project | ✅ (Owner) |
| DELETE | `/api/v1/projects/:id` | Delete project | ✅ (Owner) |
| POST | `/api/v1/projects/:id/invite` | Invite collaborator | ✅ (Owner) |
| GET | `/api/v1/projects/invitations/pending` | Get pending invitations | ✅ |
| GET | `/api/v1/projects/invitations/pending/count` | Get pending count | ✅ |
| POST | `/api/v1/projects/invitations/:id/respond` | Accept/reject invitation | ✅ |
| GET | `/api/v1/projects/collaborations` | Get user's collaborations | ✅ |
| GET | `/api/v1/projects/:id/collaborators` | List project collaborators | ✅ |
| DELETE | `/api/v1/projects/:id/collaborators/:userId` | Remove collaborator | ✅ (Owner) |
| POST | `/api/v1/projects/:id/context/refresh` | Refresh AI context | ✅ |

---

## User Roles & Permissions

### Role Hierarchy

```
Owner > Editor > Viewer
```

### Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View project | ✅ | ✅ | ✅ |
| View conversations | ✅ | ✅ | ✅ |
| View messages | ✅ | ✅ | ✅ |
| Create conversation | ✅ | ✅ | ❌ |
| Send messages | ✅ | ✅ | ❌ |
| Edit project details | ✅ | ❌ | ❌ |
| Invite collaborators | ✅ | ❌ | ❌ |
| Remove collaborators | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Delete conversations | ✅ | ✅ | ❌ |
| Delete messages | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ |

### Role Descriptions

#### **Owner**
- Created the project
- Full control over project
- Can invite/remove collaborators
- Can delete project
- Cannot be removed
- Only one owner per project

#### **Editor**
- Can create and edit content
- Can create new conversations
- Can send messages
- Can delete own conversations
- Cannot invite others
- Cannot change project settings

#### **Viewer**
- Read-only access
- Can view all conversations
- Can view all messages
- Cannot create or edit anything
- Good for observers/stakeholders

---

## Limitations

### Current Limitations

#### 1. **Project-Level Only**
- ❌ Cannot share individual chats (only entire projects)
- ❌ Cannot selectively share conversations within a project
- **Workaround**: Create separate projects for different collaboration needs

#### 2. **Email-Based Invitations**
- ❌ Can only invite users by email
- ❌ Must have valid email in system
- ❌ No username-based invitations
- **Workaround**: Ensure users register with known emails

#### 3. **No Real-time Presence**
- ❌ Cannot see who's currently online
- ❌ Cannot see who's viewing/editing
- ❌ No typing indicators for collaborators
- **Future**: Implement WebSocket for real-time updates

#### 4. **Limited Notification System**
- ❌ No push notifications for invitations
- ❌ No email notifications (yet)
- ❌ Only in-app badge indicators
- **Workaround**: Check "Collaborations" tab regularly

#### 5. **No Activity History**
- ❌ Cannot see what collaborators changed
- ❌ No version history for projects
- ❌ No audit log
- **Future**: Implement activity tracking

#### 6. **No Granular Permissions**
- ❌ Only 3 roles (Owner, Editor, Viewer)
- ❌ Cannot customize permissions per user
- ❌ Cannot restrict specific features
- **Future**: Custom permission builder

#### 7. **No Team Spaces**
- ❌ Cannot organize projects into teams
- ❌ Cannot have team-level settings
- ❌ No team-wide resources
- **Future**: Team management system

#### 8. **No Collaboration Analytics**
- ❌ Cannot see collaboration statistics
- ❌ No contribution tracking
- ❌ No engagement metrics
- **Future**: Collaboration analytics dashboard

#### 9. **Single Owner**
- ❌ Only one owner per project
- ❌ Cannot transfer ownership
- ❌ Owner deletion removes project
- **Future**: Multiple owners, ownership transfer

#### 10. **No Offline Sync**
- ❌ Requires internet connection
- ❌ No offline editing
- ❌ Changes not synced when offline
- **Future**: Offline support with conflict resolution

### Technical Limitations

#### Database
- **Max Collaborators**: No hard limit, but recommend < 100 per project
- **Invitation Expiry**: No automatic expiry (planned)
- **Email Validation**: Basic validation only

#### API Rate Limits
- **Invitation Rate**: 10 invitations per minute per user
- **Response Rate**: No limit on accepting/rejecting
- **Fetch Rate**: Standard API rate limits apply

#### UI Constraints
- **Collaboration List**: Shows all (no pagination yet)
- **Badge Count**: Shows up to "99+" for pending invitations
- **Search**: No search in collaborations list

---

## Usage Examples

### Example 1: Creating a Project and Inviting Team

```kotlin
// 1. Owner creates project
viewModel.createProject(
    name = "Mobile App Redesign",
    description = "Q1 2026 redesign project"
)

// 2. Owner invites designer
viewModel.inviteCollaborator(
    projectId = "proj_123",
    email = "designer@company.com",
    role = "editor"
)

// 3. Owner invites stakeholder
viewModel.inviteCollaborator(
    projectId = "proj_123",
    email = "manager@company.com",
    role = "viewer"
)
```

### Example 2: Accepting an Invitation

```kotlin
// 1. User sees pending invitation badge
// Badge shows "3" pending invitations

// 2. User clicks on Collaborations tab
showCollaborationsSheet = true

// 3. User clicks "View Invitations"
// Shows list of pending invitations

// 4. User accepts invitation
viewModel.respondToInvitation(
    invitationId = "inv_456",
    accept = true
)

// 5. Project now appears in Collaborations list
// User can start working on the project
```

### Example 3: Managing Collaborators

```kotlin
// 1. Owner views project collaborators
val collaborators = viewModel.getProjectCollaborators(projectId)

// 2. Owner decides to remove someone
viewModel.removeCollaborator(
    projectId = "proj_123",
    userId = "user_789"
)

// 3. Toast message shows: "Collaborator removed"
```

---

## Security Considerations

### Authentication & Authorization

#### 1. **JWT Token Validation**
- All endpoints require valid JWT token
- Token contains user ID and email
- Tokens expire after 7 days

#### 2. **Ownership Verification**
```typescript
// Backend checks before allowing actions
const project = await prisma.project.findFirst({
  where: { id: projectId, userId: req.user.id }
});

if (!project) {
  return res.status(403).json({
    success: false,
    error: 'Not authorized'
  });
}
```

#### 3. **Role-Based Access Control**
```typescript
const collaborator = await prisma.projectCollaborator.findFirst({
  where: { projectId, userId: req.user.id }
});

if (collaborator.role === 'viewer' && action === 'edit') {
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
}
```

### Data Protection

#### 1. **Email Validation**
- Validates email format before sending invitations
- Checks if email exists in user database
- Prevents spam invitations

#### 2. **Invitation Expiry** (Planned)
- Invitations expire after 7 days
- Expired invitations cannot be accepted
- Database cleanup for old invitations

#### 3. **SQL Injection Prevention**
- Uses Prisma ORM with parameterized queries
- No raw SQL queries
- Input sanitization

#### 4. **XSS Prevention**
- Frontend sanitizes user input
- Backend validates and escapes strings
- No eval() or dangerous functions

### Privacy

#### 1. **Data Visibility**
- Collaborators only see projects they're invited to
- Cannot access other users' projects
- Owner can see all collaborators

#### 2. **Email Privacy**
- Email only shown to project owner
- Collaborators see usernames, not emails
- No email harvesting possible

#### 3. **Deletion Cascade**
- Deleting user removes all their collaborations
- Deleting project removes all invitations
- No orphaned data

---

## Future Enhancements

### Phase 1: Core Improvements (Q1 2026)

#### 1. **Chat-Level Collaboration**
- Share individual chats (not just projects)
- Granular sharing controls
- Chat-specific permissions

#### 2. **Email Notifications**
- Email when invited to project
- Email when invitation accepted/rejected
- Configurable notification preferences

#### 3. **Invitation Management**
- Resend invitations
- Cancel pending invitations
- Set custom expiry dates

#### 4. **Search & Filters**
- Search collaborations by name
- Filter by role (Owner, Editor, Viewer)
- Sort by last updated, name, etc.

### Phase 2: Advanced Features (Q2 2026)

#### 5. **Real-time Presence**
- See who's online
- See who's viewing current chat
- Typing indicators for collaborators

#### 6. **Activity Feed**
- See what collaborators are doing
- Timeline of project activity
- Filter by user, action type, date

#### 7. **Comments & Annotations**
- Add comments to specific messages
- @mention collaborators
- Thread replies

#### 8. **Version History**
- Track all changes to conversations
- Revert to previous versions
- Compare changes

### Phase 3: Enterprise Features (Q3 2026)

#### 9. **Team Spaces**
- Create teams with multiple projects
- Team-level settings and resources
- Shared team knowledge base

#### 10. **Custom Permissions**
- Define custom roles
- Fine-grained permission control
- Permission templates

#### 11. **Collaboration Analytics**
- Track contributions per user
- Engagement metrics
- Activity reports

#### 12. **Ownership Transfer**
- Transfer project ownership
- Multiple owners support
- Co-owner permissions

### Phase 4: Scale & Performance (Q4 2026)

#### 13. **Offline Collaboration**
- Offline editing support
- Automatic sync when online
- Conflict resolution

#### 14. **Large-Scale Collaboration**
- Support 1000+ collaborators
- Hierarchical permissions
- Sub-project management

#### 15. **Integration APIs**
- Slack integration
- Microsoft Teams integration
- Webhook notifications

---

## Migration Guide

### From Non-Collaborative to Collaborative

If you have existing projects without collaborations:

1. **No Action Required**: Existing projects work as before
2. **Owner Role**: Original creator is automatically the owner
3. **Invitations**: Start inviting collaborators anytime
4. **Data Integrity**: No data loss during migration

### Database Migration

```sql
-- Already applied via Prisma migrations
-- No manual migration needed

-- Verify tables exist
SELECT * FROM "ProjectCollaborator" LIMIT 1;
SELECT * FROM "ProjectInvitation" LIMIT 1;
```

---

## Troubleshooting

### Common Issues

#### 1. **Invitation Not Received**
- **Cause**: Email not registered in system
- **Solution**: Ask invitee to create account with that email first

#### 2. **Cannot See Collaboration**
- **Cause**: Invitation not accepted yet
- **Solution**: Check pending invitations and accept

#### 3. **Permission Denied**
- **Cause**: User role doesn't allow action
- **Solution**: Ask owner to upgrade role (Viewer → Editor)

#### 4. **Collaborator Not Removed**
- **Cause**: Only owner can remove collaborators
- **Solution**: Contact project owner

#### 5. **Badge Count Not Updating**
- **Cause**: App needs refresh
- **Solution**: Pull down to refresh or restart app

---

## Testing Checklist

### Backend Testing

- [ ] Create project
- [ ] Invite collaborator (valid email)
- [ ] Invite collaborator (invalid email) - should fail
- [ ] Accept invitation
- [ ] Reject invitation
- [ ] List collaborations
- [ ] Get pending invitations count
- [ ] Remove collaborator (as owner)
- [ ] Remove collaborator (as editor) - should fail
- [ ] Delete project - should delete all invitations
- [ ] Delete user - should remove from all collaborations

### Frontend Testing

- [ ] Collaborations tab shows correct badge
- [ ] Click collaborations opens bottom sheet
- [ ] Empty state shows when no collaborations
- [ ] Collaboration list displays correctly
- [ ] Pending invitations indicator shows
- [ ] Click project opens conversations
- [ ] Settings screen shows collaboration options
- [ ] Toast messages for success/error
- [ ] UI responsive and smooth

---

## Support & Contact

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Email**: support@baatcheet.com
- **Documentation**: See README.md and other docs in `/resources`

---

## Changelog

### v1.0.0 (January 2026)
- ✅ Initial collaboration system implementation
- ✅ Project-level collaboration
- ✅ Invitation system (email-based)
- ✅ Role-based permissions (Owner, Editor, Viewer)
- ✅ Collaborations UI in Android app
- ✅ Settings integration
- ✅ Badge notifications

### Upcoming (v1.1.0)
- 🚧 Email notifications
- 🚧 Chat-level collaboration
- 🚧 Real-time presence
- 🚧 Activity feed

---

## License

This collaboration system is part of BaatCheet and follows the same license as the main project.

**Made with ❤️ in Pakistan**
