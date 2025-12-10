# Phase 5: Admin Panel + User Management + Student Access

## Overview

Phase 5 implements comprehensive user management and student access control for the MyTeacher special education portal. This phase adds the ability for administrators to create and manage users, assign permissions, and control which students each user can access.

## Features Implemented

### 1. Database Schema Updates

#### UserPermission Model Enhancement
Added `canManageUsers` field to the existing `UserPermission` model:

```prisma
model UserPermission {
  id             String   @id @default(uuid())
  userId         String   @unique
  canCreatePlans Boolean  @default(false)
  canUpdatePlans Boolean  @default(false)
  canReadAll     Boolean  @default(false)
  canManageUsers Boolean  @default(false)  // NEW: Admin permission
  canManageDocs  Boolean  @default(false)
  user           User     @relation(fields: [userId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 2. Backend API Endpoints

#### User Management Endpoints (Protected by `requireManageUsersPermission`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users with permissions |
| POST | `/api/admin/users` | Create a new user |
| GET | `/api/admin/users/:userId` | Get user details |
| PATCH | `/api/admin/users/:userId` | Update user details |
| PATCH | `/api/admin/users/:userId/permissions` | Update user permissions |

#### Student Access Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users/:userId/students` | Get user's student access list |
| POST | `/api/admin/users/:userId/students` | Add student access by recordId |
| PATCH | `/api/admin/users/:userId/students/:accessId` | Update student access (canEdit) |
| DELETE | `/api/admin/users/:userId/students/:accessId` | Remove student access |

### 3. Permission System

#### Available Permissions
- **canCreatePlans**: Create new IEPs, 504 Plans, and Behavior Plans
- **canUpdatePlans**: Edit existing plans and add progress data
- **canReadAll**: Access all students (ignores StudentAccess table)
- **canManageUsers**: Create/edit users and assign permissions
- **canManageDocs**: Upload and manage best practice documents and templates

#### Permission Middleware
- `requireManageUsersPermission`: Checks for `canManageUsers` or `ADMIN` role
- `requireAdminPermission`: Checks for `canManageUsers` OR `canManageDocs` or `ADMIN` role

### 4. Student Access Rules

The system uses the `StudentAccess` table to control which students a user can view/edit:

1. If `canReadAll = true`: User can access ALL students in the system
2. If `canReadAll = false`: User can only access students explicitly granted via `StudentAccess` entries

Each `StudentAccess` entry includes:
- `userId`: The user being granted access
- `studentId`: The student being accessed
- `canEdit`: Whether the user can edit (create/update plans) for this student

### 5. Frontend Admin UI

#### Routes
- `/admin/users` - User list and management
- `/admin/users/[userId]` - User detail with permissions and student access

#### Components

**Users List Page (`/admin/users`)**
- Display all users with role, status, permissions
- Filter by role (Teacher, Case Manager, Admin)
- Search by name or email
- Create new user modal

**User Detail Page (`/admin/users/[userId]`)**
- Display user details (email, role, jurisdiction, last login)
- Edit user information modal
- Toggle permissions inline
- Manage student access list
- Add student by Record ID
- Toggle edit permission per student
- Remove student access

### 6. API Types Added

```typescript
// User Management Types
export type AdminUserRole = 'TEACHER' | 'CASE_MANAGER' | 'ADMIN';

export interface AdminPermissions {
  canCreatePlans: boolean;
  canUpdatePlans: boolean;
  canReadAll: boolean;
  canManageUsers: boolean;
  canManageDocs: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminUserRole;
  isActive: boolean;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  permissions: AdminPermissions | null;
  studentAccessCount?: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface StudentAccessEntry {
  id: string;
  studentId: string;
  recordId: string;
  studentName: string;
  grade: string;
  schoolName?: string;
  canEdit: boolean;
  grantedAt: string;
}
```

## Usage Examples

### Create a New Teacher
```typescript
const user = await api.createAdminUser({
  email: 'teacher@school.edu',
  displayName: 'John Smith',
  role: 'TEACHER',
  jurisdictionId: 'jur-1',
  permissions: {
    canCreatePlans: true,
    canUpdatePlans: true,
    canReadAll: false,
    canManageUsers: false,
    canManageDocs: false,
  }
});
```

### Grant Student Access by Record ID
```typescript
const access = await api.addStudentAccess(
  userId,
  'HCPSS-000001',  // Student Record ID
  true             // canEdit
);
```

### Update User Permissions
```typescript
const permissions = await api.updateAdminUserPermissions(userId, {
  canReadAll: true,  // Grant access to all students
});
```

## Testing

### Backend Tests
- `apps/api/src/test/users.test.ts` - User management and student access API tests

### Frontend Tests
- `apps/web/src/__tests__/admin-users.test.tsx` - Admin users UI component tests

## File Structure

```
apps/api/src/
  routes/
    admin.ts              # User management + student access endpoints
  middleware/
    permissions.ts        # Permission middleware (updated)
  test/
    users.test.ts         # Backend tests

apps/web/src/
  app/admin/
    layout.tsx            # Admin layout (updated with Users link)
    users/
      page.tsx            # Users list page
      page.module.css     # Styles
      [userId]/
        page.tsx          # User detail page
        page.module.css   # Styles
  lib/
    api.ts                # API client (updated with user management methods)
  __tests__/
    admin-users.test.tsx  # Frontend tests

packages/db/prisma/
  schema.prisma           # Added canManageUsers field
```

## Migration Notes

After deploying, run:
```bash
cd packages/db
pnpm prisma migrate deploy
```

The migration adds the `canManageUsers` column with a default value of `false`, so existing users will not have user management permissions until explicitly granted.

## Security Considerations

1. Only users with `canManageUsers` permission or `ADMIN` role can access user management
2. Users cannot modify their own permissions (enforced at API level if needed)
3. Student access is strictly controlled - users only see students they're explicitly granted access to (unless `canReadAll = true`)
4. All admin actions are logged via standard request logging
