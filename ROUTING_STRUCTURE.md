# SkillSwap Application - Structured Routes & Redirect Flow

## Route Structure Overview

### Authentication Routes (No Protection Required)
- **`/login`** - Login page
  - Redirects to `/home` if user already logged in
  - Handles email/password and OAuth login
  
- **`/signup`** - Registration page
  - Redirects to `/home` if user already logged in
  - Collects user info (name, email, password)
  
- **`/auth/callback`** - OAuth callback handler
  - Processes OAuth tokens from providers
  - Sets session and redirects to home

---

### Protected Routes (Require Authentication)
All these routes redirect to `/login` if user is not authenticated via `ProtectedRoute` component.

- **`/home`** - Dashboard/Home page
  - Shows welcome screen with quick access cards
  - Displays popular skills & featured mentors
  - Access points: Browse Skills, Your Profile, Chat
  
- **`/dashboard`** - User Dashboard
  - Shows active sessions and upcoming events
  - Profile completeness bar
  - Option to buy credits
  - Session action buttons: Accept, Reject, Schedule
  
- **`/profile`** - User Profile Management
  - Edit personal info (name, bio, avatar, links)
  - Add/remove teaching skills
  - Add/remove learning skills
  - Upload demo videos and project files
  
- **`/session/:id`** - Active Session View
  - Real-time chat with mentor/student
  - Session details and meeting link
  - Rating and feedback submission
  - Session status: pending → accepted → scheduled → completed

---

### Public Routes (No Protection)
- **`/skills`** - Browse Skills
  - Category sidebar for filtering
  - Grid of available skills
  - No authentication required
  
- **`/mentors`** - Browse Mentors
  - Search by skill and rating filter
  - Mentor cards showing specialties
  - Click to view mentor details
  
- **`/mentor/:id`** - Mentor Detail Page
  - Full mentor profile and experience
  - List of skills they teach
  - Reviews and ratings
  - Option to request a session
  
- **`/chat`** - Chat Page
  - Real-time messaging with WebSocket
  - Socket.io connection to backend
  - No authentication required (but can be restricted in logic)

---

## Root Route Behavior
- **`/`** (Root)
  - If user is logged in → Redirects to `/home`
  - If user is not logged in → Redirects to `/login`

---

## Request Flow Diagram

```
User visits app
    ↓
App.jsx loads & initializes auth (checks session from cookies)
    ↓
Is user authenticated? ─→ YES → Check route
                    ↓ NO
              Show Loading Screen
                    ↓
            Once auth check complete
                    ↓
        Can proceed to route check
    ↓
Route Check:
├─ Protected Routes (/home, /dashboard, /profile, /session/:id)
│  └─ User exists? → YES → Render Component
│               └─ NO → <Navigate to="/login" />
│
├─ Auth Routes (/login, /signup)
│  └─ User exists? → YES → <Navigate to="/home" />
│               └─ NO → Render Component
│
├─ Public Routes (/skills, /mentors, /mentor/:id, /chat)
│  └─ Render Component (may have internal auth checks)
│
└─ Root (/)
   └─ User exists? → YES → Navigate to "/home"
                  └─ NO → Navigate to "/login"
```

---

## Styling Configuration

### Tailwind CSS Setup
- **Entry point**: `src/index.css`
- **Configuration**: `tailwind.config.js`
- **PostCSS**: Configured in `postcss.config.js`
- **Content paths**: Scans `./index.html` and `./src/**/*.{js,jsx,ts,tsx}`

### Global Styles Applied
- Base styles: `body`, `a` tags
- Component utilities: `.card`, `.container-card`, `.muted`
- Custom utilities: `.page-fade` for transitions
- Custom scrollbar styling for webkit browsers

### Colors & Themes
- Primary: Blue (`bg-blue-600`, `text-blue-600`)
- Success: Green (`bg-green-600`, `text-green-600`)
- Danger: Red (`bg-red-600`, `text-red-600`)
- Info: Purple (`bg-purple-600`, `text-purple-600`)
- Backgrounds: Gray (`bg-gray-50` to `bg-gray-100`)

---

## Session Handlers in Dashboard

### `handleAccept(session)`
- Calls `acceptSession(sessionId)`
- Updates session status to "accepted"
- Refreshes sessions list
- Shows success toast notification

### `handleReject(session)`
- Calls `rejectSession(sessionId)`
- Removes session or marks as rejected
- Refreshes sessions list
- Shows success toast notification

### `handleSchedule(sessionId, payload)`
- Calls `scheduleSession(sessionId, {scheduledAt, meetingLink})`
- Updates session with scheduled date/time
- Sets meeting link if provided
- Refreshes sessions list
- Shows success toast notification

---

## API Endpoints Mapped to Routes

| Route | Method | Endpoint | Purpose |
|-------|--------|----------|---------|
| `/dashboard` | GET | `/api/sessions/me` | Load user's sessions |
| Dashboard | PUT | `/api/sessions/:id/accept` | Accept session |
| Dashboard | PUT | `/api/sessions/:id/reject` | Reject session |
| Dashboard | PUT | `/api/sessions/:id/schedule` | Schedule session |
| `/session/:id` | GET | `/api/sessions/me` | Get all sessions (find by ID) |
| `/session/:id` | POST | `/api/sessions/:id/rate` | Submit rating & feedback |
| `/mentor/:id` | GET | `/api/mentors/:id` | Get mentor details |
| `/mentors` | GET | `/api/mentors?skill=X&minRating=Y` | Browse mentors with filters |
| `/skills` | GET | `/api/skills` | Browse skills |
| `/profile` | GET | `/api/me` | Get current user profile |
| `/profile` | PUT | `/api/me` | Update user profile |

---

## Common Issues Fixed

1. ✅ **Missing Session Handlers** - Added `handleAccept`, `handleReject`, `handleSchedule` to Dashboard
2. ✅ **Routing Flow** - Structured protected vs public routes properly
3. ✅ **Auth Guard** - Root `/` redirects based on auth status
4. ✅ **Login/Signup Protection** - Redirects logged-in users away from auth pages
5. ✅ **Loading State** - App shows loading screen during auth initialization
6. ✅ **Tailwind CSS** - Properly configured and imported
