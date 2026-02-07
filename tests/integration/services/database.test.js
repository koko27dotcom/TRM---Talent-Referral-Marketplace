/**
 * Database Integration Tests
 * Tests for database transaction integrity and connection handling
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDatabase, disconnectDatabase, isDatabaseConnected, getConnectionStats } = require('../../../server/config/database');
const { User, Referral, Job } = require('../../../server/models');

describe('Database Integration', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await mongod.stop();
  });

  afterEach(async () => {
    // Clean up collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Connection Management', () => {
    it('should connect to database successfully', () => {
      expect(isDatabaseConnected()).toBe(true);
    });

    it('should return connection stats', () => {
      const stats = getConnectionStats();
      expect(stats.readyState).toBe(1);
      expect(stats.host).toBeDefined();
      expect(stats.name).toBeDefined();
    });

    it('should handle reconnection', async () => {
      await mongoose.connection.close();
      expect(isDatabaseConnected()).toBe(false);

      await connectDatabase();
      expect(isDatabaseConnected()).toBe(true);
    });
  });

  describe('Transaction Integrity', () => {
    it('should commit successful transactions', async () => {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await User.create([{
            email: 'test@example.com',
            password: 'hashedpassword',
            name: 'Test User',
            role: 'referrer',
          }], { session });

          await Job.create([{
            title: 'Test Job',
            company: 'Test Company',
            description: 'Test Description',
            status: 'active',
          }], { session });
        });

        const users = await User.find();
        const jobs = await Job.find();

        expect(users.length).toBe(1);
        expect(jobs.length).toBe(1);
      } finally {
        await session.endSession();
      }
    });

    it('should rollback failed transactions', async () => {
      const session = await mongoose.startSession();

      try {
        await expect(
          session.withTransaction(async () => {
            await User.create([{
              email: 'test@example.com',
              password: 'hashedpassword',
              name: 'Test User',
              role: 'referrer',
            }], { session });

            // This should fail and trigger rollback
            throw new Error('Intentional error');
          })
        ).rejects.toThrow('Intentional error');

        // Verify rollback
        const users = await User.find();
        expect(users.length).toBe(0);
      } finally {
        await session.endSession();
      }
    });

    it('should handle concurrent transactions', async () => {
      const createUser = async (email) => {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await User.create([{
              email,
              password: 'hashedpassword',
              name: 'Test User',
              role: 'referrer',
            }], { session });
          });
        } finally {
          await session.endSession();
        }
      };

      await Promise.all([
        createUser('user1@example.com'),
        createUser('user2@example.com'),
        createUser('user3@example.com'),
      ]);

      const users = await User.find();
      expect(users.length).toBe(3);
    });
  });

  describe('Data Consistency', () => {
    it('should enforce unique constraints', async () => {
      await User.create({
        email: 'unique@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'referrer',
      });

      await expect(
        User.create({
          email: 'unique@example.com',
          password: 'hashedpassword',
          name: 'Another User',
          role: 'referrer',
        })
      ).rejects.toThrow();
    });

    it('should handle cascading updates', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'referrer',
      });

      const job = await Job.create({
        title: 'Test Job',
        company: 'Test Company',
        description: 'Test Description',
        status: 'active',
      });

      const referral = await Referral.create({
        referrerId: user._id,
        jobId: job._id,
        candidateName: 'John Doe',
        candidateEmail: 'john@example.com',
        status: 'submitted',
      });

      // Update user
      await User.findByIdAndUpdate(user._id, { name: 'Updated Name' });

      // Verify referral still references user
      const updatedReferral = await Referral.findById(referral._id);
      expect(updatedReferral.referrerId.toString()).toBe(user._id.toString());
    });
  });

  describe('Query Performance', () => {
    it('should use indexes efficiently', async () => {
      // Create multiple users
      const users = Array.from({ length: 100 }, (_, i) => ({
        email: `user${i}@example.com`,
        password: 'hashedpassword',
        name: `User ${i}`,
        role: i % 2 === 0 ? 'referrer' : 'job_seeker',
      }));

      await User.insertMany(users);

      // Query with explain to check index usage
      const explain = await User.find({ email: 'user50@example.com' }).explain('executionStats');
      expect(explain.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
    });

    it('should handle large result sets with pagination', async () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@example.com`,
        password: 'hashedpassword',
        name: `User ${i}`,
        role: 'referrer',
      }));

      await User.insertMany(users);

      const page1 = await User.find().limit(10).skip(0);
      const page2 = await User.find().limit(10).skip(10);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString());
    });
  });
});
