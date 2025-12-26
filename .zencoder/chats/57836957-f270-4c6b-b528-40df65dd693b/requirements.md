# Feature Specification: RV College User Verification

## Overview

Implement a comprehensive RV College verification system that validates users through ID card photo upload and RV email OTP verification. This is an **additive, backward-compatible** feature that works alongside the existing general verification system.

## User Stories

### User Story 1 - Student Initiates RV Verification

**As a** SkillSync user who is an RV College student  
**I want to** verify my RV College affiliation  
**So that** I can build trust with other users and access RV-specific features

**Acceptance Scenarios**:

1. **Given** I am logged into SkillSync, **When** I navigate to my profile verification section, **Then** I should see an "RV College Verification" section with fields for RV email, RV login ID (optional), and ID card photo upload
2. **Given** I have entered my RV email (`student@rvce.edu.in`) and uploaded my ID card photo, **When** I click "Send OTP to RV Email", **Then** the system should validate the email domain and send a 6-digit OTP to my RV email
3. **Given** the OTP was sent successfully, **When** the response is received, **Then** I should see a success message "OTP sent to your RV email" and an OTP input field should appear

---

### User Story 2 - Student Verifies OTP

**As a** SkillSync user who initiated RV verification  
**I want to** enter the OTP I received on my RV email  
**So that** I can complete the email verification step

**Acceptance Scenarios**:

1. **Given** I received a 6-digit OTP on my RV email, **When** I enter the correct OTP within 10 minutes and click "Verify OTP", **Then** my email should be marked as verified and I should see "Email verified. Your RV verification is now complete."
2. **Given** I entered an incorrect OTP, **When** I click "Verify OTP", **Then** I should see an error message "Invalid OTP. Please try again."
3. **Given** I entered the OTP after 10 minutes, **When** I click "Verify OTP", **Then** I should see an error message "OTP expired. Please request a new one."
4. **Given** my email is verified, **When** the system processes verification, **Then** my status should automatically be set to "verified" (auto-approval after OTP)

---

### User Story 3 - Verified User Displays Badge

**As a** verified RV College student  
**I want to** display my verification badge publicly  
**So that** other users can see I am a verified RV College member

**Acceptance Scenarios**:

1. **Given** I have completed RV verification successfully, **When** I view my profile, **Then** I should see a "Verified (RV College)" badge with a check icon next to my username
2. **Given** I am a verified RV user, **When** other users view my profile, **Then** they should see my "Verified (RV College)" badge publicly displayed
3. **Given** I am a verified RV user, **When** I appear in search results or skill browse listings, **Then** my verification badge should be visible on my user card
4. **Given** I have not completed verification, **When** I or others view my profile, **Then** no RV verification badge should be displayed

---

### User Story 4 - User Checks Verification Status

**As a** SkillSync user  
**I want to** check my current RV verification status  
**So that** I know what steps remain or if I am verified

**Acceptance Scenarios**:

1. **Given** I have not started verification, **When** I check my status, **Then** I should see status: "none" with a prompt to start verification
2. **Given** I started verification but have not verified OTP, **When** I check my status, **Then** I should see status: "pending" and "OTP verification pending"
3. **Given** I verified OTP successfully, **When** I check my status, **Then** I should see status: "verified" with verification timestamp
4. **Given** my verification was rejected by admin, **When** I check my status, **Then** I should see status: "rejected" with a message to contact support or re-submit

---

### User Story 5 - Admin Reviews Verification (Optional/Audit)

**As an** admin user  
**I want to** review user verification submissions  
**So that** I can audit ID cards and ensure verification integrity

**Acceptance Scenarios**:

1. **Given** I am logged in as an admin, **When** I access the admin review endpoint, **Then** I should be able to retrieve pending or verified RV verification records
2. **Given** I review a user's ID card photo and RV email, **When** I decide to reject the verification, **Then** I can set status to "rejected" with optional notes and the user's verification should be revoked
3. **Given** I review a user's submission, **When** I add notes, **Then** the notes should be stored with the verification record for audit purposes
4. **Given** a user's status is already "verified" via auto-approval, **When** I conduct an audit review, **Then** I can retroactively reject it if the ID card is suspicious

---

## Requirements

### Functional Requirements

**FR1: Email Domain Validation**
- System must validate that RV email ends with one of the accepted RV College domains
- Accepted domains: `@rvce.edu.in`, `@rv.edu.in`, `@ms.rvce.edu.in`
- Invalid domain should return clear error message

**FR2: OTP Generation and Expiration**
- System must generate a secure 6-digit numeric OTP
- OTP must expire after 10 minutes
- System must validate OTP matches stored value and is not expired

**FR3: ID Card Photo Upload**
- System must accept image uploads via existing Cloudinary integration
- Supported formats: JPG, PNG, WEBP
- Maximum file size: 5MB (industry standard)
- System must store the Cloudinary URL in the verification record

**FR4: Auto-Verification After OTP**
- Once user verifies OTP successfully, status must automatically change from "pending" to "verified"
- `verifiedAt` timestamp must be set
- No manual admin approval required for initial verification

**FR5: Backward Compatibility**
- Existing `User.collegeEmail` and `User.isVerified` fields must remain unchanged
- All existing authentication and profile functionality must continue working
- RV verification is a separate, additive feature

**FR6: Admin Review System**
- New `role` field must be added to User model (values: "user", "admin")
- New admin middleware must protect admin-only routes
- Admins can view verification records and change status (audit/override)
- Admin can add notes to verification records

**FR7: Public Badge Display**
- Verified badge must be visible on:
  - User's own profile page
  - Other users' profile pages
  - User cards in search/browse results
  - User cards in skill listings
- Badge should display "Verified (RV College)" text with a check icon
- Badge should be styled consistently with existing UI patterns

**FR8: Status Tracking**
- System must track verification through states: none → pending → verified (or rejected)
- Users must be able to query their current status via API
- Frontend must display appropriate messaging for each status

### Non-Functional Requirements

**NFR1: Security**
- OTP must be sent only to the provided RV email address
- OTP should not be logged in plain text (add TODO for future hashing)
- ID card images must be stored securely via Cloudinary
- Admin routes must be properly protected

**NFR2: Performance**
- Email sending must not block the HTTP response (async)
- Image upload should use existing optimized Cloudinary configuration
- Database queries should use appropriate indexes (userId as unique key)

**NFR3: Maintainability**
- All new code must follow existing project conventions
- New files must be organized in standard locations (models/, controllers/, routes/)
- Code must include clear comments for complex logic
- TODO comments must be added for future enhancements

**NFR4: User Experience**
- Email must be sent within 5 seconds of request
- OTP verification must provide instant feedback
- Error messages must be clear and actionable
- UI must match existing SkillSync design patterns

**NFR5: Scalability**
- Verification system must handle concurrent requests
- Email service must support both SendGrid and Nodemailer
- System must be extensible to other college domains in the future

---

## Success Criteria

**SC1: Core Functionality**
- ✅ User can upload ID card photo and enter RV email
- ✅ System sends OTP to RV email within 5 seconds
- ✅ User can verify OTP and achieve "verified" status automatically
- ✅ Verification status is queryable via API

**SC2: Admin System**
- ✅ Basic admin role system is implemented
- ✅ Admin can review verification records
- ✅ Admin can reject verifications with notes
- ✅ Admin routes are properly protected

**SC3: UI Integration**
- ✅ Profile page displays RV verification section
- ✅ Verification badge appears on all relevant user displays
- ✅ Status messages are clear for each verification state
- ✅ UI follows existing design patterns (Tailwind CSS)

**SC4: Backward Compatibility**
- ✅ No existing User model fields are modified
- ✅ Existing authentication and profile features work unchanged
- ✅ System gracefully handles missing verification records (status: "none")
- ✅ Frontend degrades gracefully if RV verification APIs fail

**SC5: Code Quality**
- ✅ All new routes follow RESTful conventions
- ✅ Error handling is consistent and comprehensive
- ✅ Code passes existing lint checks
- ✅ TODO comments mark future enhancements (OTP hashing, multi-college support)

**SC6: Testing & Verification**
- ✅ Backend routes can be tested with Postman/curl
- ✅ Email service successfully sends OTP
- ✅ OTP verification logic handles valid/invalid/expired cases
- ✅ Admin review functionality works as expected

---

## Technical Constraints

1. **Additive Only**: No modifications to existing `User` schema or auth logic
2. **Email Service**: Use existing `backend/services/emailService.js` infrastructure
3. **Image Upload**: Use existing Cloudinary integration via `backend/routes/upload.js`
4. **Frontend Framework**: React with Tailwind CSS and Zustand for state management
5. **Test Framework**: Playwright for E2E testing (as per package.json)
6. **Backend Stack**: Node.js + Express + MongoDB/Mongoose

---

## Out of Scope

- Hashing/encrypting OTP values (marked as TODO)
- Multi-college verification beyond RV domains (future extensibility)
- Batch admin review dashboard (admin reviews one-by-one via API)
- Email template customization (use basic text/HTML format)
- Rate limiting for OTP requests (can be added later)
- SMS-based OTP as alternative to email
