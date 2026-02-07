/**
 * Academy Progress Model
 * Tracks user progress through Referral Academy courses
 */

const mongoose = require('mongoose');

const PROGRESS_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

const academyProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademyCourse',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(PROGRESS_STATUS),
    default: PROGRESS_STATUS.NOT_STARTED,
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  lastAccessedAt: { type: Date },
  progress: {
    currentSection: { type: Number, default: 0 },
    completedSections: [{ type: Number }],
    totalSections: { type: Number },
    percentage: { type: Number, default: 0 },
  },
  quizResults: [{
    sectionIndex: { type: Number, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    answers: [{ type: Number }],
    passed: { type: Boolean, required: true },
    completedAt: { type: Date, default: Date.now },
    attempts: { type: Number, default: 1 },
  }],
  timeSpent: { type: Number, default: 0 }, // in minutes
  notes: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  certificateIssued: { type: Boolean, default: false },
  certificateUrl: { type: String },
  pointsEarned: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Compound index
academyProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Methods
academyProgressSchema.methods.start = async function() {
  this.status = PROGRESS_STATUS.IN_PROGRESS;
  this.startedAt = new Date();
  this.lastAccessedAt = new Date();
  return this.save();
};

academyProgressSchema.methods.updateProgress = async function(sectionIndex, completed = false) {
  this.lastAccessedAt = new Date();
  this.progress.currentSection = sectionIndex;
  
  if (completed && !this.progress.completedSections.includes(sectionIndex)) {
    this.progress.completedSections.push(sectionIndex);
  }
  
  // Calculate percentage
  if (this.progress.totalSections > 0) {
    this.progress.percentage = Math.round(
      (this.progress.completedSections.length / this.progress.totalSections) * 100
    );
  }
  
  // Check if course is complete
  if (this.progress.percentage >= 100) {
    await this.complete();
  }
  
  return this.save();
};

academyProgressSchema.methods.complete = async function() {
  this.status = PROGRESS_STATUS.COMPLETED;
  this.completedAt = new Date();
  this.progress.percentage = 100;
  this.lastAccessedAt = new Date();
  
  // Award points if not already awarded
  if (this.pointsEarned === 0) {
    const AcademyCourse = mongoose.model('AcademyCourse');
    const course = await AcademyCourse.findById(this.courseId);
    if (course) {
      this.pointsEarned = course.points || 0;
    }
  }
  
  return this.save();
};

academyProgressSchema.methods.addQuizResult = async function(sectionIndex, score, totalQuestions, answers, passed) {
  const existingResult = this.quizResults.find(
    r => r.sectionIndex === sectionIndex
  );
  
  if (existingResult) {
    existingResult.score = score;
    existingResult.answers = answers;
    existingResult.passed = passed;
    existingResult.attempts += 1;
    existingResult.completedAt = new Date();
  } else {
    this.quizResults.push({
      sectionIndex,
      score,
      totalQuestions,
      answers,
      passed,
      completedAt: new Date(),
      attempts: 1,
    });
  }
  
  return this.save();
};

academyProgressSchema.methods.addTimeSpent = async function(minutes) {
  this.timeSpent += minutes;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Statics
academyProgressSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).populate('courseId', 'title slug category thumbnailUrl');
};

academyProgressSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId }).populate('userId', 'name email avatar');
};

academyProgressSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalCourses: { $sum: 1 },
        completedCourses: {
          $sum: { $cond: [{ $eq: ['$status', PROGRESS_STATUS.COMPLETED] }, 1, 0] },
        },
        inProgressCourses: {
          $sum: { $cond: [{ $eq: ['$status', PROGRESS_STATUS.IN_PROGRESS] }, 1, 0] },
        },
        totalPoints: { $sum: '$pointsEarned' },
        totalTimeSpent: { $sum: '$timeSpent' },
      },
    },
  ]);
  
  return stats[0] || {
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalPoints: 0,
    totalTimeSpent: 0,
  };
};

academyProgressSchema.statics.getLeaderboard = async function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$userId',
        completedCourses: {
          $sum: { $cond: [{ $eq: ['$status', PROGRESS_STATUS.COMPLETED] }, 1, 0] },
        },
        totalPoints: { $sum: '$pointsEarned' },
        totalTimeSpent: { $sum: '$timeSpent' },
      },
    },
    { $sort: { totalPoints: -1, completedCourses: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        avatar: '$user.avatar',
        completedCourses: 1,
        totalPoints: 1,
        totalTimeSpent: 1,
      },
    },
  ]);
};

module.exports = mongoose.model('AcademyProgress', academyProgressSchema);
module.exports.PROGRESS_STATUS = PROGRESS_STATUS;
