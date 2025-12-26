# Technical Specification: RV College Verification System

## Technical Context

**Stack Overview**:
- **Backend**: Node.js v16+, Express v4.18, MongoDB via Mongoose v7.0
- **Frontend**: React 18.3, Vite 7.2, Tailwind CSS 3.4, React Router DOM 7.10
- **State Management**: Zustand 5.0
- **Testing**: Playwright 1.57
- **Email Services**: SendGrid + Nodemailer (dual provider support)
- **File Upload**: Multer + Cloudinary
- **Authentication**: JWT (cookies + Bearer header), Passport.js for OAuth

**Existing Infrastructure**:
- API Client: Custom `ApiClient` class in `frontend/my-app/src/api/client.js`
- Auth Middleware: `backend/middleware/auth.js` (JWT validation, sets `req.user.id`)
- Email Service: `backend/services/emailService.js` (template-based, dual provider)
- Upload Service: `backend/routes/upload.js` with Cloudinary integration
- Error Handling: Centralized error handler in `backend/middleware/errorHandler.js`

---

## Technical Implementation Brief

### Key Design Decisions

**1. Separate Verification Model**
- Create new `RVVerification` model instead of modifying `User` schema
- Maintains backward compatibility with existing `User.isVerified` and `User.collegeEmail`
- 1:1 relationship via `userId` (unique index)

**2. Auto-Verification Flow**
- Status automatically changes from `"pending"` to `"verified"` after successful OTP verification
- Admin review is **optional audit** - admins can retroactively reject verifications
- Simplifies user experience while maintaining audit capability

**3. Admin Role System**
- Add `role` field to `User` model: `enum: ['user', 'admin']`, default: `'user'`
- New admin middleware: `backend/middleware/adminAuth.js` (checks `req.user.role === 'admin'`)
- Composable with existing auth middleware

**4. Multi-Domain RV Email Support**
- Validate against multiple RV domains: `@rvce.edu.in`, `@rv.edu.in`, `@ms.rvce.edu.in`
- Use regex pattern: `/^[^\s@]+@(rvce\.edu\.in|rv\.edu\.in|ms\.rvce\.edu\.in)$/i`
- Extensible for future colleges via configuration

**5. Public Badge Visibility**
- Badge component reusable across Profile, MentorCard, SkillCard, search results
- Conditional rendering: `rvVerificationStatus === 'verified'`
- Follows existing verification badge pattern (line 88-93 in ProfilePage.jsx)

**6. Email Integration**
- Reuse existing `emailService.js` architecture
- Create new template: `backend/templates/emails/rvVerificationOTP.html`
- Follow existing template pattern with `{{variable}}` replacements

---

## Source Code Structure

### Backend (New Files)

```
backend/
├── models/
│   └── RVVerification.js              # New RV verification data model
├── controllers/
│   └── rvVerificationController.js     # Business logic for RV verification
├── routes/
│   └── rvVerificationRoutes.js         # API endpoints
├── middleware/
│   └── adminAuth.js                    # Admin role authorization middleware
├── templates/
│   └── emails/
│       └── rvVerificationOTP.html      # OTP email template
└── utils/
    └── otpHelper.js                    # OTP generation utility (optional extraction)
```

### Backend (Modified Files)

```
backend/
├── models/
│   └── User.js                         # ADD: role field (enum: ['user', 'admin'])
└── server.js                           # ADD: app.use('/api/rv-verification', rvVerificationRoutes)
```

### Frontend (New Files)

```
frontend/my-app/src/
├── api/
│   └── rvVerification.js               # API client functions for RV verification
├── components/
│   ├── RVVerificationBadge.jsx         # Reusable badge component
│   └── RVVerificationSection.jsx       # Profile section for RV verification UI
└── hooks/
    └── useRVVerification.js            # Custom hook for verification state/actions
```

### Frontend (Modified Files)

```
frontend/my-app/src/
└── pages/
    └── ProfilePage.jsx                 # ADD: <RVVerificationSection /> component
```

---

## Contracts

### 1. Database Schema: RVVerification Model

**File**: `backend/models/RVVerification.js`

```javascript
{
  userId: ObjectId,              // ref: 'User', required, unique
  rvEmail: String,               // required, validated against RV domains
  rvLoginId: String,             // optional (e.g., "23RVCS123")
  idCardImageUrl: String,        // required, Cloudinary URL
  otp: String,                   // 6-digit code (TODO: hash in future)
  otpExpiresAt: Date,            // OTP expiration timestamp
  emailVerified: Boolean,        // default: false
  status: String,                // enum: ['pending', 'verified', 'rejected'], default: 'pending'
  verifiedAt: Date,              // timestamp when status changed to 'verified'
  rejectedAt: Date,              // timestamp when status changed to 'rejected'
  notes: String,                 // admin notes/comments
  createdAt: Date,               // auto-managed
  updatedAt: Date                // auto-managed
}

// Index: { userId: 1 } unique
```

### 2. Database Schema: User Model Extension

**File**: `backend/models/User.js` (ADDITIVE ONLY)

```javascript
// ADD this field to existing UserSchema:
{
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}
```

### 3. API Endpoints

#### 3.1 POST /api/rv-verification/start

**Purpose**: Initiate RV verification with ID card and email

**Auth**: Required (JWT via existing middleware)

**Request Body**:
```json
{
  "rvEmail": "student@rvce.edu.in",
  "rvLoginId": "23RVCS123",           // optional
  "idCardImageUrl": "https://res.cloudinary.com/.../id.jpg"
}
```

**Validation**:
- `rvEmail` matches regex: `/^[^\s@]+@(rvce\.edu\.in|rv\.edu\.in|ms\.rvce\.edu\.in)$/i`
- `idCardImageUrl` is valid URL string
- User must be authenticated

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent to your RV email",
  "status": "pending",
  "emailVerified": false
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email domain
- `401 Unauthorized`: No auth token
- `500 Internal Server Error`: Email send failure

**Side Effects**:
- Upserts `RVVerification` record for `userId`
- Generates 6-digit OTP, sets expiration (now + 10 min)
- Sends email via `emailService.sendRVVerificationOTP()`

---

#### 3.2 POST /api/rv-verification/verify-otp

**Purpose**: Verify OTP and complete email verification

**Auth**: Required

**Request Body**:
```json
{
  "otp": "123456"
}
```

**Response (200 OK - Valid OTP)**:
```json
{
  "success": true,
  "emailVerified": true,
  "status": "verified",
  "verifiedAt": "2025-12-26T12:00:00.000Z",
  "message": "RV College verification successful!"
}
```

**Response (400 Bad Request - Invalid/Expired OTP)**:
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Response (404 Not Found - No Pending Verification)**:
```json
{
  "success": false,
  "message": "No pending verification found. Please start verification first."
}
```

**Side Effects**:
- Sets `emailVerified = true`
- Sets `status = "verified"` (auto-approval)
- Sets `verifiedAt = new Date()`
- Clears `otp` and `otpExpiresAt` fields

---

#### 3.3 GET /api/rv-verification/status

**Purpose**: Get current user's RV verification status

**Auth**: Required

**Query Params**: None

**Response (200 OK - Verified)**:
```json
{
  "rvVerified": true,
  "status": "verified",
  "rvEmail": "student@rvce.edu.in",
  "rvLoginId": "23RVCS123",
  "idCardImageUrl": "https://res.cloudinary.com/.../id.jpg",
  "emailVerified": true,
  "verifiedAt": "2025-12-26T12:00:00.000Z"
}
```

**Response (200 OK - Pending)**:
```json
{
  "rvVerified": false,
  "status": "pending",
  "emailVerified": false,
  "rvEmail": "student@rvce.edu.in",
  "idCardImageUrl": "https://res.cloudinary.com/.../id.jpg"
}
```

**Response (200 OK - None/Not Started)**:
```json
{
  "rvVerified": false,
  "status": "none"
}
```

**Response (200 OK - Rejected)**:
```json
{
  "rvVerified": false,
  "status": "rejected",
  "notes": "ID card does not match email identity",
  "rejectedAt": "2025-12-26T13:00:00.000Z"
}
```

---

#### 3.4 POST /api/rv-verification/admin-review

**Purpose**: Admin audit/review verification records

**Auth**: Required + Admin role

**Request Body**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "status": "verified" | "rejected",
  "notes": "ID card verified manually"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "verification": {
    "userId": "507f1f77bcf86cd799439011",
    "status": "rejected",
    "notes": "ID card does not match email identity",
    "rejectedAt": "2025-12-26T13:00:00.000Z"
  }
}
```

**Error Responses**:
- `403 Forbidden`: User is not admin
- `404 Not Found`: No verification record for userId
- `400 Bad Request`: Cannot verify if `emailVerified === false`

**Side Effects**:
- Updates `status` field
- Sets `verifiedAt` (if status = "verified") or `rejectedAt` (if status = "rejected")
- Stores `notes`

---

#### 3.5 GET /api/rv-verification/admin/pending (Optional - Nice to Have)

**Purpose**: List pending verifications for admin review

**Auth**: Required + Admin role

**Query Params**: 
- `limit` (default: 20)
- `offset` (default: 0)
- `status` (default: 'pending', accepts: 'pending', 'verified', 'rejected')

**Response (200 OK)**:
```json
{
  "verifications": [
    {
      "userId": "507f...",
      "user": { "name": "John Doe", "email": "john@example.com" },
      "rvEmail": "john@rvce.edu.in",
      "rvLoginId": "23RVCS123",
      "idCardImageUrl": "https://...",
      "status": "pending",
      "emailVerified": true,
      "createdAt": "2025-12-26T10:00:00.000Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### 4. Frontend API Client Functions

**File**: `frontend/my-app/src/api/rvVerification.js`

```javascript
import { client } from './client';

export async function startRVVerification(payload) {
  // payload: { rvEmail, rvLoginId?, idCardImageUrl }
  return client.post('/rv-verification/start', payload);
}

export async function verifyRVOTP(payload) {
  // payload: { otp }
  return client.post('/rv-verification/verify-otp', payload);
}

export async function getRVVerificationStatus() {
  return client.get('/rv-verification/status');
}

// Admin functions
export async function adminReviewVerification(payload) {
  // payload: { userId, status, notes }
  return client.post('/rv-verification/admin-review', payload);
}

export async function adminListPendingVerifications(params) {
  // params: { limit?, offset?, status? }
  const query = new URLSearchParams(params).toString();
  return client.get(`/rv-verification/admin/pending?${query}`);
}
```

---

### 5. Email Template Contract

**File**: `backend/templates/emails/rvVerificationOTP.html`

**Template Variables**:
- `{{userName}}` - User's display name
- `{{rvEmail}}` - The RV email being verified
- `{{otp}}` - 6-digit OTP code
- `{{expiryMinutes}}` - OTP expiry time (e.g., "10")

**Email Subject**: `Your RV College Verification OTP - SkillSync`

**Sample Content**:
```html
<!DOCTYPE html>
<html>
<body>
  <h2>RV College Verification</h2>
  <p>Hi {{userName}},</p>
  <p>You are verifying your RV College email: <strong>{{rvEmail}}</strong></p>
  <p>Your One-Time Password (OTP) is:</p>
  <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb;">{{otp}}</h1>
  <p>This OTP will expire in <strong>{{expiryMinutes}} minutes</strong>.</p>
  <p>If you did not request this, please ignore this email.</p>
  <hr>
  <p style="color: #666; font-size: 12px;">SkillSync - Skill Exchange Platform</p>
</body>
</html>
```

---

## Delivery Phases

### Phase 1: Backend Foundation (Testable via Postman/curl)

**Deliverables**:
1. ✅ `RVVerification` Mongoose model with schema and indexes
2. ✅ `User.role` field addition (migration safe - defaults to 'user')
3. ✅ Admin middleware (`backend/middleware/adminAuth.js`)
4. ✅ RV verification controller with all 4 core endpoints:
   - POST `/start`
   - POST `/verify-otp`
   - GET `/status`
   - POST `/admin-review`
5. ✅ Routes configuration and registration in `server.js`
6. ✅ Email template for OTP
7. ✅ Email service integration (new `sendRVVerificationOTP` function)

**Acceptance Criteria**:
- Server starts without errors
- All routes respond to requests (tested with curl/Postman)
- OTP email is sent successfully
- OTP validation logic works (valid/invalid/expired cases)
- Admin middleware correctly rejects non-admin users
- Database operations succeed (upsert, read, update)

**Testing**: Manual API testing with Postman, curl, or HTTP client

---

### Phase 2: Frontend UI Components (Visual Verification)

**Deliverables**:
1. ✅ `rvVerification.js` API client module
2. ✅ `useRVVerification` custom hook with state management
3. ✅ `RVVerificationSection` component for ProfilePage
   - Input: RV email, RV login ID (optional)
   - File upload: ID card photo (via existing upload endpoint)
   - Button: "Send OTP"
   - OTP input field (conditional rendering)
   - Button: "Verify OTP"
   - Status messages for each state
4. ✅ `RVVerificationBadge` component (reusable)
5. ✅ Integration in `ProfilePage.jsx`

**Acceptance Criteria**:
- Profile page loads without errors
- RV verification section is visible to logged-in users
- ID card upload works via existing Cloudinary integration
- OTP email is sent when user clicks "Send OTP"
- OTP input appears after successful email send
- Success/error messages display appropriately
- UI matches existing Tailwind design patterns

**Testing**: 
- Dev server visual inspection
- Manual user flow testing in browser
- Console error checks

---

### Phase 3: Badge Display & Public Visibility

**Deliverables**:
1. ✅ Badge display on ProfilePage (user's own profile)
2. ✅ Badge display on other users' profiles
3. ✅ Badge integration in:
   - `MentorCard.jsx` (mentor listings)
   - `SkillCard.jsx` (if user-specific)
   - Search results (if applicable)
4. ✅ Fetch verification status on profile load
5. ✅ Conditional rendering based on `status === 'verified'`

**Acceptance Criteria**:
- Verified badge appears next to username for verified users
- Badge is visible across all relevant UI components
- Badge styling matches existing verification badge
- Non-verified users do not show badge
- Graceful degradation if verification API fails

**Testing**:
- Visual inspection on multiple pages
- Test with verified and non-verified users
- Browser console checks for errors

---

### Phase 4: Admin Review Interface (Optional - can be curl-based initially)

**Deliverables**:
1. ✅ Admin review API endpoint fully functional
2. ✅ (Optional) Simple admin dashboard component
3. ✅ (Optional) Admin route protection in frontend

**Acceptance Criteria**:
- Admin can review and reject verifications via API
- Admin notes are stored correctly
- Status changes are reflected in user profiles
- Non-admin users cannot access admin endpoints

**Testing**:
- API testing with admin and non-admin users
- Verify status updates propagate to user UI

---

### Phase 5: E2E Testing & Polish

**Deliverables**:
1. ✅ Playwright E2E test for complete verification flow
2. ✅ Lint checks pass (backend + frontend)
3. ✅ Error handling review and edge case testing
4. ✅ Documentation updates (if needed)

**Acceptance Criteria**:
- E2E test covers: start verification → upload ID → send OTP → verify OTP → badge display
- All tests pass in CI/CD
- No lint errors
- Edge cases handled (expired OTP, invalid email, network errors)

**Testing**:
- `npm run test` (Playwright)
- `npm run lint` (backend + frontend)

---

## Verification Strategy

### Tools & Commands

#### Backend Verification

**1. Lint Check**:
```bash
cd backend
npm run lint
```

**2. Server Start**:
```bash
cd backend
npm start
# or
npm run dev
```

**3. API Testing** (Manual):
- Use Postman, Insomnia, or curl
- Test collection should include:
  - POST `/api/rv-verification/start` (authenticated)
  - POST `/api/rv-verification/verify-otp` (authenticated)
  - GET `/api/rv-verification/status` (authenticated)
  - POST `/api/rv-verification/admin-review` (admin authenticated)

**Sample curl commands**:
```bash
# 1. Start verification (get token from login first)
curl -X POST http://localhost:5000/api/rv-verification/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rvEmail": "test@rvce.edu.in",
    "rvLoginId": "23RVCS123",
    "idCardImageUrl": "https://res.cloudinary.com/test/image/upload/id.jpg"
  }'

# 2. Verify OTP
curl -X POST http://localhost:5000/api/rv-verification/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"otp": "123456"}'

# 3. Check status
curl -X GET http://localhost:5000/api/rv-verification/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Frontend Verification

**1. Dev Server**:
```bash
cd frontend/my-app
npm run dev
```
Access at `http://localhost:5173`

**2. Build Check**:
```bash
cd frontend/my-app
npm run build
```

**3. Visual Verification Checklist**:
- [ ] Profile page loads without errors
- [ ] RV verification section is visible
- [ ] ID card upload button works
- [ ] OTP input appears after email sent
- [ ] Success/error messages display
- [ ] Badge appears on verified profiles
- [ ] Badge visible on mentor cards
- [ ] No console errors

#### E2E Testing

**1. Run Playwright Tests**:
```bash
cd frontend/my-app
npm run test
```

**2. Run Specific Test**:
```bash
npx playwright test tests/rv-verification.spec.js
```

**3. Run in UI Mode** (for debugging):
```bash
npx playwright test --ui
```

---

### Helper Scripts

#### Script 1: Test Email Service

**File**: `backend/scripts/testRVEmail.js`

**Purpose**: Verify that RV OTP emails are sent successfully

```javascript
require('dotenv').config();
const { sendRVVerificationOTP } = require('../services/emailService');

const testData = {
  userEmail: 'test@example.com', // User's account email
  userName: 'Test User',
  rvEmail: 'test@rvce.edu.in',
  otp: '123456',
  expiryMinutes: 10
};

sendRVVerificationOTP(testData)
  .then(result => {
    if (result.success) {
      console.log('✅ Test email sent successfully');
      console.log('Email sent to:', testData.rvEmail);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
```

**Usage**:
```bash
cd backend
node scripts/testRVEmail.js
```

---

#### Script 2: Create Test Admin User

**File**: `backend/scripts/createAdminUser.js`

**Purpose**: Create an admin user for testing admin routes

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

async function createAdmin() {
  await connectDB(process.env.MONGO_URI);
  
  const adminData = {
    name: 'Admin User',
    email: 'admin@skillsync.test',
    passwordHash: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    points: 100
  };

  try {
    const existing = await User.findOne({ email: adminData.email });
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log('✅ Updated existing user to admin:', adminData.email);
    } else {
      const admin = await User.create(adminData);
      console.log('✅ Admin user created:', admin.email);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
```

**Usage**:
```bash
cd backend
node scripts/createAdminUser.js
```

---

#### Script 3: Verification Status Checker

**File**: `backend/scripts/checkVerificationStatus.js`

**Purpose**: Check verification status for a user (by email)

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const RVVerification = require('../models/RVVerification');
const connectDB = require('../config/db');

async function checkStatus(email) {
  await connectDB(process.env.MONGO_URI);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      process.exit(1);
    }

    const verification = await RVVerification.findOne({ userId: user._id });
    
    console.log('\n📋 Verification Status:');
    console.log('User:', user.name, `(${user.email})`);
    console.log('User Role:', user.role || 'user');
    
    if (!verification) {
      console.log('Status: none (not started)');
    } else {
      console.log('Status:', verification.status);
      console.log('RV Email:', verification.rvEmail);
      console.log('Email Verified:', verification.emailVerified);
      if (verification.verifiedAt) {
        console.log('Verified At:', verification.verifiedAt);
      }
      if (verification.notes) {
        console.log('Admin Notes:', verification.notes);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node checkVerificationStatus.js <email>');
  process.exit(1);
}

checkStatus(email);
```

**Usage**:
```bash
cd backend
node scripts/checkVerificationStatus.js user@example.com
```

---

### MCP Servers (Optional - for advanced verification)

**No MCP servers required for this feature.** All verification can be done using:
- Built-in bash commands
- Node.js scripts (provided above)
- Playwright tests
- Browser DevTools

---

### Sample Input Artifacts

#### 1. Test ID Card Image

**Source**: Can be generated by agent or provided by user

**Options**:
- **Generated**: Use placeholder service like `https://via.placeholder.com/600x400/cccccc/000000?text=RV+College+ID+Card`
- **Real**: User must provide actual ID card photo for realistic testing
- **Mock Upload**: For E2E tests, use a test image fixture

**Test Image Fixture** (for Playwright):
- Create `frontend/my-app/tests/fixtures/test-id-card.jpg`
- Any 600x400 JPEG image with text "TEST ID CARD"

#### 2. Test RV Email Account

**Requirement**: Access to an RV email inbox for OTP testing

**Options**:
- **a) Real RV Email**: Tester needs access to actual RV College email account (best for production-like testing)
- **b) Email Catch-All Service**: Use services like MailHog, Mailtrap for development
- **c) Mock Email Service**: For automated tests, mock the email service response

**Recommendation**: Use MailHog or Mailtrap in development environment to catch OTP emails without sending real emails.

---

### Environment Variables

**Required for Testing**:

```env
# Backend (.env)
MONGO_URI=mongodb://localhost:27017/skillsync
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (choose one provider)
EMAIL_PROVIDER=nodemailer
EMAIL_ENABLED=true

# Nodemailer (for development)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASS=your-mailtrap-pass
EMAIL_FROM=noreply@skillsync.dev

# Frontend (.env)
VITE_API_URL=http://localhost:5000/api
```

---

## Test Coverage Requirements

### Unit Tests (Optional - future enhancement)

- OTP generation utility
- Email domain validation
- Admin role middleware

### Integration Tests (API Testing via Postman/curl)

**Must Cover**:
1. Start verification with valid RV email → Success
2. Start verification with invalid email → 400 Error
3. Verify OTP with correct code → Success + auto-verify
4. Verify OTP with wrong code → 400 Error
5. Verify OTP after expiration → 400 Error
6. Admin review (approve) → Success
7. Admin review (reject) → Success
8. Non-admin attempts admin review → 403 Forbidden

### E2E Tests (Playwright)

**Test File**: `frontend/my-app/tests/rv-verification.spec.js`

**Scenarios**:
1. **Complete Happy Path**:
   - User logs in
   - Navigates to profile
   - Uploads ID card photo
   - Enters RV email
   - Sends OTP
   - Enters correct OTP
   - Verification completes
   - Badge appears on profile

2. **Invalid Email Domain**:
   - User enters non-RV email
   - System shows error message

3. **Expired OTP**:
   - User waits > 10 minutes (mock time)
   - System rejects OTP

4. **Badge Visibility**:
   - Verified user's badge visible on:
     - Own profile
     - Mentor card
     - Search results

5. **Admin Rejection**:
   - Admin logs in
   - Reviews verification
   - Rejects with notes
   - User sees rejected status

---

## Security Considerations

**1. OTP Security**:
- ✅ OTP sent only to provided email (not logged)
- ✅ OTP expires after 10 minutes
- ⚠️ TODO: Hash OTP in database (bcrypt)
- ⚠️ TODO: Rate limit OTP requests (prevent spam)

**2. Admin Authorization**:
- ✅ Admin routes protected by role middleware
- ✅ Admin role check on every request
- ⚠️ TODO: Audit log for admin actions

**3. Image Upload**:
- ✅ Cloudinary handles malicious file detection
- ✅ File size limits enforced (5MB)
- ✅ Only authenticated users can upload

**4. Data Privacy**:
- ✅ RV email visible only to user and admin
- ✅ ID card URL accessible only via authentication
- ⚠️ TODO: Consider encrypting ID card URLs at rest

---

## Performance Considerations

**1. Database**:
- Index on `RVVerification.userId` (unique) - O(1) lookups
- No N+1 query issues (single document per user)

**2. Email Sending**:
- Async/non-blocking (wrapped in `.catch()`)
- Won't block HTTP response if email fails

**3. Frontend**:
- Lazy load badge component if needed
- Cache verification status in Zustand store
- Debounce OTP input validation

---

## Rollback Strategy

**If Critical Issues Arise**:

1. **Backend Rollback**:
   - Comment out route registration in `server.js`:
     ```javascript
     // app.use('/api/rv-verification', rvVerificationRoutes);
     ```
   - Restart server
   - RV verification routes become 404 (frontend gracefully degrades)

2. **Frontend Rollback**:
   - Remove `<RVVerificationSection />` from ProfilePage
   - Remove badge rendering conditionals
   - Frontend returns to pre-feature state

3. **Database Rollback**:
   - No destructive changes to existing collections
   - `RVVerification` collection can be dropped if needed:
     ```javascript
     db.rvverifications.drop()
     ```
   - `User.role` field can be ignored (defaults to 'user')

**Zero Impact on Existing Features**: All changes are additive, backward compatible.

---

## Future Enhancements (Out of Scope)

- Hash OTP values in database
- Rate limiting for OTP requests
- SMS-based OTP alternative
- Multi-college support (configurable domain list)
- Admin dashboard UI
- Batch verification review
- Automated ID card OCR validation
- Verification expiry (re-verify annually)
