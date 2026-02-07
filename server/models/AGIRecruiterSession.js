/**
 * AGI Recruiter Session Model
 * Tracks autonomous recruitment sessions for the AGI-Powered Recruitment Agent
 * Part of Phase 5 Feature 1 - World's first fully autonomous AI recruiter
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// AI Configuration schema
const AIConfigSchema = new Schema({
  modelProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'google', 'hybrid'],
    default: 'hybrid',
  },
  primaryModel: {
    type: String,
    enum: ['gpt-4', 'gpt-5', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro', 'gemini-ultra'],
    default: 'gpt-4',
  },
  reasoningModel: {
    type: String,
    enum: ['claude-3-opus', 'gpt-4', 'gemini-pro'],
    default: 'claude-3-opus',
  },
  temperature: {
    type: Number,
    min: 0,
    max: 2,
    default: 0.7,
  },
  maxTokens: {
    type: Number,
    default: 4000,
  },
  features: {
    facialAnalysis: { type: Boolean, default: true },
    sentimentAnalysis: { type: Boolean, default: true },
    truthDetection: { type: Boolean, default: true },
    codeEvaluation: { type: Boolean, default: true },
    plagiarismCheck: { type: Boolean, default: true },
    autoOutreach: { type: Boolean, default: true },
    offerNegotiation: { type: Boolean, default: true },
  },
}, { _id: false });

// Progress tracking schema
const ProgressSchema = new Schema({
  stage: {
    type: String,
    enum: [
      'initialized',
      'job_analysis',
      'candidate_sourcing',
      'outreach',
      'interview_scheduling',
      'interview_conducting',
      'assessment',
      'reference_check',
      'evaluation',
      'offer_negotiation',
      'offer_generation',
      'completed',
    ],
    default: 'initialized',
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  candidatesSourced: {
    type: Number,
    default: 0,
  },
  candidatesContacted: {
    type: Number,
    default: 0,
  },
  interviewsCompleted: {
    type: Number,
    default: 0,
  },
  assessmentsCompleted: {
    type: Number,
    default: 0,
  },
  offersExtended: {
    type: Number,
    default: 0,
  },
  offersAccepted: {
    type: Number,
    default: 0,
  },
  lastAction: {
    type: String,
    default: null,
  },
  lastActionAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

// Candidate Profile schema (ideal candidate generated from JD analysis)
const CandidateProfileSchema = new Schema({
  requiredSkills: [{
    skill: String,
    importance: {
      type: String,
      enum: ['essential', 'preferred', 'nice_to_have'],
    },
    minimumYears: Number,
  }],
  preferredSkills: [String],
  minimumExperience: {
    years: Number,
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    },
  },
  educationRequirements: [{
    degree: String,
    field: String,
    required: Boolean,
  }],
  personalityTraits: [String],
  cultureFitIndicators: [String],
  salaryExpectation: {
    min: Number,
    max: Number,
    currency: String,
  },
  locationPreference: {
    type: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid', 'any'],
    },
    cities: [String],
    countries: [String],
  },
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native'],
    },
  }],
}, { _id: false });

// Main AGI Recruiter Session Schema
const AGIRecruiterSessionSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator user ID is required'],
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'active',
    index: true,
  },
  currentStage: {
    type: String,
    enum: [
      'initialized',
      'job_analysis',
      'candidate_sourcing',
      'outreach',
      'interview_scheduling',
      'interview_conducting',
      'assessment',
      'reference_check',
      'evaluation',
      'offer_negotiation',
      'offer_generation',
      'completed',
    ],
    default: 'initialized',
  },
  candidateProfile: {
    type: CandidateProfileSchema,
    default: null,
  },
  progress: {
    type: ProgressSchema,
    default: () => ({}),
  },
  aiConfig: {
    type: AIConfigSchema,
    default: () => ({}),
  },
  targetCandidates: {
    type: Number,
    default: 10,
    min: 1,
    max: 100,
  },
  sourcedCandidates: [{
    type: Schema.Types.ObjectId,
    ref: 'AGICandidateSource',
  }],
  scheduledInterviews: [{
    type: Schema.Types.ObjectId,
    ref: 'AGIInterview',
  }],
  generatedAssessments: [{
    type: Schema.Types.ObjectId,
    ref: 'AGIAssessment',
  }],
  topCandidates: [{
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    overallScore: Number,
    interviewScore: Number,
    assessmentScore: Number,
    cultureFitScore: Number
