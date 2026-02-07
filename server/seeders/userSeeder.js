/**
 * User Seeder
 * Seeds sample users for testing and development
 */

const mongoose = require('mongoose');
const User = require('../models/User.js');
const { connectDatabase } = require('../config/database.js');

const sampleUsers = [
  // Admin users
  {
    email: 'admin@trm.referral',
    password: 'Admin@123!',
    name: 'Admin User',
    role: 'admin',
    phone: '+95 9 111 111 111',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/admin.jpg',
      bio: 'Platform Administrator',
      location: 'Yangon, Myanmar',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'verified',
    kycVerifiedAt: new Date('2024-01-01'),
  },
  
  // Referrer users
  {
    email: 'thida@example.com',
    password: 'Referrer@123!',
    name: 'Thida Aung',
    role: 'referrer',
    phone: '+95 9 222 222 222',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/thida.jpg',
      bio: 'Professional recruiter with 5 years experience in tech industry',
      location: 'Yangon, Myanmar',
      occupation: 'HR Consultant',
      company: 'Independent',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'verified',
    kycVerifiedAt: new Date('2024-02-15'),
    stats: {
      totalReferrals: 12,
      successfulReferrals: 8,
      totalEarnings: 1800000,
      rating: 4.8,
      responseTime: 2,
    },
    messaging: {
      viber: {
        connected: true,
        phoneNumber: '+95 9 222 222 222',
      },
      telegram: {
        connected: true,
        username: '@thida_aung',
      },
    },
  },
  {
    email: 'kyaw@example.com',
    password: 'Referrer@123!',
    name: 'Kyaw Min',
    role: 'referrer',
    phone: '+95 9 333 333 333',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/kyaw.jpg',
      bio: 'Tech enthusiast helping friends find great opportunities',
      location: 'Mandalay, Myanmar',
      occupation: 'Software Developer',
      company: 'Tech Solutions Ltd',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'verified',
    kycVerifiedAt: new Date('2024-03-10'),
    stats: {
      totalReferrals: 5,
      successfulReferrals: 3,
      totalEarnings: 650000,
      rating: 4.5,
      responseTime: 4,
    },
    messaging: {
      viber: {
        connected: true,
        phoneNumber: '+95 9 333 333 333',
      },
      telegram: {
        connected: false,
      },
    },
  },
  {
    email: 'su@example.com',
    password: 'Referrer@123!',
    name: 'Su Su Hlaing',
    role: 'referrer',
    phone: '+95 9 444 444 444',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/su.jpg',
      bio: 'Connecting talent with opportunities in digital marketing',
      location: 'Yangon, Myanmar',
      occupation: 'Marketing Manager',
      company: 'Digital First Co',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'verified',
    kycVerifiedAt: new Date('2024-04-05'),
    stats: {
      totalReferrals: 18,
      successfulReferrals: 12,
      totalEarnings: 2800000,
      rating: 4.9,
      responseTime: 1,
    },
    messaging: {
      viber: {
        connected: false,
      },
      telegram: {
        connected: true,
        username: '@susu_hlaing',
      },
    },
  },
  {
    email: 'aung@example.com',
    password: 'Referrer@123!',
    name: 'Aung Ko',
    role: 'referrer',
    phone: '+95 9 555 555 555',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/aung.jpg',
      bio: 'New to referral platform, excited to help people find jobs',
      location: 'Naypyitaw, Myanmar',
      occupation: 'Student',
      company: 'University of Technology',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'pending',
    stats: {
      totalReferrals: 2,
      successfulReferrals: 0,
      totalEarnings: 0,
      rating: 0,
      responseTime: 0,
    },
    messaging: {
      viber: {
        connected: true,
        phoneNumber: '+95 9 555 555 555',
      },
      telegram: {
        connected: true,
        username: '@aungko2024',
      },
    },
  },
  {
    email: 'mya@example.com',
    password: 'Referrer@123!',
    name: 'Mya Mya Win',
    role: 'referrer',
    phone: '+95 9 666 666 666',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/mya.jpg',
      bio: 'Experienced recruiter specializing in finance and banking',
      location: 'Yangon, Myanmar',
      occupation: 'Senior Recruiter',
      company: 'Finance Connect',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    kycStatus: 'verified',
    kycVerifiedAt: new Date('2024-01-20'),
    stats: {
      totalReferrals: 25,
      successfulReferrals: 19,
      totalEarnings: 4200000,
      rating: 4.7,
      responseTime: 3,
    },
    messaging: {
      viber: {
        connected: true,
        phoneNumber: '+95 9 666 666 666',
      },
      telegram: {
        connected: true,
        username: '@mya_recruiter',
      },
    },
  },
  
  // Company users
  {
    email: 'hr@techwave.mm',
    password: 'Company@123!',
    name: 'TechWave HR Team',
    role: 'company',
    phone: '+95 9 777 777 777',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/techwave.jpg',
      bio: 'Leading technology company in Myanmar',
      location: 'Yangon, Myanmar',
      company: 'TechWave Myanmar',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    companyProfile: {
      name: 'TechWave Myanmar',
      industry: 'Technology',
      size: '50-200 employees',
      website: 'https://techwave.mm',
      description: 'Leading technology company specializing in software development',
    },
  },
  {
    email: 'jobs@mdigital.mm',
    password: 'Company@123!',
    name: 'MDigital HR',
    role: 'company',
    phone: '+95 9 888 888 888',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/mdigital.jpg',
      bio: 'Digital transformation experts',
      location: 'Yangon, Myanmar',
      company: 'Myanmar Digital Solutions',
    },
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    companyProfile: {
      name: 'Myanmar Digital Solutions',
      industry: 'Technology',
      size: '20-50 employees',
      website: 'https://mdigital.mm',
      description: 'Digital transformation and IT consulting',
    },
  },
  
  // Pending users
  {
    email: 'newuser@example.com',
    password: 'User@123!',
    name: 'New User',
    role: 'referrer',
    phone: '+95 9 999 999 999',
    profile: {
      avatar: 'https://cdn.trm.referral/avatars/default.jpg',
      bio: '',
      location: '',
    },
    isActive: true,
    isEmailVerified: false,
    isPhoneVerified: false,
    kycStatus: 'not_started',
    stats: {
      totalReferrals: 0,
      successfulReferrals: 0,
      totalEarnings: 0,
      rating: 0,
      responseTime: 0,
    },
  },
];

async function seedUsers() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing users...');
    await User.deleteMany({});

    console.log('Creating users...\n');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      // Hash password before saving (assuming User model has pre-save hook)
      const user = await User.create(userData);
      createdUsers.push(user);
      
      const role = user.role.toUpperCase();
      const kycStatus = user.kycStatus ? `(${user.kycStatus})` : '';
      console.log(`✓ [${role}] ${user.name} - ${user.email} ${kycStatus}`);
    }

    console.log(`\n✅ Successfully seeded ${createdUsers.length} users`);
    
    // Summary
    const admins = createdUsers.filter(u => u.role === 'admin').length;
    const referrers = createdUsers.filter(u => u.role === 'referrer').length;
    const companies = createdUsers.filter(u => u.role === 'company').length;
    const verified = createdUsers.filter(u => u.kycStatus === 'verified').length;
    const pending = createdUsers.filter(u => u.kycStatus === 'pending').length;
    const withViber = createdUsers.filter(u => u.messaging?.viber?.connected).length;
    const withTelegram = createdUsers.filter(u => u.messaging?.telegram?.connected).length;

    console.log('\n📊 User Summary:');
    console.log(`  - Admins: ${admins}`);
    console.log(`  - Referrers: ${referrers}`);
    console.log(`  - Companies: ${companies}`);
    console.log(`  - KYC Verified: ${verified}`);
    console.log(`  - KYC Pending: ${pending}`);
    console.log(`  - Viber connected: ${withViber}`);
    console.log(`  - Telegram connected: ${withTelegram}`);
    
    console.log('\n🔑 Default Passwords:');
    console.log('  - Admin: Admin@123!');
    console.log('  - Referrers: Referrer@123!');
    console.log('  - Companies: Company@123!');
    console.log('  - Regular Users: User@123!');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
