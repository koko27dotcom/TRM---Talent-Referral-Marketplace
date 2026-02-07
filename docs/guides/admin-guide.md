# TRM Admin Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Admin Dashboard](#admin-dashboard)
3. [User Management](#user-management)
4. [Company Management](#company-management)
5. [Payout Processing](#payout-processing)
6. [Job Oversight](#job-oversight)
7. [Referral Management](#referral-management)
8. [Analytics & Reporting](#analytics--reporting)
9. [Platform Configuration](#platform-configuration)
10. [Security & Compliance](#security--compliance)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Admin Access

Admin accounts are created manually and have "God Mode" access to the platform. To become an admin:

1. Existing admin must create your account
2. You'll receive an email with login credentials
3. Change your password on first login
4. Enable two-factor authentication (required)

### Admin Roles

| Role | Access Level |
|------|--------------|
| **Super Admin** | Full platform access, can create other admins |
| **Admin** | Full platform access, cannot manage other admins |
| **Support Admin** | User/company management, view-only analytics |
| **Finance Admin** | Payouts, billing, financial reports |
| **Content Admin** | Jobs, content moderation, announcements |

### First Login Checklist

- [ ] Change default password
- [ ] Enable 2FA (Google Authenticator)
- [ ] Review admin policies
- [ ] Set up notification preferences
- [ ] Bookmark important pages

---

## Admin Dashboard

### Overview

The Admin Dashboard provides a real-time view of platform health:

#### Key Metrics Cards
- **Total Users**: Active, suspended, pending
- **Total Companies**: Verified, pending, suspended
- **Active Jobs**: Live job postings
- **Pending Payouts**: Amount awaiting processing
- **Today's Referrals**: New submissions
- **Today's Hires**: Successful placements

#### Revenue Overview
- **MRR (Monthly Recurring Revenue)**: Subscription income
- **Per-Hire Fees**: Revenue from successful hires
- **Commission**: 15% from referral bonuses
- **Total Revenue**: All income streams

#### Activity Feed
Recent platform activities:
- New user registrations
- Company verifications
- High-value referrals
- System alerts
- Flagged content

### Time Period Selection

Filter dashboard data by:
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

### Real-Time Updates

Dashboard auto-refreshes every 60 seconds. Critical alerts appear immediately.

---

## User Management

### Viewing All Users

Navigate to **Admin** → **Users** to see:
- User list with filters
- Search functionality
- Export options
- Bulk actions

#### Filters Available
- Role (referrer, job_seeker, corporate_admin)
- Status (active, suspended, deleted)
- KYC status (verified, pending, rejected)
- Registration date
- Last login
- Tier level

#### User Details Page
Click any user to view:
- Profile information
- Activity history
- Referrals made/received
- Earnings history
- KYC documents
- Login history
- Audit log

### User Actions

#### Suspend User
1. Find user in list
2. Click **Actions** → **Suspend**
3. Enter reason (required)
4. Set duration (temporary or permanent)
5. Confirm

Effects:
- User cannot login
- Active referrals paused
- Payouts blocked
- Email notification sent

#### Reactivate User
1. Find suspended user
2. Click **Actions** → **Reactivate**
3. Add note (optional)
4. Confirm

#### Delete User
⚠️ **Warning**: Permanent action

1. Find user
2. Click **Actions** → **Delete**
3. Confirm understanding
4. Enter admin password
5. Confirm deletion

**What happens**:
- Account permanently removed
- Personal data anonymized
- Referrals remain (anonymized)
- Earnings records kept (compliance)

#### Update User Role
1. Open user details
2. Click **Edit** → **Role**
3. Select new role
4. Confirm changes

### KYC Management

#### Review Queue
View all pending KYC submissions:
- Photo ID verification
- Document quality check
- Identity matching

#### Approval Process
1. Open KYC review page
2. Examine documents
3. Verify selfie matches ID
4. Check for tampering
5. **Approve** or **Reject**

#### Rejection Reasons
- Blurry documents
- Expired ID
- Mismatched information
- Suspected fraud
- Incomplete submission

### Referrer Tier Management

#### Manual Tier Adjustment
Override automatic tier assignment:
1. Open referrer profile
2. Click **Tier Management**
3. Select new tier
4. Add reason
5. Confirm

#### Tier Recalculation
Force system to recalculate all tiers:
- **Admin** → **Tools** → **Recalculate Tiers**
- Runs in background
- Affects all referrers
- Use sparingly

---

## Company Management

### Company Verification

#### Verification Queue
Companies awaiting verification:
- Submitted documents
- Business registration
- Tax ID verification
- Background checks

#### Verification Steps
1. Review submitted documents
2. Verify business registration
3. Check tax ID validity
4. Confirm physical address
5. **Approve** or **Request More Info**

#### Approval
- Company can post jobs immediately
- Verified badge applied
- Notification sent
- Added to verified companies list

#### Rejection
- Must provide specific reason
- Company can resubmit
- Limited to 3 attempts
- After 3rd rejection, manual review required

### Company Oversight

#### Company List
View all companies with:
- Verification status
- Subscription tier
- Job posting count
- Referral activity
- Payment history

#### Company Actions

**Suspend Company**:
- Immediate effect
- All jobs hidden
- Team members notified
- Reason logged

**Reinstate Company**:
- Restore full access
- Previous jobs remain hidden (can reactivate)

**Close Company**:
- Permanent action
- All jobs closed
- Team access revoked
- Financial settlement required

### Subscription Management

#### View Subscriptions
- Active subscriptions
- Cancelled subscriptions
- Past due accounts
- Trial periods

#### Manual Subscription Changes
- Upgrade/downgrade company tier
- Extend trial periods
- Apply discounts
- Waive fees

#### Billing Issues
- Failed payments
- Retry payment
- Update payment method
- Send invoice reminders

---

## Payout Processing

### Payout Dashboard

#### Pending Payouts Queue
View all payout requests:
- Amount requested
- Payment method
- User KYC status
- Account age
- Historical pattern

#### Risk Indicators
System flags:
- New accounts with large requests
- Unusual patterns
- Multiple rapid requests
- Failed KYC attempts

### Processing Payouts

#### Single Payout
1. Open payout request
2. Verify user KYC is approved
3. Check available balance
4. Confirm payment details
5. Click **Approve** or **Reject**

#### Batch Processing
1. Go to **Payouts** → **Batch Process**
2. Select multiple payouts (checkboxes)
3. Choose action:
   - **Approve All**: Approve selected
   - **Reject All**: Reject selected
   - **Mark Paid**: For manual payments
4. Confirm action

#### Rejection Reasons
- Insufficient balance
- KYC not verified
- Suspicious activity
- Payment details invalid
- Account under review

### Payment Methods

#### Supported Payout Methods
- KBZPay
- WavePay
- CB Pay
- Bank Transfer (Myanmar banks)

#### Processing Times
| Method | Standard | Express |
|--------|----------|---------|
| KBZPay | 1-2 days | Same day |
| WavePay | 1-2 days | Same day |
| CB Pay | 1-2 days | Same day |
| Bank Transfer | 2-3 days | 1 day |

### Reconciliation

#### Daily Reconciliation
1. Export payout report
2. Match with payment provider statements
3. Mark processed payouts as paid
4. Handle failures/rejections

#### Monthly Reports
- Total payouts processed
- Total amount paid
- Failed transactions
- Pending amounts

### Payout Limits

#### Default Limits
| Tier | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| Bronze | 100,000 MMK | 500,000 MMK |
| Silver | 300,000 MMK | 1,500,000 MMK |
| Gold | 500,000 MMK | 3,000,000 MMK |
| Platinum | 1,000,000 MMK | 10,000,000 MMK |

#### Adjusting Limits
Override for specific users:
1. Open user profile
2. **Payout Settings** → **Limits**
3. Set custom limits
4. Add reason
5. Set expiration (optional)

---

## Job Oversight

### Job Moderation

#### Review Queue
Jobs requiring approval:
- First-time company postings
- High-bonus jobs (flagged threshold)
- Reported jobs
- Suspicious content

#### Approval Criteria
- Legitimate company
- Realistic job description
- Appropriate bonus amount
- No discriminatory language
- Complete information

#### Actions
- **Approve**: Job goes live
- **Request Changes**: Send back for edits
- **Reject**: With reason
- **Feature**: Add to featured section

### Job Monitoring

#### Active Jobs List
View all live jobs:
- Posting company
- Bonus amount
- Referral count
- Days active
- Performance metrics

#### Job Actions
- **Edit**: Modify job details
- **Pause**: Temporarily hide
- **Close**: End job posting
- **Delete**: Remove completely
- **Feature**: Promote

### Content Moderation

#### Automated Flags
System automatically flags:
- Prohibited keywords
- Suspicious bonus amounts
- Duplicate postings
- Spam patterns

#### Manual Review
Review flagged content:
1. View flagged item
2. Assess against guidelines
3. **Approve** or **Remove**
4. Document decision

#### Content Guidelines
Prohibited content includes:
- Discriminatory language
- False information
- Illegal activities
- Multi-level marketing
- Adult content

---

## Referral Management

### Referral Oversight

#### All Referrals View
- Search by code, candidate, or referrer
- Filter by status
- Date range selection
- Export to CSV

#### Referral Details
Complete referral information:
- Submission details
- Status history
- Communication log
- Payment status
- Audit trail

### Dispute Resolution

#### Common Disputes
- Duplicate referral claims
- Bonus amount disagreements
- Status update disputes
- Payment delays

#### Resolution Process
1. Review both parties' claims
2. Examine audit logs
3. Check timestamps
4. Make determination
5. Document decision
6. Communicate outcome

#### Escalation
Complex disputes escalate to:
- Senior admin review
- Legal team (if needed)
- Final arbitration

### Fraud Detection

#### Fraud Indicators
- Multiple accounts, same IP
- Fake candidate profiles
- Collusion patterns
- Rapid-fire referrals
- Document forgery

#### Investigation
1. Flag suspicious activity
2. Gather evidence
3. Freeze related accounts
4. Interview parties (if needed)
5. Make determination
6. Apply penalties

#### Penalties
- Warning
- Temporary suspension
- Permanent ban
- Legal action (severe cases)
- Forfeiture of earnings

---

## Analytics & Reporting

### Platform Analytics

#### Revenue Analytics
- MRR trends
- Revenue by source
- Churn analysis
- Lifetime value
- Cohort analysis

#### User Analytics
- Registration trends
- Activation rates
- Retention metrics
- Engagement scores
- Conversion funnels

#### Performance Metrics
- Referral conversion rates
- Time to hire
- Cost per hire
- Platform uptime
- Support ticket resolution

### Custom Reports

#### Report Builder
Create custom reports:
1. Select data sources
2. Choose metrics
3. Apply filters
4. Set date range
5. Schedule delivery (optional)

#### Scheduled Reports
Set up automated reports:
- Daily summary
- Weekly performance
- Monthly financials
- Quarterly business review

### Data Export

#### Export Options
- CSV
- Excel
- PDF
- JSON (API)
- Direct database access (super admin)

#### Data Retention
- User data: 7 years
- Financial records: 10 years
- Audit logs: 3 years
- Deleted accounts: 30 days (then purge)

---

## Platform Configuration

### System Settings

#### General Settings
- Platform name
- Contact information
- Default currency (MMK)
- Time zone (Asia/Yangon)
- Date format

#### Feature Toggles
Enable/disable features:
- AI Resume Optimizer
- Gamification
- Referral Network
- Web3/Blockchain features
- Mobile app features

### Subscription Plans

#### Plan Configuration
Modify existing plans:
- Price
- Features
- Limits
- Trial period

#### Create New Plan
1. **Plans** → **Create New**
2. Set pricing
3. Define features
4. Set limits
5. Activate

### Payment Configuration

#### Payment Gateways
Configure providers:
- KBZPay API credentials
- WavePay API credentials
- CB Pay API credentials
- Bank transfer details

#### Fee Structure
Adjust platform fees:
- Referral commission (default: 15%)
- Per-hire fee (default: 50,000 MMK)
- Payment processing fees
- Currency conversion rates

### Notification Settings

#### Email Templates
Customize system emails:
- Welcome emails
- Verification emails
- Payout notifications
- Marketing emails

#### SMS Configuration
Set up SMS gateway:
- Provider settings
- Message templates
- Rate limiting
- Opt-out handling

---

## Security & Compliance

### Security Measures

#### Access Control
- Role-based permissions
- IP whitelisting (optional)
- Session management
- Login attempt limits

#### Audit Logging
All admin actions logged:
- Who performed action
- What was changed
- When it occurred
- IP address
- User agent

#### Data Protection
- Encryption at rest
- Encryption in transit
- Regular backups
- Disaster recovery plan

### Compliance

#### KYC/AML Compliance
- Document retention
- Suspicious activity reporting
- Regular audits
- Staff training

#### Data Privacy
- GDPR-style protections
- User data access requests
- Right to deletion
- Consent management

#### Financial Compliance
- Tax reporting
- Audit trails
- Financial record keeping
- Regulatory reporting

### Incident Response

#### Security Incidents
1. Detect and assess
2. Contain the threat
3. Investigate scope
4. Notify affected parties
5. Remediate
6. Document and learn

#### Data Breach Protocol
- Immediate containment
- Legal notification (within 72 hours)
- User notification
- Credit monitoring (if applicable)
- Post-incident review

---

## Troubleshooting

### Common Issues

#### User Can't Login
- Check account status
- Verify email confirmed
- Reset password if needed
- Check for IP blocks

#### Payout Failed
- Verify payment details
- Check KYC status
- Confirm sufficient balance
- Review payment provider status

#### Job Not Appearing
- Check company verification status
- Verify job approval status
- Confirm not expired
- Check for admin flags

### System Health

#### Health Check Endpoint
```
GET /api/v1/admin/health
```

Returns:
- Database status
- API status
- Payment gateway status
- Memory usage
- Uptime

#### Monitoring Alerts
Automated alerts for:
- High error rates
- Database connectivity
- Payment failures
- Unusual traffic patterns
- Disk space

### Support Escalation

#### Level 1: Self-Service
- Help documentation
- FAQ
- Automated troubleshooting

#### Level 2: Support Team
- Email support
- Chat support
- Phone support

#### Level 3: Technical Team
- Engineering escalation
- Bug fixes
- Feature requests

#### Level 4: Admin Intervention
- Account recovery
- Complex disputes
- Policy exceptions
- Legal matters

### Database Queries

#### Common Queries
```javascript
// Find user by email
db.users.findOne({ email: "user@example.com" })

// List pending KYC
db.users.find({ "referrerProfile.kycStatus": "pending" })

// Today's referrals
db.referrals.find({ 
  createdAt: { $gte: new Date(Date.now() - 86400000) } 
})

// Pending payouts
db.payoutrequests.find({ status: "pending" })
```

⚠️ **Warning**: Always use read-only mode for production queries.

---

## Quick Reference

### Admin Commands

#### User Management
```
POST /api/v1/admin/users/{id}/suspend
POST /api/v1/admin/users/{id}/activate
DELETE /api/v1/admin/users/{id}
```

#### Payout Processing
```
GET /api/v1/admin/payouts/pending
POST /api/v1/admin/payouts/process
```

#### Company Management
```
PUT /api/v1/companies/{id}/verify
POST /api/v1/companies/{id}/suspend
```

### Emergency Contacts

| Issue | Contact | Response Time |
|-------|---------|---------------|
| Security Breach | security@trm.com | Immediate |
| System Down | ops@trm.com | 15 minutes |
| Payment Issues | finance@trm.com | 1 hour |
| Legal Matters | legal@trm.com | 4 hours |
| General Admin | admin@trm.com | 24 hours |

### Important URLs

- Admin Dashboard: `/admin/dashboard`
- User Management: `/admin/users`
- Company Management: `/admin/companies`
- Payout Queue: `/admin/payouts`
- Analytics: `/admin/analytics`
- System Health: `/admin/health`

### Backup Procedures

#### Daily Backup
- Automated at 2:00 AM
- Stored for 30 days
- Tested weekly

#### Disaster Recovery
- RTO: 4 hours
- RPO: 1 hour
- Failover to secondary region

---

## Policies & Guidelines

### Admin Code of Conduct

1. **Confidentiality**: Never share user data
2. **Impartiality**: Treat all users fairly
3. **Documentation**: Log all significant actions
4. **Security**: Follow security protocols
5. **Compliance**: Adhere to all regulations

### Decision Authority Matrix

| Decision | Support | Admin | Super Admin |
|----------|---------|-------|-------------|
| Reset Password | ✅ | ✅ | ✅ |
| Suspend User | ❌ | ✅ | ✅ |
| Delete Account | ❌ | ❌ | ✅ |
| Change Fees | ❌ | ❌ | ✅ |
| Access Database | ❌ | ❌ | ✅ |
| Create Admin | ❌ | ❌ | ✅ |

### Audit Requirements

All admins must:
- Complete monthly audit
- Review action logs
- Certify compliance
- Report anomalies

---

*Last Updated: February 2026*

*© 2026 TRM Platform. All rights reserved.*

*For Super Admin Access: Contact CTO*
