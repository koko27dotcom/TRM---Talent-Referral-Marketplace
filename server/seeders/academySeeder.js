/**
 * Academy Seeder
 * Seeds sample courses for Referral Academy
 */

const mongoose = require('mongoose');
const AcademyCourse = require('../models/AcademyCourse.js');
const { connectDatabase } = require('../config/database.js');

const sampleCourses = [
  {
    title: {
      en: 'Getting Started with TRM Referral Platform',
      my: 'TRM Referral Platform နှင့် စတင်မိတ်ဆက်ခြင်း',
    },
    description: {
      en: 'Learn the basics of the referral platform, how to create an account, and navigate the system.',
      my: 'လွှဲပြောင်းခြင်းပလက်ဖောင်း၏ အခြေခံများကို လေ့လာပြီး အကောင့်ဖွင့်နည်းနှင့် စနစ်အသုံးပြုနည်းကို သိရှိနိုင်မည်။',
    },
    slug: 'getting-started',
    category: 'getting_started',
    difficulty: 'beginner',
    status: 'published',
    content: [
      {
        order: 1,
        title: {
          en: 'Welcome to TRM Referral Platform',
          my: 'TRM Referral Platform သို့ ကြိုဆိုပါသည်',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/welcome.mp4',
        duration: 5,
        isRequired: true,
      },
      {
        order: 2,
        title: {
          en: 'How Referrals Work',
          my: 'လွှဲပြောင်းခြင်းအလုပ်လုပ်ပုံ',
        },
        type: 'article',
        content: {
          en: `Referrals are a powerful way to earn money by connecting job seekers with employers.

In this lesson, you will learn:
- What is a referral
- How the referral process works
- Your role as a referrer
- Benefits of being a referrer

The referral process is simple:
1. Find a job posting on our platform
2. Refer a candidate who matches the requirements
3. Track your referral status
4. Get paid when the candidate is hired`,
          my: `လွှဲပြောင်းခြင်းသည် အလုပ်ရှာသူများနှင့် အလုပ်ခင်ပိုင်းများကို ချိတ်ဆက်ပြီး ငွေရှာရန် အစွမ်းထက်သော နည်းလမ်းတစ်ခုဖြစ်သည်။

ဤသင်ခန်းစာတွင် သင်လေ့လာမည့်အရာများ-
- လွှဲပြောင်းခြင်းဆိုတာဘာလဲ
- လွှဲပြောင်းခြင်းစနစ် အလုပ်လုပ်ပုံ
- လွှဲပြောင်းသူအဖြစ် သင့်အခန်းကဏ္ဍ
- လွှဲပြောင်းသူဖြစ်ခြင်း၏ အကျိုးကျေးဇူးများ

လွှဲပြောင်းခြင်းစနစ်မှာ ရိုးရှင်းပါသည်-
1. ငါတို့ပလက်ဖောင်းတွင် အလုပ်ကြော်ငြာကို ရှာပါ
2 လိုအပ်ချက်များနှင့် ကိုက်ညီသော လျှောက်ထားသူကို လွှဲပြောင်းပါ
3. သင့်လွှဲပြောင်းခြင်း အခြေအနေကို ခြေရာခပ်ပါ
4. လျှောက်ထားသူ ခန့်အပ်ခံရပါက ငွေရယူပါ`,
        },
        duration: 10,
        isRequired: true,
      },
      {
        order: 3,
        title: {
          en: 'Setting Up Your Profile',
          my: 'သင့်ပရိုဖိုင်လ်ကို စီစဉ်ခြင်း',
        },
        type: 'interactive',
        content: {
          en: 'Interactive guide to setting up your referrer profile...',
          my: 'လွှဲပြောင်းသူပရိုဖိုင်လ်ကို စီစဉ်ရန် အပြန်အလှန်ဆောင်ရွက်နိုင်သော လမ်းညွှန်...',
        },
        duration: 5,
        isRequired: true,
      },
      {
        order: 4,
        title: {
          en: 'Quiz: Basics Check',
          my: 'အခန်းကဏ္ဍ စစ်ဆေးခြင်း',
        },
        type: 'quiz',
        quiz: [
          {
            question: {
              en: 'What percentage does the platform take as commission?',
              my: 'ပလက်ဖောင်းက ကော်မရှင်ဘယ်လောက်ယူလဲ?',
            },
            options: [
              { en: '10%', my: '၁၀%' },
              { en: '15%', my: '၁၅%' },
              { en: '20%', my: '၂၀%' },
              { en: '25%', my: '၂၅%' },
            ],
            correctAnswer: 1,
            explanation: {
              en: 'The platform takes 15% commission from each successful referral bonus.',
              my: 'ပလက်ဖောင်းသည် အောင်မြင်သော လွှဲပြောင်းခြင်း ဘောနပ်တိုင်းမှ ၁၅% ကော်မရှင်ယူသည်။',
            },
          },
          {
            question: {
              en: 'When do you get paid for a referral?',
              my: 'လွှဲပြောင်းခြင်းအတွက် ဘယ်အချိန်မှာ ငွေရမလဲ?',
            },
            options: [
              { en: 'Immediately after submitting', my: 'တင်သွင်းပြီးချင်းချင်း' },
              { en: 'When candidate is interviewed', my: 'လျှောက်ထားသူ အင်တာဗျူးဝင်သောအခါ' },
              { en: 'When candidate is hired', my: 'လျှောက်ထားသူ ခန့်အပ်ခံရသောအခါ' },
              { en: 'After 30 days', my: '၃၀ ရက်ကြာသောအခါ' },
            ],
            correctAnswer: 2,
            explanation: {
              en: 'You receive payment when the candidate is successfully hired.',
              my: 'လျှောက်ထားသူ အောင်မြင်စွာ ခန့်အပ်ခံရသောအခါ ငွေရရှိမည်ဖြစ်သည်။',
            },
          },
          {
            question: {
              en: 'What is KYC?',
              my: 'KYC ဆိုတာဘာလဲ?',
            },
            options: [
              { en: 'Know Your Customer - identity verification', my: 'ဖောက်သည်ကို သိရှိခြင်း - အထောက်အထားစစ်ဆေးခြင်း' },
              { en: 'Key Your Code', my: 'ကုဒ်ကို သော့ခြင်း' },
              { en: 'Keep Your Cash', my: 'ငွေကို ထားရှိခြင်း' },
              { en: 'Know Your Commission', my: 'ကော်မရှင်ကို သိရှိခြင်း' },
            ],
            correctAnswer: 0,
            explanation: {
              en: 'KYC (Know Your Customer) is the identity verification process required before you can withdraw earnings.',
              my: 'KYC (Know Your Customer) သည် ရှာယူထားသောငွေကို ထုတ်ယူခွင့်ရမခင် လိုအပ်သော အထောက်အထားစစ်ဆေးခြင်း လုပ်ငန်းစဉ်ဖြစ်သည်။',
            },
          },
        ],
        duration: 5,
        isRequired: true,
      },
    ],
    thumbnailUrl: 'https://cdn.trm.referral/academy/getting-started-thumb.jpg',
    estimatedDuration: 25,
    points: 100,
    tags: ['beginner', 'basics', 'getting-started'],
    isFeatured: true,
    order: 1,
  },
  {
    title: {
      en: 'Understanding the Payment System',
      my: 'ငွေပေးချေမှုစနစ်ကို နားလည်ခြင်း',
    },
    description: {
      en: 'Learn how referral bonuses are calculated, when you get paid, and how to withdraw your earnings.',
      my: 'လွှဲပြောင်းခြင်း ဘောနပ်များကို ဘယ်လိုတွက်ချက်လဲ၊ ဘယ်အချိန်ငွေရမလဲ၊ ငွေဘယ်လိုထုတ်ယူမလဲ ဆိုတာ လေ့လာပါ။',
    },
    slug: 'payment-system',
    category: 'payment_system',
    difficulty: 'beginner',
    status: 'published',
    content: [
      {
        order: 1,
        title: {
          en: 'How Referral Bonuses Work',
          my: 'လွှဲပြောင်းခြင်း ဘောနပ်များ အလုပ်လုပ်ပုံ',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/bonuses.mp4',
        duration: 10,
        isRequired: true,
      },
      {
        order: 2,
        title: {
          en: 'Platform Commission Explained',
          my: 'ပလက်ဖောင်း ကော်မရှင်ရှင်းလင်းချက်',
        },
        type: 'article',
        content: {
          en: `Understanding the platform commission structure:

- Platform Commission: 15%
- You Receive: 85%

Example:
If a job has a referral bonus of 200,000 MMK:
- Platform takes: 30,000 MMK (15%)
- You receive: 170,000 MMK (85%)

This commission helps us maintain the platform and provide support services.`,
          my: `ပလက်ဖောင်း ကော်မရှင် ဖွဲ့စည်းပုံကို နားလည်ခြင်း-

- ပလက်ဖောင်း ကော်မရှင်- ၁၅%
- သင်ရရှိမည်- ၈၅%

ဥပမာ-
အလုပ်တစ်ခုတွင် လွှဲပြောင်းခြင်း ဘောနပ် ၂၀၀,၀၀၀ ကျပ်ရှိပါက-
- ပလက်ဖောင်း ယူမည်- ၃၀,၀၀၀ ကျပ် (၁၅%)
- သင်ရရှိမည်- ၁၇၀,၀၀၀ ကျပ် (၈၅%)

ဤကော်မရှင်သည် ပလက်ဖောင်းကို ထိန်းသိမ်းပြီး အထောက်အကူပေးဝန်ဆောင်မှုများကို ပေးနိုင်ရန် အသုံးပြုသည်။`,
        },
        duration: 8,
        isRequired: true,
      },
      {
        order: 3,
        title: {
          en: 'KYC Verification Process',
          my: 'KYC အတည်ပြုခြင်း လုပ်ငန်းစဉ်',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/kyc.mp4',
        duration: 10,
        isRequired: true,
      },
      {
        order: 4,
        title: {
          en: 'Withdrawal Methods',
          my: 'ငွေထုတ်ယူခြင်း နည်းလမ်းများ',
        },
        type: 'article',
        content: {
          en: `Available withdrawal methods in Myanmar:

1. KBZPay
   - Minimum: 10,000 MMK
   - Processing time: 1-2 business days

2. WavePay
   - Minimum: 10,000 MMK
   - Processing time: 1-2 business days

3. Bank Transfer
   - Minimum: 50,000 MMK
   - Processing time: 2-3 business days

All withdrawals require completed KYC verification.`,
          my: `မြန်မာနိုင်ငံတွင် ရရှိနိုင်သော ငွေထုတ်ယူခြင်း နည်းလမ်းများ-

၁။ KBZPay
   - အနည်းဆုံး- ၁၀,၀၀၀ ကျပ်
   - လုပ်ငန်းစဉ်အချိန်- ၁-၂ ရက်

၂။ WavePay
   - အနည်းဆုံး- ၁၀,၀၀၀ ကျပ်
   - လုပ်ငန်းစဉ်အချိန်- ၁-၂ ရက်

၃။ ဘဏ်လွှဲ
   - အနည်းဆုံး- ၅၀,၀၀၀ ကျပ်
   - လုပ်ငန်းစဉ်အချိန်- ၂-၃ ရက်

ငွေထုတ်ယူမှုအားလုံးသည် KYC အတည်ပြုခြင်း ပြီးစီးရန် လိုအပ်သည်။`,
        },
        duration: 7,
        isRequired: true,
      },
      {
        order: 5,
        title: {
          en: 'Quiz: Payment Knowledge',
          my: 'ငွေပေးချေမှုအကြောင်း စစ်ဆေးခြင်း',
        },
        type: 'quiz',
        quiz: [
          {
            question: {
              en: 'What is the minimum withdrawal amount for KBZPay?',
              my: 'KBZPay အနည်းဆုံး ငွေထုတ်ယူမှုတန်ဖိုးက ဘယ်လောက်လဲ?',
            },
            options: [
              { en: '5,000 MMK', my: '၅,၀၀၀ ကျပ်' },
              { en: '10,000 MMK', my: '၁၀,၀၀၀ ကျပ်' },
              { en: '20,000 MMK', my: '၂၀,၀၀၀ ကျပ်' },
              { en: '50,000 MMK', my: '၅၀,၀၀၀ ကျပ်' },
            ],
            correctAnswer: 1,
            explanation: {
              en: 'The minimum withdrawal amount for KBZPay is 10,000 MMK.',
              my: 'KBZPay အနည်းဆုံး ငွေထုတ်ယူမှုတန်ဖိုးမှာ ၁၀,၀၀၀ ကျပ်ဖြစ်သည်။',
            },
          },
          {
            question: {
              en: 'How long does a bank transfer withdrawal take?',
              my: 'ဘဏ်လွှဲ ငွေထုတ်ယူခြင်းမှာ ဘယ်လောက်ကြာလဲ?',
            },
            options: [
              { en: 'Instant', my: 'ချက်ချင်း' },
              { en: '1 day', my: '၁ ရက်' },
              { en: '2-3 business days', my: '၂-၃ ရက်' },
              { en: '1 week', my: '၁ ပတ်' },
            ],
            correctAnswer: 2,
            explanation: {
              en: 'Bank transfer withdrawals typically take 2-3 business days to process.',
              my: 'ဘဏ်လွှဲ ငွေထုတ်ယူခြင်းများကို ပုံမှန်အားဖြင့် ၂-၃ ရက် လုပ်ငန်းစဉ်ကြာသည်။',
            },
          },
        ],
        duration: 10,
        isRequired: true,
      },
    ],
    thumbnailUrl: 'https://cdn.trm.referral/academy/payment-system-thumb.jpg',
    estimatedDuration: 45,
    points: 150,
    tags: ['payment', 'kyc', 'withdrawal', 'basics'],
    isFeatured: true,
    order: 2,
  },
  {
    title: {
      en: 'Advanced Referral Strategies',
      my: 'အဆင့်မြင့် လွှဲပြောင်းခြင်းနည်းလမ်းများ',
    },
    description: {
      en: 'Master advanced techniques to maximize your referral success rate and earnings.',
      my: 'သင့်လွှဲပြောင်း အောင်မြင်မှုနှုန်းနှင့် ဝင်ငွေကို အများဆုံးတိုးတက်စေရန် အဆင့်မြင့် နည်းလမ်းများကို ကျွမ်းကျင်ပါ။',
    },
    slug: 'advanced-referral-strategies',
    category: 'referral_strategies',
    difficulty: 'advanced',
    status: 'published',
    content: [
      {
        order: 1,
        title: {
          en: 'Building Your Network',
          my: 'သင့်ကွန်ရက်ကို တည်ဆောက်ခြင်း',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/networking.mp4',
        duration: 15,
        isRequired: true,
      },
      {
        order: 2,
        title: {
          en: 'Effective Communication',
          my: 'ထိရောက်သော ဆက်သွယ်ခြင်း',
        },
        type: 'article',
        content: {
          en: `Tips for effective communication with candidates:

1. Be Professional
   - Use proper language
   - Be respectful and courteous
   - Respond promptly

2. Be Clear
   - Explain the job clearly
   - Set realistic expectations
   - Provide all necessary details

3. Be Supportive
   - Help with interview preparation
   - Follow up after interviews
   - Celebrate their success`,
          my: `လျှောက်ထားသူများနှင့် ထိရောက်သောဆက်သွယ်ခြင်းအတွက် အကြံပေးချက်များ-

၁။ ကျွမ်းကျင်စွာပြုလုပ်ပါ
   - သင့်တော်သောဘာသာစကားကို အသုံးပြုပါ
   - လေးစားမှုနှင့် ဧည့်ခံမှုရှိပါ
   - ချက်ချင်းတုံ့ပြန်ပါ

၂။ ရှင်းလင်းပါ
   - အလုပ်ကို ရှင်းလင်းစွာ объясните
   - မှန်ကန်သောမျှော်လင့်ချက်များကို သတ်မှတ်ပါ
   - လိုအပ်သမျှ အသေးစိတ်ပေးပါ

၃။ အထောက်အကူပေးပါ
   - အင်တာဗျူးအတွက် အဆင်သင့်ဖြစ်အောင် ကူညီပါ
   - အင်တာဗျူးပြီးပါက follow up လုပ်ပါ
   - သူတို့အောင်မြင်မှုကို ချီးကျူးပါ`,
        },
        duration: 12,
        isRequired: true,
      },
      {
        order: 3,
        title: {
          en: 'Company Relationship Management',
          my: 'ကုမ္ပဏီဆက်ဆံရေးစီမံခန့်ခွဲခြင်း',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/company-relationships.mp4',
        duration: 15,
        isRequired: true,
      },
      {
        order: 4,
        title: {
          en: 'Success Stories',
          my: 'အောင်မြင်မှုအကြောင်းများ',
        },
        type: 'video',
        videoUrl: 'https://cdn.trm.referral/academy/success-stories.mp4',
        duration: 10,
        isRequired: false,
      },
      {
        order: 5,
        title: {
          en: 'Quiz: Advanced Concepts',
          my: 'အဆင့်မြင်အယူအဆ စစ်ဆေးခြင်း',
        },
        type: 'quiz',
        quiz: [
          {
            question: {
              en: 'What is the most important factor in successful referrals?',
              my: 'အောင်မြင်သောလွှဲပြောင်းခြင်းတွင် အရေးပါဆုံးအချက်ကဘာလဲ?',
            },
            options: [
              { en: 'Quantity of referrals', my: 'လွှဲပြောင်းခြင်းအရေအတွက်' },
              { en: 'Quality of candidate matching', my: 'လျှောက်ထားသူကိုက်ညီမှု အရည်အသွေး' },
              { en: 'Speed of submission', my: 'တင်သွင်းခြင်း အမြန်နှုန်း' },
              { en: 'Number of companies contacted', my: 'ဆက်သွယ်ထားသော ကုမ္ပဏီအရေအတွက်' },
            ],
            correctAnswer: 1,
            explanation: {
              en: 'Quality matching between candidates and job requirements is the most important factor.',
              my: 'လျှောက်ထားသူနှင့် အလုပ်လိုအပ်ချက်များအကြား အရည်အသွေးကိုက်ညီမှုသည် အရေးပါဆုံးအချက်ဖြစ်သည်။',
            },
          },
        ],
        duration: 15,
        isRequired: true,
      },
    ],
    thumbnailUrl: 'https://cdn.trm.referral/academy/advanced-strategies-thumb.jpg',
    estimatedDuration: 67,
    points: 200,
    tags: ['advanced', 'networking', 'communication', 'strategy'],
    isFeatured: true,
    order: 3,
  },
];

async function seedAcademy() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing courses...');
    await AcademyCourse.deleteMany({});

    console.log('Seeding courses...');
    for (const courseData of sampleCourses) {
      const course = await AcademyCourse.create({
        ...courseData,
        metadata: {
          author: 'TRM Academy Team',
          publishedAt: new Date(),
          lastUpdatedAt: new Date(),
          viewCount: 0,
          completionCount: 0,
        },
      });
      console.log(`Created course: ${course.title.en}`);
    }

    console.log(`\n✅ Successfully seeded ${sampleCourses.length} courses`);
    console.log('Categories covered:');
    const categories = [...new Set(sampleCourses.map(c => c.category))];
    categories.forEach(cat => console.log(`  - ${cat}`));

  } catch (error) {
    console.error('Error seeding academy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedAcademy();
}

module.exports = seedAcademy;
