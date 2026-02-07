/**
 * Initial Schema Migration
 * Creates indexes and initial collections for TRM Platform
 * Date: 2024-02-07
 */

module.exports = {
  async up(db, client) {
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        console.log('[Migration] Creating initial schema...');

        // Users Collection
        await db.createCollection('users', {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['email', 'password', 'role', 'createdAt'],
              properties: {
                email: {
                  bsonType: 'string',
                  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                },
                password: {
                  bsonType: 'string',
                  minLength: 60 // bcrypt hash length
                },
                role: {
                  enum: ['admin', 'company', 'referrer', 'candidate']
                },
                status: {
                  enum: ['active', 'inactive', 'suspended', 'pending']
                }
              }
            }
          }
        });

        // Jobs Collection
        await db.createCollection('jobs', {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['title', 'company', 'status', 'createdAt'],
              properties: {
                status: {
                  enum: ['draft', 'active', 'paused', 'closed', 'filled']
                },
                jobType: {
                  enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
                }
              }
            }
          }
        });

        // Referrals Collection
        await db.createCollection('referrals', {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['job', 'referrer', 'candidate', 'status', 'createdAt'],
              properties: {
                status: {
                  enum: ['pending', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn']
                }
              }
            }
          }
        });

        // Companies Collection
        await db.createCollection('companies', {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['name', 'status', 'createdAt'],
              properties: {
                status: {
                  enum: ['active', 'inactive', 'suspended', 'pending_verification']
                },
                verificationStatus: {
                  enum: ['unverified', 'pending', 'verified', 'rejected']
                }
              }
            }
          }
        });

        // Create indexes
        console.log('[Migration] Creating indexes...');

        // Users indexes
        await db.collection('users').createIndexes([
          { key: { email: 1 }, unique: true, name: 'idx_users_email_unique' },
          { key: { role: 1 }, name: 'idx_users_role' },
          { key: { status: 1 }, name: 'idx_users_status' },
          { key: { createdAt: -1 }, name: 'idx_users_createdAt' },
          { key: { 'profile.phone': 1 }, sparse: true, name: 'idx_users_phone' }
        ]);

        // Jobs indexes
        await db.collection('jobs').createIndexes([
          { key: { company: 1 }, name: 'idx_jobs_company' },
          { key: { status: 1 }, name: 'idx_jobs_status' },
          { key: { createdAt: -1 }, name: 'idx_jobs_createdAt' },
          { key: { 'location.city': 1 }, name: 'idx_jobs_city' },
          { key: { category: 1 }, name: 'idx_jobs_category' },
          { key: { title: 'text', description: 'text' }, name: 'idx_jobs_text_search' },
          { key: { status: 1, createdAt: -1 }, name: 'idx_jobs_status_created' }
        ]);

        // Referrals indexes
        await db.collection('referrals').createIndexes([
          { key: { job: 1 }, name: 'idx_referrals_job' },
          { key: { referrer: 1 }, name: 'idx_referrals_referrer' },
          { key: { candidate: 1 }, name: 'idx_referrals_candidate' },
          { key: { status: 1 }, name: 'idx_referrals_status' },
          { key: { createdAt: -1 }, name: 'idx_referrals_createdAt' },
          { key: { job: 1, referrer: 1 }, unique: true, name: 'idx_referrals_unique' }
        ]);

        // Companies indexes
        await db.collection('companies').createIndexes([
          { key: { name: 1 }, name: 'idx_companies_name' },
          { key: { status: 1 }, name: 'idx_companies_status' },
          { key: { verificationStatus: 1 }, name: 'idx_companies_verification' },
          { key: { createdAt: -1 }, name: 'idx_companies_createdAt' }
        ]);

        console.log('[Migration] Initial schema created successfully');
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        console.log('[Migration] Rolling back initial schema...');

        // Drop collections
        await db.collection('users').drop();
        await db.collection('jobs').drop();
        await db.collection('referrals').drop();
        await db.collection('companies').drop();

        console.log('[Migration] Initial schema rolled back successfully');
      });
    } finally {
      await session.endSession();
    }
  }
};
