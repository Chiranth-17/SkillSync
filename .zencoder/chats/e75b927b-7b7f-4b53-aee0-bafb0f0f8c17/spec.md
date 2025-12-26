# Technical Specification: SkillSync Phase 2 - Real-time Communication & Recommendations

## Technical Context

**Language/Version:**
- Backend: Node.js (v16+), Express.js 4.18.2
- Frontend: React 18.3.1 with Vite 7.2.6
- Database: MongoDB 7.0+ with Mongoose 7.0.0
- Real-time: Socket.io 4.8.1 (server & client)
- Testing: Playwright 1.57.0

**Primary Dependencies:**
- **Backend:** `socket.io@4.8.1`, `nodemailer@7.0.11`, `jsonwebtoken@9.0.3`, `uuid@13.0.0`, `express-validator@7.3.1`
- **Frontend:** `socket.io-client@4.8.1`, `zustand@5.0.9`, `react-router-dom@7.10.1`, `react-toastify@11.0.5`
- **Testing:** `@playwright/test@1.57.0`

**Existing Infrastructure:**
- Socket.io already initialized in `backend/server.js` (lines 74-116) with basic session chat
- JWT authentication via HttpOnly cookies (existing middleware in `backend/middleware/auth.js`)
- Existing models: `Session`, `ChatMessage`, `User`, `Skill`
- ML recommender system exists: `backend/ml/skillRecommender.js`, `backend/ml/mentorRecommender.js`
- Frontend API client pattern: `frontend/my-app/src/api/client.js` (Axios with interceptors)

---

## Technical Implementation Brief

### 1. Socket.io Real-time Chat Enhancement

**Current State:**
- Basic Socket.io server integrated in `server.js` (lines 74-116)
- Supports `join`, `message`, `sendMessage` events
- Messages stored in `Session.messages` (embedded MessageSchema)
- No authentication on Socket.io connections

**Implementation:**
- Add Socket.io authentication middleware to verify JWT from handshake auth or cookies
- Create dedicated socket handler file: `backend/sockets/chatHandler.js`
- Implement session-specific room authorization (user must be mentor or learner)
- Keep existing REST endpoints in `backend/routes/sessions.js` for message history
- Add Socket.io connection hook to frontend via custom React hook: `frontend/my-app/src/hooks/useSocket.js`

**Design Decisions:**
- Use JWT token from cookie or handshake query for Socket.io auth
- Emit events: `message:sent`, `message:received`, `user:joined`, `user:left`, `typing:start`, `typing:stop`
- Persist all messages to `Session.messages` to maintain data consistency

---

### 2. Jitsi Video Call Integration

**Current State:**
- `Session.meetingLink` field exists but always null
- No meeting link generation logic

**Implementation:**
- Create utility: `backend/utils/jitsiHelper.js` to generate unique meeting links
- Format: `${JITSI_BASE_URL}/${uniqueRoomId}` where `uniqueRoomId = uuid()` or `session-${sessionId}`
- Generate link when session status changes to `'scheduled'` or `'accepted'`
- Update `backend/controllers/sessionController.js` to populate `meetingLink` on session acceptance
- Add frontend component: `frontend/my-app/src/components/VideoCallButton.jsx` to display meeting link
- Display link in existing session detail views (`SessionCard.jsx`, session detail modals)

**Design Decisions:**
- Use UUID v4 for room IDs to prevent guessing
- Configurable via `JITSI_BASE_URL` (default: `https://meet.jit.si`)
- Meeting link generated server-side on session scheduling, not on-demand

---

### 3. Email Notification System

**Current State:**
- `nodemailer@7.0.11` already installed
- No email service implementation

**Implementation:**
- Create mailer abstraction: `backend/services/emailService.js`
  - Factory pattern to support multiple providers (SendGrid, Nodemailer SMTP, Resend, SES)
  - Default implementation: SendGrid-style API with `@sendgrid/mail` (to be added)
  - Fallback: Nodemailer SMTP transport
- Email templates in `backend/templates/emails/`:
  - `sessionRequest.html` - New session request notification
  - `sessionScheduled.html` - Session accepted/scheduled with meeting link
  - `sessionReminder.html` - Optional reminder before session
- Environment flags:
  - `EMAIL_ENABLED=true/false` - Master switch
  - `EMAIL_PROVIDER=sendgrid|nodemailer` - Provider selection
- Integration points:
  - `backend/controllers/sessionController.js` - Trigger emails on status changes
  - Create `backend/utils/emailQueue.js` for async email sending (optional)

**Design Decisions:**
- Emails sent asynchronously (fire-and-forget with error logging)
- Template variables: `{{userName}}`, `{{sessionDate}}`, `{{meetingLink}}`, `{{skillName}}`
- Graceful degradation: if email fails, log error but don't block API response
- Use existing `User.email` field for recipient addresses

---

### 4. ML-Based Skill Recommendations Enhancement

**Current State:**
- `backend/ml/skillRecommender.js` already implements heuristic-based recommendations
- Uses MongoDB aggregations, user history, categories, tags
- Exposed via `GET /api/ml/recommendations/skills` (in `backend/routes/mlRoutes.js`)
- Caching via `SkillRecommendationCache` model

**Implementation:**
- **No major backend changes required** - existing recommender already meets Phase 2 requirements
- Enhance frontend integration:
  - Create component: `frontend/my-app/src/components/PersonalizedRecommendations.jsx`
  - Add "Recommended for you" section to Dashboard (`frontend/my-app/src/pages/Dashboard.jsx`)
  - Optional: Add to skill browse page sidebar
- Create Zustand store: `frontend/my-app/src/store/recommendationsStore.js`
- API integration: Use existing `frontend/my-app/src/api/ml.js` methods

**Design Decisions:**
- Leverage existing ML infrastructure (weights, caching, fallback)
- Display top 5-10 recommendations on dashboard
- Show recommendation scores and reasons from API response
- Trigger recommendation refresh on user profile updates

---

### 5. Environment Configuration

**New Environment Variables (Backend `.env`):**
```
# Phase 2: Video Calls
JITSI_BASE_URL=https://meet.jit.si

# Phase 2: Email Notifications
EMAIL_ENABLED=false
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=
EMAIL_FROM=noreply@skillsync.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=

# Phase 2: Socket.io
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Source Code Structure

### Backend New/Modified Files

```
backend/
├── services/
│   ├── emailService.js          [NEW] - Email abstraction layer
│   └── emailProviders/
│       ├── sendgridProvider.js  [NEW] - SendGrid implementation
│       └── nodemailerProvider.js [NEW] - SMTP fallback
├── sockets/
│   └── chatHandler.js           [NEW] - Socket.io chat logic with auth
├── templates/
│   └── emails/
│       ├── sessionRequest.html  [NEW] - Email template
│       ├── sessionScheduled.html [NEW] - Email template
│       └── sessionReminder.html [NEW] - Email template
├── utils/
│   ├── jitsiHelper.js           [NEW] - Meeting link generator
│   └── socketAuth.js            [NEW] - Socket.io JWT authentication
├── controllers/
│   └── sessionController.js     [MODIFIED] - Add email triggers, Jitsi link generation
├── server.js                    [MODIFIED] - Enhanced Socket.io setup with auth
└── package.json                 [MODIFIED] - Add @sendgrid/mail
```

### Frontend New/Modified Files

```
frontend/my-app/src/
├── hooks/
│   └── useSocket.js             [NEW] - Socket.io connection hook
├── components/
│   ├── VideoCallButton.jsx      [NEW] - Meeting link display
│   ├── PersonalizedRecommendations.jsx [NEW] - Recommendations widget
│   └── ChatBox.jsx              [MODIFIED] - Integrate real-time Socket.io
├── store/
│   └── recommendationsStore.js  [NEW] - Zustand store for recommendations
├── pages/
│   └── Dashboard.jsx            [MODIFIED] - Add recommendations section
└── api/
    └── socket.js                [NEW] - Socket.io client initialization
```

---

## Contracts

### 1. Socket.io Events

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `auth` | `{ token: string }` | Authenticate connection with JWT |
| `join:session` | `{ sessionId: string }` | Join session-specific room |
| `leave:session` | `{ sessionId: string }` | Leave session room |
| `message:send` | `{ sessionId: string, text: string }` | Send message in session |
| `typing:start` | `{ sessionId: string }` | Indicate user is typing |
| `typing:stop` | `{ sessionId: string }` | Stop typing indicator |

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `auth:success` | `{ userId: string }` | Authentication successful |
| `auth:error` | `{ message: string }` | Authentication failed |
| `message:received` | `{ from: string, fromName: string, text: string, createdAt: Date }` | New message in session |
| `user:joined` | `{ userId: string, userName: string }` | User joined session |
| `user:left` | `{ userId: string }` | User left session |
| `typing` | `{ userId: string, isTyping: boolean }` | Typing indicator |
| `error` | `{ message: string }` | General error |

### 2. API Endpoints (New/Modified)

**Modified Endpoints:**

**`PUT /api/sessions/:id/accept`**
- **Change:** Generate `meetingLink` and trigger email notifications
- **Response:** Adds `meetingLink` field to session object

**`POST /api/sessions`**
- **Change:** Trigger "new session request" email to mentor

### 3. Database Schema Changes

**Session Model (`backend/models/Session.js`):**
```javascript
// No changes needed - meetingLink field already exists
meetingLink: { type: String, default: null }
```

**User Model (`backend/models/user.js`):**
```javascript
// Verify email field exists (should already exist)
email: { type: String, required: true, unique: true }
```

### 4. Email Service Interface

```javascript
// backend/services/emailService.js
interface EmailService {
  sendEmail(options: {
    to: string,
    subject: string,
    html: string,
    text?: string
  }): Promise<{ success: boolean, messageId?: string, error?: string }>
  
  sendSessionRequest(mentor: User, learner: User, session: Session): Promise<void>
  sendSessionScheduled(mentor: User, learner: User, session: Session): Promise<void>
  sendSessionReminder(user: User, session: Session): Promise<void>
}
```

### 5. Jitsi Helper Interface

```javascript
// backend/utils/jitsiHelper.js
interface JitsiHelper {
  generateMeetingLink(sessionId: string): string
  // Returns: https://meet.jit.si/<unique-room-id>
}
```

---

## Delivery Phases

### Phase 2.1: Socket.io Authentication & Real-time Chat
**Scope:** Enhance existing Socket.io implementation with authentication and proper room management

**Deliverables:**
- Socket.io authentication middleware using JWT
- Dedicated chat handler file (`backend/sockets/chatHandler.js`)
- Session room authorization (verify user is participant)
- Frontend hook: `useSocket.js` for connection management
- Enhanced `ChatBox.jsx` with real-time message updates
- Typing indicators

**Verification:**
- Two users in same session see messages instantly
- Unauthorized users cannot join session rooms
- Messages persist to database
- Connection survives page refresh (reconnection)

---

### Phase 2.2: Jitsi Video Call Integration
**Scope:** Generate and display Jitsi meeting links for scheduled sessions

**Deliverables:**
- `backend/utils/jitsiHelper.js` - Meeting link generator
- Modified `sessionController.js` - Auto-generate links on session acceptance
- `VideoCallButton.jsx` component
- Update session detail views to display meeting link
- Environment variable: `JITSI_BASE_URL`

**Verification:**
- Accepted sessions have unique meeting links
- Meeting links use configured `JITSI_BASE_URL`
- Participants can click and join Jitsi call
- Links persist across page refreshes

---

### Phase 2.3: Email Notification System
**Scope:** Implement provider-agnostic email service with SendGrid default

**Deliverables:**
- `backend/services/emailService.js` - Email abstraction layer
- Provider implementations: SendGrid & Nodemailer SMTP
- Email templates: `sessionRequest.html`, `sessionScheduled.html`, `sessionReminder.html`
- Integration with session lifecycle in `sessionController.js`
- Environment variables: `EMAIL_ENABLED`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, etc.
- Async email sending (non-blocking)

**Verification:**
- Mentor receives email on new session request
- Both users receive email with meeting link on session scheduling
- Emails contain correct session details (date, time, skill, meeting link)
- System works with `EMAIL_ENABLED=false` (no emails sent, no errors)
- Email provider swappable via configuration

---

### Phase 2.4: ML Recommendations Frontend Integration
**Scope:** Display existing ML recommendations in frontend UI

**Deliverables:**
- `PersonalizedRecommendations.jsx` component
- `recommendationsStore.js` Zustand store
- Integration in Dashboard page
- Display top 5-10 skill recommendations with scores

**Verification:**
- Dashboard shows "Recommended for you" section
- Recommendations reflect user's past activity and preferences
- API calls use existing `/api/ml/recommendations/skills` endpoint
- Recommendations update on user profile changes
- Fallback to popular skills when ML disabled

---

### Phase 2.5: Integration Testing & Documentation
**Scope:** End-to-end testing of all Phase 2 features working together

**Deliverables:**
- Playwright E2E tests for:
  - Real-time chat flow
  - Video call link generation and display
  - Email notification triggers (mock email service)
  - Recommendations display
- Updated README.md with Phase 2 features
- `.env.example` files for backend and frontend
- API documentation updates

**Verification:**
- All E2E tests pass
- Documentation complete and accurate
- No regressions in Phase 1 functionality

---

## Verification Strategy

### 1. Manual Verification (During Development)

**Phase 2.1 - Real-time Chat:**
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend/my-app
npm run dev

# Manual Steps:
# 1. Open two browser windows (localhost:5173)
# 2. Login as two different users
# 3. Schedule a session between them
# 4. Navigate to session detail in both windows
# 5. Send messages from both sides
# 6. Verify instant delivery
# 7. Refresh page, verify message history loads
# 8. Check MongoDB for persisted messages
```

**Phase 2.2 - Jitsi Integration:**
```bash
# 1. Accept a session request
# 2. Verify API response includes meetingLink
# 3. Check session detail view shows "Join Video Call" button
# 4. Click link, verify Jitsi room opens
# 5. Verify JITSI_BASE_URL is used in link
# 6. Check MongoDB Session.meetingLink field is populated
```

**Phase 2.3 - Email Notifications:**
```bash
# Development (SMTP test):
# Set EMAIL_ENABLED=true, use Ethereal Email (https://ethereal.email)
# EMAIL_HOST=smtp.ethereal.email
# EMAIL_PORT=587

# 1. Request a new session
# 2. Check Ethereal inbox for email to mentor
# 3. Accept session
# 4. Check both users' inboxes for scheduled email
# 5. Verify email contains: date, time, skill, meeting link
# 6. Test with EMAIL_ENABLED=false - no emails sent, no errors
```

**Phase 2.4 - ML Recommendations:**
```bash
# 1. Login and navigate to Dashboard
# 2. Verify "Recommended for you" section appears
# 3. Check API call to /api/ml/recommendations/skills
# 4. Verify recommendations show relevant skills
# 5. Update user profile (add skills)
# 6. Refresh, verify recommendations change
```

### 2. Automated Testing (Playwright E2E)

**Test Framework:** Playwright (already installed in `frontend/my-app`)

**Test Files to Create:**
```
frontend/my-app/tests/
├── phase2/
│   ├── realtime-chat.spec.js
│   ├── video-calls.spec.js
│   ├── email-notifications.spec.js (with mocks)
│   └── recommendations.spec.js
```

**Run Command:**
```bash
cd frontend/my-app
npm run test  # Runs Playwright tests
```

**Example Test (Realtime Chat):**
```javascript
// tests/phase2/realtime-chat.spec.js
test('users can exchange real-time messages', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Login as two users, navigate to same session
  // Send message from page1
  // Verify message appears in page2 without refresh
  // Check message persisted to database
});
```

### 3. Linting & Type Checking

**Backend:**
```bash
cd backend
npm run lint  # ESLint check
```

**Frontend:**
```bash
cd frontend/my-app
npm run build  # Vite build includes type checking
```

### 4. Helper Scripts for Verification

**Script 1: Email Service Tester**
```bash
# backend/scripts/testEmail.js
# Usage: node scripts/testEmail.js <recipient-email>
# Sends a test email to verify configuration
```

**Script 2: Socket.io Connection Tester**
```bash
# backend/scripts/testSocket.js
# Usage: node scripts/testSocket.js
# Attempts Socket.io connection with/without auth
```

**Script 3: Recommendation Quality Checker**
```bash
# backend/scripts/testRecommendations.js <userId>
# Fetches recommendations and displays scores/reasons
```

### 5. MCP Servers (Optional for Advanced Verification)

**Recommended MCP Servers:**
1. **@modelcontextprotocol/server-mongodb** - Query MongoDB directly to verify data persistence
2. **Custom Email MCP** - Mock email service for testing (to be created if needed)

**Installation (if needed):**
```bash
npm install -g @modelcontextprotocol/server-mongodb
```

### 6. Sample Input Artifacts

**Required Artifacts:**
- **Test Users:** At least 2 user accounts (mentor & learner) - Can be generated by seeding script
- **Test Sessions:** Sample session data - Generated by existing `backend/scripts/seedDatabase.js`
- **Email Test Account:** Ethereal Email account (free, no signup) - Agent can generate at https://ethereal.email
- **Jitsi Room:** No setup required, uses public `meet.jit.si`

**Artifact Generation:**
```bash
# Seed test data
cd backend
npm run seed  # Creates users, skills, sessions
```

---

## Testing Checklist (Per Phase)

### Phase 2.1 - Socket.io Chat
- [ ] Socket.io server accepts authenticated connections
- [ ] Unauthenticated connections rejected
- [ ] Users can join session rooms
- [ ] Users cannot join sessions they're not part of
- [ ] Real-time message delivery works
- [ ] Messages persist to database
- [ ] Typing indicators work
- [ ] Connection survives page refresh
- [ ] Multiple concurrent sessions work
- [ ] REST endpoints still functional

### Phase 2.2 - Jitsi Integration
- [ ] Meeting links generated on session acceptance
- [ ] Links use configured JITSI_BASE_URL
- [ ] Links are unique per session
- [ ] Links stored in Session.meetingLink
- [ ] Frontend displays meeting link
- [ ] Click link opens Jitsi in new tab
- [ ] Links persist across page refreshes
- [ ] Works with custom JITSI_BASE_URL

### Phase 2.3 - Email Notifications
- [ ] Session request email sent to mentor
- [ ] Session scheduled email sent to both users
- [ ] Emails contain correct session details
- [ ] Meeting link included in scheduled email
- [ ] Emails sent asynchronously (non-blocking)
- [ ] EMAIL_ENABLED=false disables emails
- [ ] Email provider swappable via config
- [ ] Failed emails logged but don't break API
- [ ] Email templates render correctly

### Phase 2.4 - ML Recommendations
- [ ] Recommendations displayed on dashboard
- [ ] API call to /api/ml/recommendations/skills works
- [ ] Recommendations reflect user activity
- [ ] Scores and reasons displayed
- [ ] Fallback to popular skills when ML disabled
- [ ] Recommendations update on profile change
- [ ] Cache prevents excessive DB queries
- [ ] No recommendations for new users (graceful)

### Phase 2.5 - Integration
- [ ] All Phase 2 features work together
- [ ] No conflicts between features
- [ ] Phase 1 functionality unaffected
- [ ] All E2E tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation complete
- [ ] .env.example files updated

---

## Risk Mitigation

**Risk 1: Socket.io Authentication Complexity**
- **Mitigation:** Use existing JWT verification logic from REST API
- **Fallback:** Allow socket connections but authorize room joins separately

**Risk 2: Email Delivery Failures**
- **Mitigation:** Async/fire-and-forget approach, comprehensive logging
- **Fallback:** EMAIL_ENABLED flag allows disabling without code changes

**Risk 3: Jitsi Link Conflicts**
- **Mitigation:** Use UUID v4 for room IDs (extremely low collision probability)
- **Fallback:** Include sessionId in room name for debugging

**Risk 4: Recommendation Performance**
- **Mitigation:** Multi-level caching already implemented (process + DB)
- **Fallback:** Fallback to popular skills on timeout/error

**Risk 5: E2E Test Flakiness**
- **Mitigation:** Use Playwright's auto-waiting, proper selectors
- **Fallback:** Retry mechanism built into Playwright

---

## Performance Targets

- **Socket.io Connection:** <2 seconds to establish authenticated connection
- **Message Delivery:** <500ms latency for real-time messages
- **Email Sending:** <30 seconds for delivery (async, non-blocking)
- **Recommendations API:** <1 second response time
- **Meeting Link Generation:** <100ms (UUID generation)
- **Concurrent Socket Connections:** Support 100+ simultaneous connections

---

## Security Considerations

1. **Socket.io:** Authenticate all connections, authorize room access per session
2. **JWT Tokens:** Reuse existing secure HttpOnly cookie implementation
3. **Email:** Never expose EMAIL_API_KEY in logs or client-side code
4. **Jitsi Links:** Unique UUIDs prevent room guessing
5. **Recommendations:** Ensure user can only request own recommendations
6. **CORS:** Socket.io CORS must match Express CORS configuration

---

## Rollback Plan

If issues arise during deployment:

1. **Socket.io Issues:** Disable real-time features via feature flag, fall back to REST polling
2. **Email Issues:** Set `EMAIL_ENABLED=false`, use in-app notifications only
3. **Jitsi Issues:** Revert `sessionController.js` changes, keep meetingLink null
4. **Recommendations Issues:** ML_SKILL_RECOMMENDATION_ENABLED=false triggers fallback mode

All features designed to degrade gracefully without breaking core functionality.
