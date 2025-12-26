# SkillSwap MVP - Complete Project Guide

## 📋 Project Overview

SkillSwap is a full-stack skill-sharing SaaS platform built with the MERN stack (MongoDB, Express, React, Node.js). It enables users to trade skills with mentors, book learning sessions, conduct real-time chat, and build reputation through ratings.

### Core Features

✅ **User Authentication** - Email/password signup, OAuth (Google, GitHub)
✅ **Profile Management** - User name, avatar, teaches/learns skills, badges
✅ **Skill Marketplace** - Browse skills, categories, search by name
✅ **Mentor Matching** - Find mentors by skill name and rating
✅ **Session Booking** - Request/confirm/complete sessions with credit cost
✅ **Real-time Chat** - WebSocket-based messaging during active sessions
✅ **Ratings & Feedback** - Submit ratings after session completion, compute mentor reputation
✅ **Credits System** - Mock purchase, deduct on booking, reward on completion

---

## 🗂️ Project Structure

```
project-root/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── passport.js           # OAuth strategy config
│   ├── controllers/
│   │   ├── authController.js     # Auth endpoints (login, register, logout)
│   │   ├── mentorController.js   # Mentor search & profile
│   │   ├── sessionController.js  # Session lifecycle (book, confirm, complete, rate)
│   │   ├── skillController.js    # Skill catalog management
│   │   ├── categoryController.js # Category management
│   │   └── userSkillController.js # User teaches/learns management
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── models/
│   │   ├── user.js               # User schema (name, email, teaches, learns, credits, rating, reviews, badges)
│   │   ├── skill.js              # Skill schema (category-based catalog)
│   │   ├── Session.js            # Session schema (booking, messages, feedback, rating)
│   │   ├── RefreshToken.js       # Refresh token management
│   │   └── Category.js           # Skill categories
│   ├── routes/
│   │   ├── auth.js               # Auth routes (POST /login, /register, /logout, /me, /credits)
│   │   ├── skills.js             # Skill routes (GET /, /categories)
│   │   ├── user-skills.js        # User skill routes (POST/DELETE /teaches, /learns)
│   │   ├── mentors.js            # Mentor routes (GET /, /:id)
│   │   ├── sessions.js           # Session routes (POST /, GET /me, PUT /confirm, DELETE)
│   │   ├── categories.js         # Category routes
│   │   └── oauth.js              # OAuth callback routes
│   ├── utils/
│   │   ├── generateToken.js      # JWT token generation
│   │   └── tokenService.js       # Token service utilities
│   ├── scripts/
│   │   └── seedSkills.js         # Database seeding script
│   ├── server.js                 # Express app entry point (socket.io setup)
│   ├── package.json              # Backend dependencies
│   └── .env                       # Environment variables (MongoDB, JWT secret, OAuth keys)

└── frontend/
    └── my-app/
        ├── src/
        │   ├── api/
        │   │   ├── auth.js       # Auth API wrappers (login, register, fetchMe, logout)
        │   │   ├── skills.js     # Skills API (fetch, add/remove teach/learn)
        │   │   ├── mentors.js    # Mentor API (browse, profile)
        │   │   └── sessions.js   # Session API (request, list, confirm, complete, rate)
        │   ├── components/
        │   │   ├── NavBar.jsx    # Top navigation (responsive menu, logout button)
        │   │   ├── SkillCard.jsx # Skill card with "Add to teaches" button
        │   │   ├── SkillGrid.jsx # Grid of skills with search & category filter
        │   │   ├── CategorySidebar.jsx # Category selector (sticky on desktop)
        │   │   ├── SessionCard.jsx # Session display card
        │   │   ├── ChatBox.jsx   # Real-time chat component (socket.io)
        │   │   ├── TeachItem.jsx # Single teach skill display
        │   │   ├── EditSkillModal.jsx # Modal for editing skills
        │   │   ├── ConfirmProvider.jsx # Confirmation dialog provider
        │   └── pages/
        │       ├── login.jsx     # Login page
        │       ├── Signup.jsx    # Sign up page
        │       ├── Dashboard.jsx # User dashboard (credits, sessions, profile completeness)
        │       ├── SkillsBrowse.jsx # Browse skills by category
        │       ├── BrowseMentors.jsx # Find mentors (skill search, rating filter)
        │       ├── MentorDetail.jsx  # Mentor profile & booking form
        │       ├── ActiveSession.jsx # Active session with chat & rating form
        │       ├── ProfilePage.jsx   # User profile (edit, manage teaches/learns)
        │       └── auth/
        │           └── callback.jsx  # OAuth callback handler
        ├── store/
        │   ├── authStore.js      # Zustand auth state (user, login, logout, setUser)
        │   └── skillsStore.js    # Zustand skills state
        ├── utils/
        │   ├── api.js            # Base API configuration (VITE_API_URL)
        │   └── toast.js          # Toast notification helpers
        ├── App.jsx               # Main app router & layout
        ├── main.jsx              # Entry point
        ├── index.css             # Tailwind directives & global styles
        ├── vite.config.js        # Vite configuration
        ├── tailwind.config.js    # Tailwind CSS config
        └── package.json          # Frontend dependencies

├── PROJECT_GUIDE.md              # This file
└── .env (root level)             # Optional: shared environment variables
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud - MongoDB Atlas)
- npm or yarn package manager

### Environment Setup

#### Backend (.env file)

```bash
# Backend/.env
MONGODB_URI=mongodb://localhost:27017/skillswap
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/skillswap

JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/oauth/github/callback

# Frontend
FRONTEND_URL=http://localhost:5173

# Node environment
NODE_ENV=development
```

#### Frontend (.env.local file in frontend/my-app/)

```bash
# frontend/my-app/.env.local
VITE_API_URL=http://localhost:5000/api
```

### Installation & Running

**Backend:**

```bash
cd backend
npm install
npm run dev  # Starts with nodemon (auto-reload)
# OR
npm start    # Direct start
```

Server runs at `http://localhost:5000`

**Frontend:**

```bash
cd frontend/my-app
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (or 5174+ if port taken)

**Database Seeding (Optional):**

```bash
cd backend
node scripts/seedSkills.js  # Populates skills & categories
```

---

## 📡 API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/logout` | Logout & clear session | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |
| PUT | `/api/auth/me` | Update user profile (name, avatar) | Yes |
| POST | `/api/auth/credits` | Add credits (dev endpoint - mock) | Yes |
| GET | `/api/oauth/google` | Google OAuth initiate | No |
| GET | `/api/oauth/github` | GitHub OAuth initiate | No |

### Skills Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | `/api/skills` | List all skills (paginated, searchable) | No |
| GET | `/api/categories` | List skill categories | No |
| POST | `/api/user-skills/me/teaches` | Add skill user teaches | Yes |
| DELETE | `/api/user-skills/me/teaches/:id` | Remove teaching skill | Yes |
| POST | `/api/user-skills/me/learns` | Add skill user wants to learn | Yes |
| DELETE | `/api/user-skills/me/learns/:id` | Remove learning skill | Yes |

### Mentor Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | `/api/mentors` | Browse mentors (filter: skill regex, minRating) | No |
| GET | `/api/mentors/:id` | Get mentor profile & teaches | No |

### Session Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/api/sessions` | Request session booking | Yes |
| GET | `/api/sessions/me` | List user's sessions | Yes |
| PUT | `/api/sessions/:id/confirm` | Mentor confirms session | Yes |
| PUT | `/api/sessions/:id/complete` | Mark session complete & reward mentor | Yes |
| DELETE | `/api/sessions/:id` | Cancel session (refund if >24h before) | Yes |
| POST | `/api/sessions/:id/rate` | Submit rating & feedback | Yes |

### Request/Response Examples

**Login:**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "123abc",
    "name": "John Doe",
    "email": "user@example.com",
    "credits": 10,
    "teaches": [{ name: "Python", level: "expert", _id: "skill1" }],
    "learns": [],
    "rating": 4.5,
    "reviewsCount": 2,
    "badges": []
  }
}
```

**Browse Mentors:**

```bash
GET /api/mentors?skill=python&minRating=3&limit=20
Authorization: Bearer token_here

Response 200:
{
  "mentors": [
    {
      "_id": "mentor1",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "avatarUrl": "https://...",
      "rating": 4.8,
      "reviewsCount": 15,
      "teaches": [
        { "name": "Python", "level": "expert", "skillRef": "skill1" },
        { "name": "JavaScript", "level": "intermediate", "skillRef": "skill2" }
      ]
    }
  ],
  "total": 5
}
```

**Request Session:**

```bash
POST /api/sessions
Authorization: Bearer token_here
Content-Type: application/json

{
  "mentorId": "mentor1",
  "skillId": "skill1",
  "skillName": "Python",
  "scheduledAt": "2025-12-13T10:00:00Z",
  "creditsCost": 1
}

Response 201:
{
  "session": {
    "_id": "session1",
    "mentor": "mentor1",
    "learner": "learner1",
    "skillName": "Python",
    "status": "pending",
    "scheduledAt": "2025-12-13T10:00:00Z",
    "creditsCost": 1,
    "messages": [],
    "feedback": null,
    "rating": null
  }
}
```

---

## 🔌 WebSocket Events (Socket.io)

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ sessionId }` | Join session room for chat |
| `message` | `{ text }` | Send message in session |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{ from, text, createdAt }` | New message in session |

### Example Usage (from ChatBox.jsx):

```javascript
// Connect to socket.io
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

// Join session room
socket.emit("join", { sessionId: "session123" });

// Listen for messages
socket.on("message", (msg) => {
  console.log(`${msg.from}: ${msg.text}`);
});

// Send message
socket.emit("message", { text: "Hello mentor!" });
```

---

## 🔐 Authentication Flow

### Email/Password

1. User fills signup form (name, email, password)
2. Frontend calls `POST /api/auth/register` with hashed password (bcryptjs)
3. Backend validates & creates User document
4. Frontend calls `POST /api/auth/login` with credentials
5. Backend verifies password & returns JWT token
6. Frontend stores token in `localStorage` & auth store
7. All subsequent requests include `Authorization: Bearer <token>` header

### OAuth (Google/GitHub)

1. User clicks "Login with Google"
2. Frontend redirects to `GET /api/oauth/google`
3. Backend initiates Passport Google strategy
4. User grants permissions → redirected to callback
5. Callback handler: finds or creates User, returns JWT
6. Frontend receives token via URL redirect
7. Stores token & user in store

### Logout

1. User clicks "Logout" button in NavBar
2. Frontend calls `POST /api/auth/logout` with token
3. Backend clears session/token
4. Frontend clears localStorage & auth store
5. Redirects to `/login`

---

## 💳 Credits System

### Flow

1. **Initial Credits** - New users get default starting credits (e.g., 5)
2. **Buy Credits (Mock)** - Dashboard "Buy 5 credits" button calls `POST /api/auth/credits`
   - Dev endpoint returns fixed credit grant (for testing)
   - Production: integrate payment gateway (Stripe, PayPal)
3. **Session Booking** - Learner pays credits upfront
   - `requestSession()` deducts `creditsCost` from user
   - Credits stored on User document
4. **Session Completion** - Mentor earns credits
   - `completeSession()` awards mentor 80% of credit cost
   - Example: 1 credit session → mentor gets 0.8 credits
5. **Cancellation** - Refunds if cancelled >24h before
   - `cancelSession()` checks `scheduledAt` vs now
   - If >24h: refund learner, no payment to mentor

### Models

**User Schema:**
```javascript
credits: { type: Number, default: 5 }  // Available balance
```

**Session Schema:**
```javascript
creditsCost: { type: Number, default: 1 },  // Deducted from learner
status: {
  type: String,
  enum: ['pending', 'confirmed', 'completed', 'cancelled'],
  default: 'pending'
},
scheduledAt: Date  // For refund eligibility check
```

---

## ⭐ Ratings & Reputation

### Flow

1. Session marked `completed` by learner
2. Learner sees rating form (1-5 stars + optional feedback)
3. Submits via `POST /api/sessions/:id/rate`
4. Backend:
   - Stores rating & feedback in Session document
   - Computes mentor's average rating: `mentor.rating = avg(all_ratings)`
   - Increments `mentor.reviewsCount`
   - Optionally awards badges (e.g., "5-star mentor" at 100 reviews)
5. Frontend displays mentor's updated rating on profile/mentor-detail pages

### Models

**Session Schema:**
```javascript
feedback: String,        // Written review
rating: { type: Number, min: 1, max: 5 }  // Star rating
```

**User Schema:**
```javascript
reviews: [{           // Array of rating objects
  from: ObjectId,    // Learner who rated
  rating: Number,
  feedback: String,
  createdAt: Date
}],
rating: Number,       // Average of all ratings
reviewsCount: Number, // Total number of reviews
badges: [{            // Achievement badges
  key: String,        // e.g., "5-star-mentor"
  title: String,
  earnedAt: Date
}]
```

---

## 🧪 Testing the Full Flow

### Manual End-to-End Test

1. **Signup**
   - Navigate to `/signup`
   - Fill form (name, email, password)
   - See success message & redirect to login
   - Login with credentials

2. **Complete Profile**
   - Go to `/profile`
   - Edit name & upload avatar
   - Add 2-3 teaching skills (e.g., Python, JavaScript)
   - Add 1-2 learning skills (e.g., Spanish, Design)
   - See profile completeness bar increase

3. **Browse & Find Mentors**
   - Click "Find Mentors" in navbar
   - Search by skill name (e.g., "python")
   - Filter by rating (e.g., 3★+)
   - Click on mentor to view profile & teaches

4. **Book Session**
   - On mentor detail, click "Book session" on a teach
   - Should deduct 1 credit from your account
   - Session appears in Dashboard
   - Status: "pending" (awaiting mentor confirmation)

5. **Confirm Session**
   - Logout, login as mentor
   - Dashboard shows session request
   - Click "Confirm" to accept booking
   - Session status changes to "confirmed"

6. **Real-time Chat**
   - Click session to view active session page
   - See ChatBox component
   - Type message & send
   - Messages persist in Session.messages array
   - Both learner & mentor see messages in real-time

7. **Complete & Rate**
   - Click "Mark Complete"
   - Session status → "completed"
   - Learner sees star rating form
   - Submit 4-5 stars + feedback
   - Mentor's profile rating updates
   - Mentor's credits increased by 0.8

8. **Logout**
   - Click "Logout" button in navbar
   - Redirects to login
   - Verify token cleared from localStorage

---

## 📚 Key Technologies

### Backend
- **Express.js** - Web framework
- **MongoDB + Mongoose** - NoSQL database & ODM
- **Socket.io** - Real-time WebSocket communication
- **Passport.js** - OAuth authentication strategy
- **bcryptjs** - Password hashing
- **JWT (jsonwebtoken)** - Token-based auth
- **CORS** - Cross-origin resource sharing
- **morgan** - HTTP request logging

### Frontend
- **React 18** - UI framework
- **Vite** - Lightning-fast build tool
- **React Router v7** - Client-side routing
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first CSS
- **Socket.io-client** - WebSocket client
- **react-toastify** - Toast notifications
- **axios/fetch** - HTTP client

---

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
# Or for Windows PowerShell:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**MongoDB Connection Failed**
- Verify MongoDB is running: `mongod`
- Check MONGODB_URI in .env is correct
- Ensure network access if using Atlas (IP whitelist)

**CORS Errors**
- Verify FRONTEND_URL in backend .env
- Verify VITE_API_URL in frontend .env.local
- Check credentials: include in fetch options

**Socket.io Not Connecting**
- Verify backend socket.io server initialized in server.js
- Check frontend imports: `import { io } from "socket.io-client"`
- Verify no port conflicts

**OAuth Callback Fails**
- Verify OAuth app registered with provider (Google/GitHub)
- Check callback URLs match in .env and OAuth app config
- Ensure cookies enabled for session persistence

---

## 📝 Next Steps / Future Enhancements

1. **Payment Integration** - Replace mock credits with Stripe/PayPal
2. **Video/WebRTC** - Add video calling for sessions
3. **Messaging** - Private messages between users (not just session chat)
4. **Calendar/Scheduling** - Better date/time picking for sessions
5. **Notifications** - Email/push notifications for session requests
6. **Advanced Matching** - ML-based mentor recommendations
7. **Verification** - ID/credential verification for skill authenticity
8. **Analytics** - User dashboards, mentor performance metrics
9. **Admin Panel** - Manage users, skills, disputes, payouts
10. **Mobile App** - React Native version

---

## 📞 Support & Contributions

For questions or issues, please refer to the individual README files in `backend/` and `frontend/my-app/`.

---

**Last Updated:** December 6, 2025  
**Project Status:** MVP Complete ✅
