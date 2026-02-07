/**
 * End-to-End Academy Flow Integration Tests
 * Tests complete academy course lifecycle
 */

const request = require('supertest');
const app = require('../../../server/server');
const { User, AcademyCourse } = require('../../../server/models');
const { userFactory } = require('../../factories');

describe('Academy Flow Integration', () => {
  let authToken;
  let user;
  let course;

  beforeEach(async () => {
    user = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;

    // Create a course
    const courseResponse = await request(app)
      .post('/api/academy/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Advanced Referral Strategies',
        description: 'Learn advanced techniques for successful referrals',
        category: 'referral_skills',
        level: 'intermediate',
        duration: 120, // minutes
        modules: [
          {
            title: 'Introduction',
            content: 'Welcome to the course',
            duration: 10,
            order: 1,
          },
          {
            title: 'Building Your Network',
            content: 'How to expand your referral network',
            duration: 30,
            order: 2,
          },
          {
            title: 'Candidate Screening',
            content: 'Best practices for screening candidates',
            duration: 40,
            order: 3,
          },
          {
            title: 'Final Assessment',
            content: 'Test your knowledge',
            duration: 40,
            order: 4,
            type: 'assessment',
            quiz: {
              questions: [
                {
                  question: 'What is the most important factor in referrals?',
                  options: ['Speed', 'Quality', 'Quantity', 'Luck'],
                  correctAnswer: 1,
                },
              ],
            },
          },
        ],
        points: 500,
        badgeId: null,
      })
      .expect(201);

    course = courseResponse.body.data.course;
  });

  describe('Course Enrollment and Progress', () => {
    it('should enroll user in course', async () => {
      const response = await request(app)
        .post(`/api/academy/courses/${course._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrollment.status).toBe('in_progress');
    });

    it('should track module completion', async () => {
      // Enroll first
      await request(app)
        .post(`/api/academy/courses/${course._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Complete first module
      const response = await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${course.modules[0]._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.completedModules).toContain(course.modules[0]._id.toString());
    });

    it('should calculate progress percentage', async () => {
      // Enroll
      await request(app)
        .post(`/api/academy/courses/${course._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Complete 2 out of 4 modules
      await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${course.modules[0]._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${course.modules[1]._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get progress
      const response = await request(app)
        .get(`/api/academy/courses/${course._id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBe(50);
    });
  });

  describe('Assessment and Certification', () => {
    beforeEach(async () => {
      // Enroll and complete all modules except assessment
      await request(app)
        .post(`/api/academy/courses/${course._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      for (let i = 0; i < course.modules.length - 1; i++) {
        await request(app)
          .post(`/api/academy/courses/${course._id}/modules/${course.modules[i]._id}/complete`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });

    it('should complete assessment and award certificate', async () => {
      const assessmentModule = course.modules[course.modules.length - 1];

      // Submit assessment
      const response = await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${assessmentModule._id}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answers: [1], // Correct answer
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.result.passed).toBe(true);
      expect(response.body.data.result.score).toBeGreaterThanOrEqual(80);

      // Verify certificate
      const enrollmentResponse = await request(app)
        .get(`/api/academy/courses/${course._id}/enrollment`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(enrollmentResponse.body.data.enrollment.certificateUrl).toBeDefined();
      expect(enrollmentResponse.body.data.enrollment.completedAt).toBeDefined();
    });

    it('should award points on course completion', async () => {
      const assessmentModule = course.modules[course.modules.length - 1];

      await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${assessmentModule._id}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answers: [1],
        })
        .expect(200);

      // Check points awarded
      const userResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userResponse.body.data.user.gamification.points).toBeGreaterThanOrEqual(500);
    });

    it('should allow retry on failed assessment', async () => {
      const assessmentModule = course.modules[course.modules.length - 1];

      // Fail assessment
      const failResponse = await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${assessmentModule._id}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answers: [0], // Wrong answer
        })
        .expect(200);

      expect(failResponse.body.data.result.passed).toBe(false);

      // Retry
      const retryResponse = await request(app)
        .post(`/api/academy/courses/${course._id}/modules/${assessmentModule._id}/assess`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answers: [1], // Correct answer
        })
        .expect(200);

      expect(retryResponse.body.data.result.passed).toBe(true);
    });
  });

  describe('Course Discovery', () => {
    it('should list available courses', async () => {
      // Create another course
      await request(app)
        .post('/api/academy/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Beginner Referral Guide',
          description: 'Getting started with referrals',
          category: 'referral_skills',
          level: 'beginner',
          duration: 60,
          modules: [
            {
              title: 'Getting Started',
              content: 'Introduction to referrals',
              duration: 60,
              order: 1,
            },
          ],
          points: 200,
        })
        .expect(201);

      const response = await request(app)
        .get('/api/academy/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.courses.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get('/api/academy/courses?category=referral_skills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.courses.every(c => c.category === 'referral_skills')).toBe(true);
    });

    it('should filter courses by level', async () => {
      const response = await request(app)
        .get('/api/academy/courses?level=intermediate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.courses.every(c => c.level === 'intermediate')).toBe(true);
    });

    it('should search courses', async () => {
      const response = await request(app)
        .get('/api/academy/courses?search=advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.courses.some(c => c.title.includes('Advanced'))).toBe(true);
    });
  });

  describe('Learning Path', () => {
    it('should track learning path progress', async () => {
      // Create beginner course
      const beginnerResponse = await request(app)
        .post('/api/academy/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Beginner Course',
          description: 'Start here',
          category: 'referral_skills',
          level: 'beginner',
          duration: 30,
          modules: [
            {
              title: 'Module 1',
              content: 'Content',
              duration: 30,
              order: 1,
            },
          ],
          points: 100,
          prerequisites: [],
        })
        .expect(201);

      // Enroll and complete beginner course
      await request(app)
        .post(`/api/academy/courses/${beginnerResponse.body.data.course._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .post(`/api/academy/courses/${beginnerResponse.body.data.course._id}/modules/${beginnerResponse.body.data.course.modules[0]._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get learning path
      const response = await request(app)
        .get('/api/academy/learning-path')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.path.completedCourses.length).toBeGreaterThanOrEqual(1);
    });
  });
});
