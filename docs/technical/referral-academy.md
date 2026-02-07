# Referral Academy Documentation

## Overview

The Referral Academy is an educational module designed to help users understand referral strategies, payment mechanisms, and platform features. It provides structured learning paths with gamification elements.

## Features

- 📚 **Structured Courses**: Organized learning paths by topic
- 🎯 **Interactive Quizzes**: Test knowledge and earn points
- 🏆 **Certificates**: Earn certificates upon completion
- 🎮 **Gamification**: Points, badges, and leaderboards
- 🌐 **Bilingual**: English and Myanmar language support

## Architecture

### Models

#### AcademyCourse
```javascript
{
  title: { en: String, my: String },
  description: { en: String, my: String },
  slug: String,
  category: String, // getting_started, referral_strategies, etc.
  difficulty: String, // beginner, intermediate, advanced
  status: String, // draft, published, archived
  content: [{
    order: Number,
    title: { en: String, my: String },
    type: String, // video, article, quiz, interactive, pdf
    content: { en: String, my: String },
    videoUrl: String,
    pdfUrl: String,
    duration: Number, // minutes
    quiz: [{
      question: { en: String, my: String },
      options: [{ en: String, my: String }],
      correctAnswer: Number,
      explanation: { en: String, my: String }
    }],
    isRequired: Boolean
  }],
  thumbnailUrl: String,
  estimatedDuration: Number,
  points: Number,
  badgeId: ObjectId, // Associated badge
  prerequisites: [ObjectId],
  tags: [String],
  metadata: {
    author: String,
    reviewedBy: ObjectId,
    publishedAt: Date,
    lastUpdatedAt: Date,
    viewCount: Number,
    completionCount: Number
  },
  isFeatured: Boolean,
  order: Number
}
```

#### AcademyProgress
```javascript
{
  userId: ObjectId,
  courseId: ObjectId,
  status: String, // not_started, in_progress, completed
  startedAt: Date,
  completedAt: Date,
  lastAccessedAt: Date,
  progress: {
    currentSection: Number,
    completedSections: [Number],
    totalSections: Number,
    percentage: Number
  },
  quizResults: [{
    sectionIndex: Number,
    score: Number,
    totalQuestions: Number,
    answers: [Number],
    passed: Boolean,
    completedAt: Date,
    attempts: Number
  }],
  timeSpent: Number, // minutes
  notes: String,
  rating: Number, // 1-5
  feedback: String,
  certificateIssued: Boolean,
  certificateUrl: String,
  pointsEarned: Number
}
```

### Categories

| Category ID | English | Myanmar |
|-------------|---------|---------|
| getting_started | Getting Started | စတင်အသုံးပြုခြင်း |
| referral_strategies | Referral Strategies | လွှဲပြောင်းခြင်းနည်းလမ်းများ |
| payment_system | Payment System | ငွေပေးချေမှုစနစ် |
| kyc_verification | KYC Verification | KYC အတည်ပြုခြင်း |
| advanced_techniques | Advanced Techniques | အဆင့်မြင့်နည်းလမ်းများ |
| success_stories | Success Stories | အောင်မြင်မှုအကြောင်းများ |
| platform_guide | Platform Guide | ပလက်ဖောင်းလမ်းညွှန် |
| myanmar_market | Myanmar Market | မြန်မာဈေးကွက် |

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/academy/courses` | GET | List all published courses |
| `/api/academy/courses/featured` | GET | Get featured courses |
| `/api/academy/courses/categories` | GET | Get course categories |
| `/api/academy/courses/search` | GET | Search courses |
| `/api/academy/courses/:id` | GET | Get course details |
| `/api/academy/leaderboard` | GET | Get academy leaderboard |
| `/api/academy/stats` | GET | Get academy statistics |

### Protected Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/academy/courses/:id/start` | POST | Start a course |
| `/api/academy/courses/:id/progress` | POST | Update progress |
| `/api/academy/courses/:id/quiz/:section` | POST | Submit quiz |
| `/api/academy/courses/:id/feedback` | POST | Add feedback |
| `/api/academy/my-progress` | GET | Get user's progress |
| `/api/academy/my-current-course` | GET | Get current course |
| `/api/academy/recommended` | GET | Get recommended courses |
| `/api/academy/certificates` | GET | Get user's certificates |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/academy/courses` | POST | Create course |
| `/api/academy/courses/:id` | PUT | Update course |
| `/api/academy/courses/:id` | DELETE | Archive course |
| `/api/academy/courses/:id/publish` | POST | Publish course |
| `/api/academy/admin/stats` | GET | Get admin statistics |

## Course Content Types

### 1. Video
```javascript
{
  type: 'video',
  videoUrl: 'https://cdn.trm.referral/academy/video1.mp4',
  duration: 15 // minutes
}
```

### 2. Article
```javascript
{
  type: 'article',
  content: {
    en: 'Full article content in English...',
    my: 'မြန်မာဘာသာဖြင့် အပြည့်အစုံ...'
  },
  duration: 10
}
```

### 3. Quiz
```javascript
{
  type: 'quiz',
  quiz: [
    {
      question: {
        en: 'What is the platform commission?',
        my: 'ပလက်ဖောင်း ကော်မရှင်က ဘယ်လောက်လဲ?'
      },
      options: [
        { en: '10%', my: '၁၀%' },
        { en: '15%', my: '၁၅%' },
        { en: '20%', my: '၂၀%' }
      ],
      correctAnswer: 1, // 15%
      explanation: {
        en: 'The platform takes 15% commission from each referral bonus.',
        my: 'ပလက်ဖောင်းသည် လွှဲပြောင်းခြင်း ဘောနပ်တိုင်းမှ ၁၅% ကော်မရှင်ယူသည်။'
      }
    }
  ]
}
```

### 4. Interactive
```javascript
{
  type: 'interactive',
  content: {
    en: 'Interactive simulation content...',
    my: 'အပြန်အလှန်ဆောင်ရွက်နိုင်သော အကြောင်းအရာ...'
  }
}
```

### 5. PDF
```javascript
{
  type: 'pdf',
  pdfUrl: 'https://cdn.trm.referral/academy/guide.pdf',
  duration: 20
}
```

## Gamification

### Points System

| Action | Points |
|--------|--------|
| Start course | 10 |
| Complete section | 20 |
| Pass quiz (first try) | 50 |
| Pass quiz (retry) | 25 |
| Complete course | 100 |
| Provide feedback | 10 |

### Badges

Courses can be associated with badges that are awarded upon completion.

### Leaderboard

Top learners are displayed on the leaderboard based on:
- Total points earned
- Courses completed
- Time spent learning

## Sample Courses

### Course 1: Getting Started (စတင်အသုံးပြုခြင်း)

**Sections:**
1. Welcome to TRM Referral Platform (Video - 5 min)
2. How Referrals Work (Article - 10 min)
3. Setting Up Your Profile (Interactive - 5 min)
4. Quiz: Basics Check (Quiz - 5 min)

**Total Duration:** 25 minutes
**Points:** 100

### Course 2: Payment System (ငွေပေးချေမှုစနစ်)

**Sections:**
1. Understanding Referral Bonuses (Video - 10 min)
2. Platform Commission Explained (Article - 5 min)
3. KYC Verification Process (Video - 10 min)
4. Withdrawal Methods (Article - 5 min)
5. Quiz: Payment Knowledge (Quiz - 10 min)

**Total Duration:** 40 minutes
**Points:** 150

### Course 3: Advanced Referral Strategies

**Sections:**
1. Building Your Network (Video - 15 min)
2. Effective Communication (Article - 10 min)
3. Company Relationship Management (Video - 15 min)
4. Success Stories (Video - 10 min)
5. Quiz: Advanced Concepts (Quiz - 15 min)

**Total Duration:** 65 minutes
**Points:** 200

## Implementation Guide

### Creating a Course

```javascript
const academyService = require('./services/academyService.js');

const course = await academyService.createCourse({
  title: {
    en: 'Course Title',
    my: 'သင်တန်းခေါင်းစဉ်'
  },
  description: {
    en: 'Course description...',
    my: 'သင်တန်းအကြောင်းအရာ...'
  },
  slug: 'course-title',
  category: 'getting_started',
  difficulty: 'beginner',
  content: [
    {
      order: 1,
      title: { en: 'Introduction', my: 'အခန်းကဏ္ဍ' },
      type: 'video',
      videoUrl: 'https://...',
      duration: 10,
      isRequired: true
    }
  ],
  points: 100,
  tags: ['beginner', 'basics']
});
```

### Tracking Progress

```javascript
// Start course
await academyService.startCourse(userId, courseId);

// Update progress
await academyService.updateProgress(userId, courseId, sectionIndex, true);

// Submit quiz
await academyService.submitQuiz(userId, courseId, sectionIndex, [0, 1, 2, 0, 1]);
```

## Frontend Integration

### Course List Page
```javascript
const response = await fetch('/api/academy/courses');
const { data: courses } = await response.json();
```

### Course Detail Page
```javascript
const response = await fetch(`/api/academy/courses/${courseId}`);
const { data: { course, progress } } = await response.json();
```

### Progress Tracking
```javascript
// Update progress
await fetch(`/api/academy/courses/${courseId}/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sectionIndex: 2, completed: true })
});
```

## Analytics

### Course Analytics
- Enrollment rate
- Completion rate
- Average time to complete
- Quiz pass rate
- User ratings

### User Analytics
- Courses started
- Courses completed
- Total points earned
- Time spent learning
- Certificates earned

## Future Enhancements

- [ ] Live webinars
- [ ] Discussion forums per course
- [ ] Mentor assignment
- [ ] Mobile app integration
- [ ] Offline content download
- [ ] AI-powered learning recommendations
- [ ] Peer review system
