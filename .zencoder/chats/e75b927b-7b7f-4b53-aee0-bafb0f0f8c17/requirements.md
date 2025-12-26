# Feature Specification: SkillSync Phase 2 - Real-time Communication & Recommendations

## User Stories

### User Story 1 - Real-time Chat During Sessions

**Acceptance Scenarios**:

1. **Given** a scheduled session exists, **When** both participants navigate to the session detail page, **Then** they can see a real-time chat interface
2. **Given** two users are in the same session chat, **When** one user sends a message, **Then** the other user receives it instantly without page refresh
3. **Given** a user sends a message in session chat, **When** the message is delivered, **Then** it is persisted to the Chat collection in MongoDB
4. **Given** a user rejoins a session chat, **When** the chat loads, **Then** all previous messages are displayed from the database

---

### User Story 2 - Video Call Integration

**Acceptance Scenarios**:

1. **Given** a session is accepted and scheduled, **When** the session is created/updated, **Then** a unique Jitsi meeting link is generated and stored in `Session.meetingLink`
2. **Given** a session has a meeting link, **When** a participant views the session details, **Then** they see a clickable meeting link to join the video call
3. **Given** the `JITSI_BASE_URL` is configured, **When** generating meeting links, **Then** the link uses the configured base URL (default: `https://meet.jit.si`)

---

### User Story 3 - Email Notifications

**Acceptance Scenarios**:

1. **Given** `EMAIL_ENABLED=true`, **When** a user requests a new session, **Then** the potential mentor receives an email notification with session details
2. **Given** a mentor accepts a session request, **When** the session is scheduled, **Then** both participants receive an email with the date, time, and meeting link
3. **Given** `EMAIL_ENABLED=false`, **When** email-triggering events occur, **Then** no emails are sent (useful for local development)
4. **Given** a session is scheduled with reminder enabled, **When** the configured time before session arrives, **Then** both participants receive a reminder email

---

### User Story 4 - ML-Based Skill Recommendations

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they view the dashboard or browse skills, **Then** they see a "Recommended for you" section with personalized skill suggestions
2. **Given** a user has completed sessions in specific categories, **When** recommendations are generated, **Then** skills in related categories are prioritized
3. **Given** a learner user, **When** requesting recommendations, **Then** skills with highly-rated mentors are prioritized
4. **Given** a user's activity history (sessions, ratings), **When** recommendations are calculated, **Then** the algorithm considers past sessions, categories, tags, and ratings

---

## Requirements

### Functional Requirements

#### Real-time Chat (Socket.io)
- **FR-1.1**: Integrate Socket.io with the existing Express server on port 5000
- **FR-1.2**: Authenticate Socket.io connections using existing JWT cookies/tokens
- **FR-1.3**: Support session-specific chat rooms (one room per Session document)
- **FR-1.4**: Persist all chat messages to the existing Chat collection
- **FR-1.5**: Maintain backward compatibility with existing REST chat endpoints
- **FR-1.6**: Emit real-time events for: message sent, message received, user joined, user left

#### Video Call Integration (Jitsi)
- **FR-2.1**: Generate unique Jitsi meeting links for scheduled sessions
- **FR-2.2**: Store meeting links in the existing `Session.meetingLink` field
- **FR-2.3**: Support configurable `JITSI_BASE_URL` (default: `https://meet.jit.si`)
- **FR-2.4**: Expose meeting links via session detail API endpoint
- **FR-2.5**: Display meeting link in frontend session detail view with clear call-to-action

#### Email Notifications
- **FR-3.1**: Implement a provider-agnostic mailer abstraction layer
- **FR-3.2**: Default implementation for SendGrid-like API-based providers
- **FR-3.3**: Support global enable/disable via `EMAIL_ENABLED` environment variable
- **FR-3.4**: Send email on new session request (to potential mentor)
- **FR-3.5**: Send email on session acceptance/scheduling (to both participants, include meeting link)
- **FR-3.6**: Optional: Send reminder email before session start
- **FR-3.7**: Include relevant session details: date, time, skill, participant names, meeting link

#### ML-Based Recommendations
- **FR-4.1**: Implement heuristic-based recommendation engine in Node.js
- **FR-4.2**: Use MongoDB aggregation queries to analyze user activity
- **FR-4.3**: Consider factors: user role, past sessions, skill categories, tags, ratings
- **FR-4.4**: Expose authenticated endpoint `GET /api/recommendations`
- **FR-4.5**: Return recommended skills with relevance scores
- **FR-4.6**: Encapsulate logic in a service module for future ML service integration
- **FR-4.7**: Display recommendations in frontend dashboard or skill browse page

### Non-Functional Requirements

#### Performance
- **NFR-1.1**: Socket.io connections must establish within 2 seconds
- **NFR-1.2**: Real-time messages delivered with <500ms latency under normal network conditions
- **NFR-1.3**: Recommendation endpoint responds within 1 second for typical user history

#### Scalability
- **NFR-2.1**: Socket.io architecture must support at least 100 concurrent connections
- **NFR-2.2**: Email sending must be asynchronous and non-blocking

#### Security
- **NFR-3.1**: Socket.io connections must be authenticated
- **NFR-3.2**: Users can only join chat rooms for sessions they are participants in
- **NFR-3.3**: Email credentials and API keys stored securely in environment variables
- **NFR-3.4**: Meeting links must be unique and non-guessable

#### Maintainability
- **NFR-4.1**: Email provider abstraction allows swapping providers without changing business logic
- **NFR-4.2**: Recommendation engine encapsulated in dedicated service module
- **NFR-4.3**: All new environment variables documented in `.env` files
- **NFR-4.4**: Code follows existing project patterns (controllers, routes, Zustand stores)

#### Compatibility
- **NFR-5.1**: Existing REST API endpoints remain functional
- **NFR-5.2**: Frontend works with or without Socket.io connection
- **NFR-5.3**: System functions properly when `EMAIL_ENABLED=false`

---

## Success Criteria

### Real-time Chat
- ✅ Two users in the same session can exchange messages in real-time
- ✅ Messages persist to database and load on page refresh
- ✅ Existing REST chat endpoints continue to work
- ✅ Socket.io authentication prevents unauthorized access

### Video Calls
- ✅ Every scheduled session has a unique Jitsi meeting link
- ✅ Meeting links are displayed in session detail view
- ✅ Participants can click the link and join a Jitsi video call
- ✅ Meeting link generation uses configured `JITSI_BASE_URL`

### Email Notifications
- ✅ Session request emails delivered to mentors within 30 seconds
- ✅ Session scheduled emails include all required details (date, time, meeting link)
- ✅ Email sending can be disabled via `EMAIL_ENABLED=false`
- ✅ Email provider can be swapped by changing configuration (no code changes)

### ML Recommendations
- ✅ Recommendation endpoint returns personalized skill suggestions
- ✅ Recommendations reflect user's past activity and preferences
- ✅ "Recommended for you" section visible in frontend
- ✅ Recommendation logic isolated in service module for future upgrades

### Overall Integration
- ✅ All Phase 2 features work together without conflicts
- ✅ Existing Phase 1 functionality remains unaffected
- ✅ All new environment variables documented
- ✅ Code follows existing project conventions
- ✅ No breaking changes to frontend or backend APIs
