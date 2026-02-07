/**
 * EventService
 * Manages events, registrations, reminders, and calendar integration
 */

const { Event, EVENT_STATUS, EVENT_FORMATS, ATTENDEE_STATUS } = require('../models/Event.js');
const { PublicProfile } = require('../models/PublicProfile.js');
const NotificationService = require('./notificationService.js');
const { createCanvas } = require('canvas');

class EventService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ==================== EVENT MANAGEMENT ====================

  /**
   * Create a new event
   */
  async createEvent(eventData, organizerId) {
    try {
      const event = new Event({
        ...eventData,
        organizerId,
        status: EVENT_STATUS.DRAFT,
      });

      await event.save();

      return {
        success: true,
        event: await Event.findById(event._id)
          .populate('organizerId', 'name avatar')
          .populate('speakers.userId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId, userId = null) {
    try {
      const event = await Event.findById(eventId)
        .populate('organizerId', 'name avatar')
        .populate('coOrganizers', 'name avatar')
        .populate('speakers.userId', 'name avatar')
        .populate('attendees.userId', 'name avatar')
        .lean();

      if (!event) {
        throw new Error('Event not found');
      }

      // Add user-specific data
      if (userId) {
        event.isRegistered = event.attendees?.some(
          a => a.userId?._id?.toString() === userId.toString() && 
               a.status !== ATTENDEE_STATUS.CANCELLED
        );
        event.userStatus = event.attendees?.find(
          a => a.userId?._id?.toString() === userId.toString()
        )?.status;
      }

      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, updateData, userId, isAdmin = false) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Check ownership
      const isOrganizer = event.organizerId.toString() === userId.toString();
      const isCoOrganizer = event.coOrganizers?.some(id => id.toString() === userId.toString());
      
      if (!isOrganizer && !isCoOrganizer && !isAdmin) {
        throw new Error('Unauthorized to update this event');
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        updateData,
        { new: true }
      )
        .populate('organizerId', 'name avatar')
        .populate('speakers.userId', 'name avatar')
        .lean();

      // Notify registered attendees of significant changes
      if (updateData.startDate || updateData.location || updateData.virtualDetails) {
        await this.notifyAttendeesOfChange(eventId, updateData);
      }

      return {
        success: true,
        event: updatedEvent,
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Publish an event
   */
  async publishEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      event.status = EVENT_STATUS.PUBLISHED;
      await event.save();

      // Notify followers of organizer
      await this.notifyFollowersOfNewEvent(event);

      return {
        success: true,
        event: await this.getEventById(eventId),
      };
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId, userId, reason = '') {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      event.status = EVENT_STATUS.CANCELLED;
      await event.save();

      // Notify all registered attendees
      await this.notifyAttendeesOfCancellation(eventId, reason);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  }

  // ==================== REGISTRATION ====================

  /**
   * Register for an event
   */
  async registerForEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== EVENT_STATUS.PUBLISHED) {
        throw new Error('Event is not open for registration');
      }

      const result = event.registerAttendee(userId);

      if (!result.success) {
        if (result.reason === 'event_full') {
          // Add to waitlist
          event.addToWaitlist(userId);
          await event.save();
          
          return {
            success: true,
            onWaitlist: true,
            message: 'Event is full. You have been added to the waitlist.',
          };
        }
        
        throw new Error(result.reason === 'already_registered' 
          ? 'Already registered for this event' 
          : 'Registration failed');
      }

      await event.save();

      // Update user profile
      await PublicProfile.updateOne(
        { userId },
        { $inc: { 'statistics.eventsAttended': 1 } }
      );

      // Send confirmation notification
      await this.notificationService.create({
        userId,
        type: 'event_registered',
        title: 'Event Registration Confirmed',
        message: `You are registered for: ${event.title}`,
        data: { eventId },
      });

      // Send calendar invite
      await this.sendCalendarInvite(eventId, userId);

      return {
        success: true,
        onWaitlist: false,
        status: result.status,
      };
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      const success = event.cancelRegistration(userId);

      if (!success) {
        throw new Error('Not registered for this event');
      }

      await event.save();

      // Update user profile
      await PublicProfile.updateOne(
        { userId },
        { $inc: { 'statistics.eventsAttended': -1 } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error cancelling registration:', error);
      throw error;
    }
  }

  /**
   * Check in attendee
   */
  async checkInAttendee(eventId, attendeeId, checkedInBy) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Verify checker is organizer or co-organizer
      const isAuthorized = event.organizerId.toString() === checkedInBy.toString() ||
                          event.coOrganizers?.some(id => id.toString() === checkedInBy.toString());
      
      if (!isAuthorized) {
        throw new Error('Unauthorized to check in attendees');
      }

      const success = event.checkInAttendee(attendeeId, checkedInBy);

      if (!success) {
        throw new Error('Attendee not found or already checked in');
      }

      await event.save();

      return { success: true };
    } catch (error) {
      console.error('Error checking in attendee:', error);
      throw error;
    }
  }

  // ==================== LISTINGS & SEARCH ====================

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(filters = {}, limit = 20, skip = 0) {
    try {
      const events = await Event.getUpcoming(limit, filters);
      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get events for user
   */
  async getUserEvents(userId, status = null) {
    try {
      const events = await Event.getUserEvents(userId, status);
      return events;
    } catch (error) {
      console.error('Error getting user events:', error);
      throw error;
    }
  }

  /**
   * Get events by organizer
   */
  async getOrganizerEvents(organizerId, options = {}) {
    try {
      const events = await Event.getOrganizerEvents(organizerId, options);
      return events;
    } catch (error) {
      console.error('Error getting organizer events:', error);
      throw error;
    }
  }

  /**
   * Search events
   */
  async searchEvents(query, options = {}) {
    try {
      const events = await Event.search(query, options);
      return events;
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  // ==================== CALENDAR INTEGRATION ====================

  /**
   * Generate iCal file for event
   */
  async generateICal(eventId) {
    try {
      const event = await Event.findById(eventId)
        .populate('organizerId', 'name email')
        .lean();

      if (!event) {
        throw new Error('Event not found');
      }

      const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      let location = '';
      if (event.format === EVENT_FORMATS.PHYSICAL && event.location) {
        location = `${event.location.venue}, ${event.location.address?.city}`;
      } else if (event.format === EVENT_FORMATS.VIRTUAL && event.virtualDetails) {
        location = 'Virtual Event';
      }

      const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TRM Platform//Event Calendar//EN',
        'BEGIN:VEVENT',
        `UID:${event.eventId}@trm-platform.com`,
        `DTSTART:${formatDate(event.startDate)}`,
        `DTEND:${formatDate(event.endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.shortDescription || event.description?.substring(0, 200)}`,
        `LOCATION:${location}`,
        `ORGANIZER;CN=${event.organizerId?.name || 'Organizer'}:mailto:${event.organizerId?.email || 'events@trm-platform.com'}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      return icalContent;
    } catch (error) {
      console.error('Error generating iCal:', error);
      throw error;
    }
  }

  /**
   * Send calendar invite to attendee
   */
  async sendCalendarInvite(eventId, userId) {
    try {
      const icalContent = await this.generateICal(eventId);
      
      // In a real implementation, this would send an email with the .ics attachment
      // For now, we just log it
      console.log(`Calendar invite generated for user ${userId} for event ${eventId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending calendar invite:', error);
      throw error;
    }
  }

  // ==================== REMINDERS ====================

  /**
   * Send event reminders
   */
  async sendReminders() {
    try {
      const now = new Date();
      const reminderWindows = [24, 1]; // 24 hours and 1 hour before

      for (const hours of reminderWindows) {
        const reminderTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
        const windowStart = new Date(reminderTime.getTime() - 30 * 60 * 1000); // 30 min window
        const windowEnd = new Date(reminderTime.getTime() + 30 * 60 * 1000);

        const events = await Event.find({
          status: EVENT_STATUS.PUBLISHED,
          startDate: { $gte: windowStart, $lte: windowEnd },
          'settings.sendReminders': true,
        }).populate('attendees.userId', 'name email');

        for (const event of events) {
          for (const attendee of event.attendees) {
            if (attendee.status === ATTENDEE_STATUS.CONFIRMED && !attendee.reminderSent) {
              await this.notificationService.create({
                userId: attendee.userId,
                type: 'event_reminder',
                title: `Reminder: ${event.title}`,
                message: `Your event starts in ${hours} hour${hours > 1 ? 's' : ''}`,
                data: { eventId: event._id, hours },
              });

              attendee.reminderSent = true;
            }
          }

          await event.save();
        }
      }

      return { success: true, remindersSent: true };
    } catch (error) {
      console.error('Error sending reminders:', error);
      throw error;
    }
  }

  // ==================== RECORDING MANAGEMENT ====================

  /**
   * Add recording to event
   */
  async addRecording(eventId, recordingUrl, userId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      event.recordingUrl = recordingUrl;
      event.isRecorded = true;
      await event.save();

      // Notify attendees that recording is available
      await this.notifyAttendeesOfRecording(eventId);

      return { success: true };
    } catch (error) {
      console.error('Error adding recording:', error);
      throw error;
    }
  }

  // ==================== QR CODE GENERATION ====================

  /**
   * Generate QR code for event check-in
   */
  async generateCheckInQR(eventId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Generate a simple QR code data
      const qrData = JSON.stringify({
        eventId: event._id.toString(),
        eventIdCode: event.eventId,
        timestamp: Date.now(),
      });

      // In a real implementation, use a QR code library
      // For now, return the data that would be encoded
      return {
        success: true,
        qrData,
        eventId: event.eventId,
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Notify attendees of event changes
   */
  async notifyAttendeesOfChange(eventId, changes) {
    try {
      const event = await Event.findById(eventId).populate('attendees.userId');
      
      if (!event) return;

      const changeDescription = Object.keys(changes).join(', ');

      for (const attendee of event.attendees) {
        if (attendee.status === ATTENDEE_STATUS.CANCELLED) continue;

        await this.notificationService.create({
          userId: attendee.userId,
          type: 'event_updated',
          title: 'Event Updated',
          message: `The event "${event.title}" has been updated (${changeDescription})`,
          data: { eventId, changes },
        });
      }
    } catch (error) {
      console.error('Error notifying attendees of change:', error);
    }
  }

  /**
   * Notify attendees of cancellation
   */
  async notifyAttendeesOfCancellation(eventId, reason) {
    try {
      const event = await Event.findById(eventId).populate('attendees.userId');
      
      if (!event) return;

      for (const attendee of event.attendees) {
        if (attendee.status === ATTENDEE_STATUS.CANCELLED) continue;

        await this.notificationService.create({
          userId: attendee.userId,
          type: 'event_cancelled',
          title: 'Event Cancelled',
          message: `The event "${event.title}" has been cancelled. ${reason}`,
          data: { eventId, reason },
        });
      }
    } catch (error) {
      console.error('Error notifying attendees of cancellation:', error);
    }
  }

  /**
   * Notify attendees of recording availability
   */
  async notifyAttendeesOfRecording(eventId) {
    try {
      const event = await Event.findById(eventId).populate('attendees.userId');
      
      if (!event) return;

      for (const attendee of event.attendees) {
        if (attendee.status !== ATTENDEE_STATUS.ATTENDED) continue;

        await this.notificationService.create({
          userId: attendee.userId,
          type: 'recording_available',
          title: 'Event Recording Available',
          message: `The recording for "${event.title}" is now available`,
          data: { eventId, recordingUrl: event.recordingUrl },
        });
      }
    } catch (error) {
      console.error('Error notifying attendees of recording:', error);
    }
  }

  /**
   * Notify followers of new event
   */
  async notifyFollowersOfNewEvent(event) {
    try {
      // In a real implementation, get followers of organizer
      // For now, notify based on interests
      
      const interestedUsers = await PublicProfile.find({
        expertise: { $in: event.categories },
        isPublic: true,
      }).select('userId');

      for (const profile of interestedUsers) {
        await this.notificationService.create({
          userId: profile.userId,
          type: 'new_event',
          title: 'New Event You Might Like',
          message: `Check out: ${event.title}`,
          data: { eventId: event._id },
        });
      }
    } catch (error) {
      console.error('Error notifying followers:', error);
    }
  }
}

module.exports = EventService;