# SkillSwap - Complete Testing & Debugging Guide

**Last Updated**: December 7, 2025  
**Status**: All Critical Fixes Applied - Ready for Testing

---

## 🚀 QUICK START

### Prerequisites Check
```bash
# 1. Verify Node.js
node -v  # Should be v16+ 
npm -v   # Should be v8+

# 2. Verify MongoDB is running
mongosh --eval "db.adminCommand('ping')"
# Expected output: { ok: 1 }

# 3. Check ports availability
netstat -ano | findstr :5000    # Backend port
netstat -ano | findstr :5173    # Frontend port
netstat -ano | findstr :27017   # MongoDB port
```

### Directory Structure Check
```
c:\Users\chira\OneDrive\Desktop\New folder\
├── backend/
│   ├── models/
│   │   ├── Session.js       ✅ FIXED (enum, fromName)
│   │   ├── user.js          ✅ FIXED (reviews array)
│   │   └── ...
│   ├── controllers/
│   │   ├── sessionController.js  ✅ FIXED (meetingLink)
│   │   └── ...
│   ├── server.js            ✅ FIXED (socket fromName)
│   └── ...
├── frontend/
│   └── my-app/
│       └── src/
│           ├── pages/
│           │   ├── Login.jsx     ✅ FIXED (renamed from login.jsx)
│           │   └── ...
│           └── App.jsx            ✅ FIXED (import case)
└── ...
```

---

## 📋 PRE-LAUNCH CHECKLIST

### Backend Setup
```bash
# Terminal 1: Navigate to backend
cd backend

# Check dependencies
npm ls | head -20

# Verify environment
cat .env | grep -E "PORT|MONGO_URI|JWT_SECRET"

# Expected Output:
# PORT=5000
# MONGO_URI=mongodb://127.0.0.1:27017/skillswap
# JWT_SECRET=eb726f84470232b908090258f30e2e9ba8395d367d8a405df7871a5150e3cb98
```

### Frontend Setup
```bash
# Terminal 2: Navigate to frontend
cd frontend/my-app

# Check dependencies
npm ls | head -20

# Verify config
cat vite.config.js | grep -A 5 "plugins:"
```

---

## 🏃 STARTING THE APPLICATION

### Step 1: Start MongoDB
```bash
# Windows
net start MongoDB

# macOS/Linux
brew services start mongodb-community

# Verify
mongosh --eval "db.adminCommand('ping')"
# Expected: { ok: 1 }
```

### Step 2: Start Backend Server
```bash
# Terminal 1
cd backend
npm start

# Expected Console Output:
# > backend@1.0.0 start
# > node server.js
# 
# MongoDB connected: 127.0.0.1
# Server (with sockets) running at http://localhost:5000
```

### Step 3: Start Frontend Dev Server
```bash
# Terminal 2
cd frontend/my-app
npm run dev

# Expected Console Output:
# > skill-swap-frontend@1.0.0 dev
# > vite
#
#   VITE v7.2.6  ready in 150 ms
#   ➜  Local:   http://localhost:5173/
#   ➜  press h + enter to show help
```

### Step 4: Verify Both Services
```bash
# Terminal 3 - Test Backend
curl http://localhost:5000/
# Expected: SkillSwap API is running...

curl http://localhost:5000/api/auth/me -H "Cookie: accessToken=invalid"
# Expected: {"message":"Token is not valid"}

# Test Frontend (open in browser)
# http://localhost:5173
# Expected: Shows Login page
```

---

## 🧪 COMPREHENSIVE TEST SCENARIOS

### Test 1: Authentication Flow ✅

#### 1.1 Register New User
```
Action: Click "Sign up" on login page
Input:
  - Name: "John Developer"
  - Email: "john@example.com"
  - Password: "password123"

Expected:
  ✅ Form submits without error
  ✅ Redirects to /home (auto-login)
  ✅ NavBar shows user name "John Developer"
  ✅ Credits show as 0
```

**Backend Verification**:
```bash
# Check MongoDB
mongosh
use skillswap
db.users.find({ email: "john@example.com" }).pretty()
# Should return user with email, name, passwordHash
```

#### 1.2 Login Existing User
```
Action: Click "Logout" → Then click "Login"
Input:
  - Username: "john@example.com"
  - Password: "password123"

Expected:
  ✅ Form submits
  ✅ Redirects to /home
  ✅ Dashboard loads user data
  ✅ Toast shows "Logged in successfully!"
```

#### 1.3 Invalid Login
```
Input:
  - Username: "john@example.com"
  - Password: "wrongpassword"

Expected:
  ❌ Toast shows "Invalid username/email or password"
  ❌ Stays on /login page
```

---

### Test 2: Dashboard Session Operations ✅

#### 2.1 View Dashboard
```
Action: Logged-in user → Click "Dashboard" in NavBar
Expected:
  ✅ Shows user profile card with name, credits
  ✅ Profile completeness bar shows 0-100%
  ✅ Sessions section loads
  ✅ "Buy 5 credits" button functional
```

**Debugging**:
```bash
# Check backend logs
# Should see: GET /api/sessions/me [200]

# Test API directly
curl -b "accessToken=YOUR_TOKEN" http://localhost:5000/api/sessions/me
# Should return: { sessions: [] }
```

#### 2.2 Buy Credits
```
Action: Click "Buy 5 credits" button
Expected:
  ✅ Button shows "Processing..."
  ✅ Toast: "5 credits added!"
  ✅ User credits increase by 5
  ✅ Dashboard updates
```

**Backend Verification**:
```bash
# Check updated user
mongosh
use skillswap
db.users.findOne({ email: "john@example.com" }).credits
# Should show 5 or higher
```

---

### Test 3: Session Management (NEW ENUM) ✅

#### 3.1 Request a Session
```
Action: Browse mentors → Click "View Profile" → Request session
Input:
  - Select a date
  - Click "Confirm booking"

Expected:
  ✅ Session created with status "pending" ✅ ENUM FIX VERIFIED
  ✅ Learner credits deducted
  ✅ Toast shows success
  ✅ Redirects to dashboard
```

**Backend Verification**:
```bash
# Check session in database
mongosh
use skillswap
db.sessions.findOne({ status: "pending" })
# Should show: status: "pending" (NEW STATE ADDED)
```

#### 3.2 Accept Session (Mentor Action)
```
Action: 
  1. Login as mentor user
  2. Go to Dashboard
  3. Find pending session
  4. Click "Accept"

Expected:
  ✅ Session status changes to "accepted" ✅ ENUM FIX VERIFIED
  ✅ Toast: "Session accepted!"
  ✅ Card updates with "Schedule" button
```

**Backend Verification**:
```bash
# Verify enum accepts all states
mongosh
use skillswap
# Insert test with each state
db.sessions.insertOne({ mentor: ObjectId("..."), learner: ObjectId("..."), status: "confirmed", scheduledAt: new Date(), durationMins: 60, creditsCost: 1 })
# Should NOT throw enum error (FIXED)
```

#### 3.3 Schedule Session
```
Action: After accepting, click "Schedule"
Input:
  - Date/Time: Pick future date
  - Meeting Link: Leave empty (auto-generate)

Expected:
  ✅ Modal appears with datetime picker
  ✅ Status changes to "scheduled" ✅ ENUM FIX VERIFIED
  ✅ Meeting link auto-generated ✅ SCHEDULE FIX VERIFIED
  ✅ Toast: "Session scheduled!"
```

**Backend Verification**:
```bash
# Check scheduled session
mongosh
use skillswap
db.sessions.findOne({ status: "scheduled" }).pretty()
# Should show:
# - status: "scheduled"
# - meetingLink: "https://zoom.us/meeting/..."
# - scheduledAt: (future date)
```

#### 3.4 Complete & Rate Session
```
Action: After session time, click "Complete" → "Rate"
Input:
  - Rating: 5 stars
  - Feedback: "Great mentor!"

Expected:
  ✅ Session status: "completed" ✅ ENUM FIX VERIFIED
  ✅ Review saved ✅ REVIEWS ARRAY FIX VERIFIED
  ✅ Toast: "Rating submitted"
  ✅ Mentor rating updated
```

**Backend Verification**:
```bash
# Check reviews array
mongosh
use skillswap
db.users.findOne({ _id: ObjectId("MENTOR_ID") }).reviews
# Should show:
# reviews: [
#   { from: ObjectId("LEARNER_ID"), rating: 5, feedback: "Great mentor!", createdAt: ... }
# ]
```

---

### Test 4: Chat & Real-Time Messages ✅

#### 4.1 Send Message
```
Action: Open active session → Type message → Click Send
Input: "Hello mentor!"

Expected:
  ✅ Message appears in chat with sender name ✅ FROMNAME FIX VERIFIED
  ✅ Shows "John Developer: Hello mentor!"
  ✅ Timestamp displays
  ✅ No validation errors
```

**Socket.io Verification**:
```bash
# Backend logs should show:
# socket {SOCKET_ID} joined {SESSION_ID}
# Message received...
# Socket.io message to room {SESSION_ID}
```

#### 4.2 Real-Time Message Reception
```
Action: 
  1. Open same session in 2 browser tabs
  2. Send message from Tab 1
  3. Check Tab 2

Expected:
  ✅ Message appears in Tab 2 automatically
  ✅ Shows correct sender name ✅ FROMNAME FIX VERIFIED
  ✅ No page refresh needed
```

**Backend Verification**:
```bash
# Check message storage
mongosh
use skillswap
db.sessions.findOne({ _id: ObjectId("...") }).messages
# Should show:
# messages: [
#   { from: ObjectId("USER_ID"), fromName: "John Developer", text: "...", createdAt: ... }
# ]
```

#### 4.3 Chat with Multiple Users
```
Action: 3+ users in session, send messages
Expected:
  ✅ All users see all messages
  ✅ Each message shows correct sender name ✅ FROMNAME FIX VERIFIED
  ✅ Order is chronological
  ✅ No message loss
```

---

### Test 5: User Profile Management ✅

#### 5.1 Edit Profile
```
Action: Click "View Profile" in NavBar
Input:
  - Bio: "Python expert, 5 years experience"
  - GitHub: "https://github.com/john"
  - LinkedIn: "https://linkedin.com/in/john"

Expected:
  ✅ Form saves without errors
  ✅ Toast: "Profile updated!"
  ✅ Data persists on refresh
```

#### 5.2 Add Teaching Skill
```
Action: In profile → "Add teaching skill"
Input:
  - Skill: "Python"
  - Level: "expert"

Expected:
  ✅ Skill added to "teaches" array
  ✅ Shows as pill/card
  ✅ Can remove skill
```

#### 5.3 Upload Demo Video
```
Action: Click "Add demo video"
Input:
  - URL: "https://youtube.com/watch?v=..."
  - Description: "Python basics tutorial"

Expected:
  ✅ Video added to demoVideos array
  ✅ Shows with description
  ✅ Can be removed
```

---

### Test 6: Browse & Mentor Discovery ✅

#### 6.1 Browse Skills
```
Action: Click "Skills" → Browse page
Expected:
  ✅ Grid of skills loads
  ✅ Search filter works
  ✅ Category sidebar functional
  ✅ No console errors
```

#### 6.2 Browse Mentors
```
Action: Click "Mentors"
Input:
  - Filter by skill: "Python"
  - Filter by rating: "4★+"

Expected:
  ✅ Mentors filtered correctly
  ✅ Shows: name, rating, teaches list
  ✅ "View Profile" button works
```

#### 6.3 View Mentor Detail
```
Action: Click "View Profile" on a mentor
Expected:
  ✅ Full profile loads
  ✅ Shows bio, GitHub, LinkedIn
  ✅ Shows demo videos ✅ FROMNAME FIX (indirectly used)
  ✅ Shows teaching skills
  ✅ "Book session" button works
```

---

## 🐛 DEBUGGING COMMON ISSUES

### Issue 1: Backend Not Starting
```
Symptom: "MongoDB connection error"

Debug Steps:
1. Check if MongoDB running
   mongosh --eval "db.adminCommand('ping')"
   
2. Check .env MONGO_URI
   cat backend/.env | grep MONGO_URI
   
3. Check port 27017 not in use
   netstat -ano | findstr 27017
   
4. Verify MongoDB service
   sc query MongoDB
   # If not running: net start MongoDB

Solution:
   - Start MongoDB: mongosh --version
   - Ensure URI matches your setup
   - Add console.log to verify connection
```

### Issue 2: Frontend API Errors
```
Symptom: "Failed to load skills" or API 404 errors

Debug Steps:
1. Open browser DevTools (F12)
2. Network tab → Check request URLs
3. Should see: http://localhost:5000/api/...
4. Check response status (should be 200)

Common Causes:
   - Backend not running
   - Wrong API URL (check .env VITE_API_URL)
   - CORS not configured
   - Wrong endpoint path

Solution:
   1. Verify backend: curl http://localhost:5000/
   2. Check VITE_API_URL in frontend/.env (if exists)
   3. Check CORS in backend/server.js line 37-42
```

### Issue 3: Socket.io Connection Failed
```
Symptom: Chat not working, socket errors in console

Debug Steps:
1. Backend console: Should show "A user connected: {SOCKET_ID}"
2. Frontend console: Check for socket.io errors
3. Network tab: Check WebSocket connection

Solution:
   1. Ensure backend server running
   2. Check socket URL in ChatBox.jsx line 20
   3. Verify transports: ['websocket']
   4. Check CORS config includes socket.io
```

### Issue 4: Enum Error When Creating Session
```
Symptom: "Enum validation error: invalid status 'scheduled'"

This means: ❌ Models NOT updated

Fix:
   1. Check backend/models/Session.js line 18-21
   2. Verify enum includes:
      ['pending', 'accepted', 'rejected', 'confirmed', 'scheduled', 'completed', 'cancelled']
   3. Restart backend: npm start
   4. Test again

To verify enum fixed:
   mongosh
   use skillswap
   db.sessions.insertOne({ status: "scheduled", mentor: ObjectId(), learner: ObjectId(), scheduledAt: new Date(), durationMins: 60, creditsCost: 1 })
   # Should succeed without error
```

### Issue 5: Chat Showing Sender ID Instead of Name
```
Symptom: Messages show "User: 507f1f77bcf86cd799439011"

This means: ❌ fromName FIX not applied

Fix:
   1. Check backend/models/Session.js line 5
   2. MessageSchema should have: fromName: { type: String, default: 'Unknown' }
   3. Check backend/server.js line 80-94
   4. Should fetch user and extract name: const fromName = user ? user.name : 'Unknown'
   5. Restart backend

To verify fix:
   mongosh
   use skillswap
   db.sessions.findOne().messages[0]
   # Should include: fromName: "User Name"
```

### Issue 6: Reviews Array Error
```
Symptom: "TypeError: Cannot read property 'push' of undefined"

This means: ❌ reviews array not in schema

Fix:
   1. Check backend/models/user.js around line 91
   2. Should have reviews array field
   3. Restart backend
   4. Restart frontend

To verify:
   mongosh
   db.users.findOne()._id | jq '.reviews'
   # Should show array or empty array []
```

### Issue 7: Login File Case Error
```
Symptom: "Module not found: Can't resolve './pages/login'" (on Linux/Docker)

This means: ❌ Case sensitivity issue

Fix:
   1. Verify file exists: frontend/my-app/src/pages/Login.jsx (capital L)
   2. Check import in App.jsx: import Login from "./pages/Login"
   3. Should both be capitalized

To verify:
   ls -la frontend/my-app/src/pages/ | grep -i login
   # Should show: Login.jsx (capital L)
```

---

## 📊 TEST RESULTS TRACKING

### Create Test Log
```
Create file: TEST_LOG_[DATE].md

Template:
# Test Log - [DATE]

## Environment
- Node: [version]
- MongoDB: [version]
- Browser: [version]

## Test Results

### Auth Tests
- [ ] Register user - PASS/FAIL - Notes:
- [ ] Login user - PASS/FAIL - Notes:
- [ ] Invalid login - PASS/FAIL - Notes:
- [ ] Logout - PASS/FAIL - Notes:

### Session Tests
- [ ] Request session - PASS/FAIL - Notes:
- [ ] Accept session - PASS/FAIL - Notes:
- [ ] Schedule session - PASS/FAIL - Notes:
- [ ] Complete session - PASS/FAIL - Notes:
- [ ] Rate session - PASS/FAIL - Notes:

### Chat Tests
- [ ] Send message - PASS/FAIL - Notes:
- [ ] Receive message - PASS/FAIL - Notes:
- [ ] Multiple users - PASS/FAIL - Notes:
- [ ] Message display - PASS/FAIL - Notes:

### Issues Found
- Issue 1: ...
- Issue 2: ...

## Notes
...
```

---

## 🎯 PERFORMANCE MONITORING

### Frontend Performance
```javascript
// Browser Console
// Check initial load time
window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
// Should be < 3000ms

// Check API response times
// Open Network tab → Sort by Time
// Should be < 500ms per request
```

### Backend Performance
```bash
# Monitor backend logs
npm start | grep -E "GET|POST|PUT|DELETE" | tail -20

# Should show response times like:
# GET /api/sessions/me 200 - 45ms
```

### Database Performance
```bash
# Check query performance
mongosh
use skillswap
db.sessions.find().explain("executionStats")
# Should show executionStages.nReturned matches filters
```

---

## ✅ FINAL VERIFICATION CHECKLIST

- [ ] Backend starts without errors
- [ ] MongoDB connection successful
- [ ] Frontend loads on port 5173
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Dashboard loads user data
- [ ] Can request session (no enum error)
- [ ] Can accept session (no enum error)
- [ ] Can schedule session (no enum error)
- [ ] Can send chat message (shows sender name)
- [ ] Can complete session (no enum error)
- [ ] Can submit rating (reviews array works)
- [ ] Can view mentor profile
- [ ] Can browse skills
- [ ] Toast notifications display
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive design works
- [ ] All buttons functional
- [ ] Session states persist correctly
- [ ] Chat messages persist correctly

---

## 📞 SUPPORT COMMANDS

Quick reference:
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Check port usage
netstat -ano | findstr :5000
netstat -ano | findstr :5173
netstat -ano | findstr :27017

# View MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Backend console logs with timestamps
npm start 2>&1 | tee -a backend.log

# Frontend console logs
npm run dev 2>&1 | tee -a frontend.log

# Test API endpoint
curl -X GET http://localhost:5000/api/auth/me \
  -H "Cookie: accessToken=VALUE" \
  -H "Content-Type: application/json"
```

---

## 📝 NOTES FOR DEVELOPERS

1. **Always restart backend after model changes**
   - Mongoose caches schemas
   - Changes won't apply without restart

2. **Check browser console for errors**
   - F12 → Console tab
   - Network tab shows all API calls

3. **Use MongoDB Compass for data inspection**
   - Visual database explorer
   - Easier than mongosh for complex queries

4. **Enable CORS debugging**
   - Add to Chrome DevTools: Device Mode → Settings → Network
   - Check for CORS errors in Network tab

5. **Socket.io troubleshooting**
   - Open: http://localhost:5000/socket.io/
   - Should respond with socket.io library info

