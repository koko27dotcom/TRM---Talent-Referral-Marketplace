/**
 * Community Service
 * Manages community engagement, discussions, and social features
 */

const { CommunityPost, CommunityGroup, Comment, Event, User } = require('../models/index.js');
const notificationService = require('./notificationService.js');

/**
 * Create a new community post
 */
const createPost = async (userId, postData) => {
  const post = await CommunityPost.create({
    authorId: userId,
    ...postData,
  });
  
  // Notify followers
  await notifyFollowers(userId, 'new_post', post);
  
  return post;
};

/**
 * Get community feed
 */
const getFeed = async (userId, options = {}) => {
  const { page = 1, limit = 20, category, sortBy = 'recent' } = options;
  
  const query = { status: 'published' };
  if (category) query.category = category;
  
  let sortOption = {};
  switch (sortBy) {
    case 'popular':
      sortOption = { 'engagement.views': -1 };
      break;
    case 'trending':
      sortOption = { 'engagement.likes': -1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }
  
  const posts = await CommunityPost.find(query)
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('authorId', 'name avatar')
    .populate('groupId', 'name');
  
  return posts;
};

/**
 * Get post by ID
 */
const getPost = async (postId, userId = null) => {
  const post = await CommunityPost.findById(postId)
    .populate('authorId', 'name avatar')
    .populate('groupId', 'name');
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Increment view count
  await post.incrementViews();
  
  // Check if user liked the post
  let userLiked = false;
  if (userId) {
    userLiked = post.likes.includes(userId);
  }
  
  // Get comments
  const comments = await Comment.find({ postId })
    .sort({ createdAt: -1 })
    .populate('authorId', 'name avatar');
  
  return {
    post,
    userLiked,
    comments,
  };
};

/**
 * Like a post
 */
const likePost = async (postId, userId) => {
  const post = await CommunityPost.findById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  const alreadyLiked = post.likes.includes(userId);
  
  if (alreadyLiked) {
    // Unlike
    post.likes = post.likes.filter(id => id.toString() !== userId.toString());
  } else {
    // Like
    post.likes.push(userId);
    
    // Notify post author
    if (post.authorId.toString() !== userId.toString()) {
      await notificationService.createNotification({
        userId: post.authorId,
        type: 'post_like',
        title: 'New Like',
        message: 'Someone liked your post',
        data: { postId },
      });
    }
  }
  
  await post.save();
  
  return {
    liked: !alreadyLiked,
    likesCount: post.likes.length,
  };
};

/**
 * Add comment to post
 */
const addComment = async (postId, userId, content, parentId = null) => {
  const post = await CommunityPost.findById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  const comment = await Comment.create({
    postId,
    authorId: userId,
    content,
    parentId,
  });
  
  // Increment post comment count
  await post.incrementComments();
  
  // Notify post author
  if (post.authorId.toString() !== userId.toString()) {
    await notificationService.createNotification({
      userId: post.authorId,
      type: 'post_comment',
      title: 'New Comment',
      message: 'Someone commented on your post',
      data: { postId, commentId: comment._id },
    });
  }
  
  return comment.populate('authorId', 'name avatar');
};

/**
 * Create community group
 */
const createGroup = async (userId, groupData) => {
  const group = await CommunityGroup.create({
    creatorId: userId,
    ...groupData,
    members: [{
      userId,
      role: 'admin',
      joinedAt: new Date(),
    }],
  });
  
  return group;
};

/**
 * Join group
 */
const joinGroup = async (groupId, userId) => {
  const group = await CommunityGroup.findById(groupId);
  
  if (!group) {
    throw new Error('Group not found');
  }
  
  const alreadyMember = group.members.some(m => m.userId.toString() === userId.toString());
  
  if (alreadyMember) {
    throw new Error('Already a member of this group');
  }
  
  group.members.push({
    userId,
    role: 'member',
    joinedAt: new Date(),
  });
  
  await group.save();
  
  return group;
};

/**
 * Get group discussions
 */
const getGroupDiscussions = async (groupId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  
  const posts = await CommunityPost.find({
    groupId,
    status: 'published',
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('authorId', 'name avatar');
  
  return posts;
};

/**
 * Create event
 */
const createEvent = async (userId, eventData) => {
  const event = await Event.create({
    organizerId: userId,
    ...eventData,
  });
  
  return event;
};

/**
 * Register for event
 */
const registerForEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  if (event.status !== 'upcoming') {
    throw new Error('Event registration is closed');
  }
  
  const alreadyRegistered = event.attendees.some(a => a.userId.toString() === userId.toString());
  
  if (alreadyRegistered) {
    throw new Error('Already registered for this event');
  }
  
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
    throw new Error('Event is full');
  }
  
  event.attendees.push({
    userId,
    registeredAt: new Date(),
    status: 'registered',
  });
  
  await event.save();
  
  return event;
};

/**
 * Get community statistics
 */
const getCommunityStats = async () => {
  const [
    totalPosts,
    totalGroups,
    totalEvents,
    totalComments,
    activeUsers,
  ] = await Promise.all([
    CommunityPost.countDocuments({ status: 'published' }),
    CommunityGroup.countDocuments(),
    Event.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } }),
    Comment.countDocuments(),
    CommunityPost.distinct('authorId').then(users => users.length),
  ]);
  
  return {
    totalPosts,
    totalGroups,
    totalEvents,
    totalComments,
    activeUsers,
  };
};

/**
 * Get trending topics
 */
const getTrendingTopics = async (limit = 10) => {
  const posts = await CommunityPost.aggregate([
    { $match: { status: 'published', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
        posts: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  
  return posts.map(p => ({
    tag: p._id,
    count: p.count,
  }));
};

/**
 * Notify followers
 */
const notifyFollowers = async (userId, type, data) => {
  // Get user's followers
  const user = await User.findById(userId);
  if (!user || !user.followers) return;
  
  for (const followerId of user.followers) {
    await notificationService.createNotification({
      userId: followerId,
      type,
      title: 'New Activity',
      message: `${user.name} created a new post`,
      data,
    });
  }
};

module.exports = {
  // Posts
  createPost,
  getFeed,
  getPost,
  likePost,
  addComment,
  
  // Groups
  createGroup,
  joinGroup,
  getGroupDiscussions,
  
  // Events
  createEvent,
  registerForEvent,
  
  // Statistics
  getCommunityStats,
  getTrendingTopics,
};
