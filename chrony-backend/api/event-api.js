const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const User = require("../models/user");
const schedulingService = require("../services/schedulingService");

// Helper function to create recurring events
const createRecurringEvents = (eventData, recurrence) => {
  const events = [];
  const { frequency, interval, count = 10 } = recurrence;

  for (let i = 0; i < count; i++) {
    const eventStart = new Date(eventData.start);
    const eventEnd = new Date(eventData.end);

    // Calculate the date offset
    if (frequency === "daily") {
      eventStart.setDate(eventStart.getDate() + i * interval);
      eventEnd.setDate(eventEnd.getDate() + i * interval);
    } else if (frequency === "weekly") {
      eventStart.setDate(eventStart.getDate() + i * interval * 7);
      eventEnd.setDate(eventEnd.getDate() + i * interval * 7);
    } else if (frequency === "monthly") {
      eventStart.setMonth(eventStart.getMonth() + i * interval);
      eventEnd.setMonth(eventEnd.getMonth() + i * interval);
    }

    events.push({
      ...eventData,
      start: eventStart,
      end: eventEnd,
    });
  }

  return events;
};

// Helper function to update moved events in database atomically
const updateMovedEventsInDatabase = async (movedEvents) => {
  const updatePromises = movedEvents.map(async (movedEvent) => {
    // Extract database ID (handle both _id and id formats)
    const eventId = movedEvent._id || movedEvent.id;

    if (!eventId) {
      console.warn(
        "⚠️ Moved event missing ID, skipping database update:",
        movedEvent.title
      );
      return null;
    }

    try {
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        {
          start: movedEvent.start,
          end: movedEvent.end,
          // Preserve other fields but update timestamps
          updated: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!updatedEvent) {
        console.warn(
          `⚠️ Event ${eventId} not found in database during move update`
        );
        return null;
      }

      console.log(`📍 Updated moved event in DB: ${updatedEvent.title}`);
      return updatedEvent;
    } catch (error) {
      console.error(
        `❌ Failed to update moved event ${eventId}:`,
        error.message
      );
      throw error; // Re-throw to trigger transaction rollback
    }
  });

  // Wait for all updates to complete
  const results = await Promise.all(updatePromises);
  return results.filter((result) => result !== null); // Remove null results
};

// Create a new event with intelligent scheduling and cascading support
router.post("/", async (req, res) => {
  try {
    const { title, start, end, type, description, recurrence, user, duration } =
      req.body;

    // Validate required fields
    if (!title || !start || !end || !type || !user) {
      return res.status(400).json({
        error: "Missing required fields: title, start, end, type, or user",
        type: "VALIDATION_ERROR",
      });
    }

    console.log(`\n📅 API: Creating ${type} event "${title}" for user ${user}`);

    // Step 1: Fetch user settings (required for scheduling algorithm)
    const userDoc = await User.findById(user);
    if (!userDoc) {
      return res.status(404).json({
        error: "User not found",
        type: "USER_NOT_FOUND",
      });
    }

    // Validate user has completed settings setup
    if (
      !userDoc.settings ||
      !userDoc.settings.activeStartTime ||
      !userDoc.settings.activeEndTime
    ) {
      return res.status(400).json({
        error:
          "User settings incomplete. Please complete your profile setup first.",
        type: "INCOMPLETE_SETTINGS",
      });
    }

    // Step 2: Fetch existing events for conflict checking
    const existingEvents = await Event.find({ user: user });
    console.log(
      `📊 Found ${existingEvents.length} existing events for conflict checking`
    );

    // Step 3: Prepare event data for scheduling
    const eventStart = new Date(start);
    const eventEnd = new Date(end);

    // Calculate duration for event (in seconds)
    const calculatedDuration =
      duration || Math.floor((eventEnd - eventStart) / 1000);

    const baseEventData = {
      title,
      start: eventStart,
      end: eventEnd,
      type,
      description: description || "",
      user,
      duration: calculatedDuration,
    };

    let finalResponse = {
      success: true,
      events: [],
      movedEvents: [],
      message: "",
    };

    if (recurrence && recurrence.enabled) {
      console.log(
        `🔄 Creating ${recurrence.count} recurring events with cascading`
      );

      const eventInstances = createRecurringEvents(baseEventData, recurrence);
      const createdEvents = [];
      const allMovedEvents = [];

      // Schedule each recurring event individually with cumulative conflict checking
      for (let i = 0; i < eventInstances.length; i++) {
        const instance = eventInstances[i];
        console.log(
          `\n🧠 Scheduling recurring instance ${i + 1}/${eventInstances.length}`
        );

        try {
          // Include previously scheduled instances in conflict checking
          const currentExistingEvents = [
            ...existingEvents,
            ...createdEvents,
            ...allMovedEvents,
          ];

          // Use enhanced scheduling service
          const schedulingResult = await schedulingService.scheduleEvent(
            instance,
            currentExistingEvents,
            userDoc.settings
          );

          // Handle the enhanced response format
          if (schedulingResult.scheduledEvent) {
            createdEvents.push(schedulingResult.scheduledEvent);
          }

          if (
            schedulingResult.movedEvents &&
            schedulingResult.movedEvents.length > 0
          ) {
            console.log(
              `📋 Instance ${i + 1} caused ${
                schedulingResult.movedEvents.length
              } events to be moved`
            );
            allMovedEvents.push(...schedulingResult.movedEvents);
          }
        } catch (error) {
          console.error(
            `❌ Failed to schedule recurring instance ${i + 1}:`,
            error.message
          );

          // For recurring events, handle failures gracefully
          if (type === "fixed") {
            // Fixed events must be scheduled exactly, so fail if there's a conflict
            return res.status(409).json({
              error: `Cannot schedule recurring event instance ${i + 1}: ${
                error.message
              }`,
              type: "RECURRING_SCHEDULING_CONFLICT",
              failedInstance: i + 1,
            });
          } else {
            // For flexible/fluid, skip this instance and continue
            console.log(
              `⚠️ Skipping recurring instance ${
                i + 1
              } due to scheduling conflict`
            );
            continue;
          }
        }
      }

      if (createdEvents.length === 0) {
        return res.status(409).json({
          error: "Unable to schedule any instances of the recurring event",
          type: "RECURRING_TOTAL_FAILURE",
        });
      }

      // Database transaction: Save all new events and update moved events
      try {
        // Update moved events first
        if (allMovedEvents.length > 0) {
          console.log(
            `🔄 Updating ${allMovedEvents.length} moved events in database`
          );
          await updateMovedEventsInDatabase(allMovedEvents);
        }

        // Save all new recurring events
        const savedEvents = await Event.insertMany(createdEvents);
        console.log(
          `✅ Successfully created ${savedEvents.length} recurring events`
        );

        finalResponse.events = savedEvents;
        finalResponse.movedEvents = allMovedEvents;
        finalResponse.message = `Created ${savedEvents.length} recurring events`;

        if (allMovedEvents.length > 0) {
          finalResponse.message += `, moved ${allMovedEvents.length} existing events`;
        }
      } catch (dbError) {
        console.error("❌ Database transaction failed:", dbError.message);
        return res.status(500).json({
          error: "Failed to save events to database",
          type: "DATABASE_ERROR",
          details: dbError.message,
        });
      }
    } else {
      console.log(`🎯 Creating single event with cascading support`);

      try {
        // Step 4: Use enhanced scheduling service
        const schedulingResult = await schedulingService.scheduleEvent(
          baseEventData,
          existingEvents,
          userDoc.settings
        );

        console.log(`🧠 Scheduling completed:`, {
          originalTime: `${new Date(start).toISOString()} - ${new Date(
            end
          ).toISOString()}`,
          scheduledTime: `${schedulingResult.scheduledEvent.start.toISOString()} - ${schedulingResult.scheduledEvent.end.toISOString()}`,
          movedEventsCount: schedulingResult.movedEvents?.length || 0,
        });

        // Database transaction: Save new event and update moved events
        try {
          // Update moved events first
          if (
            schedulingResult.movedEvents &&
            schedulingResult.movedEvents.length > 0
          ) {
            console.log(
              `🔄 Updating ${schedulingResult.movedEvents.length} moved events in database`
            );
            await updateMovedEventsInDatabase(schedulingResult.movedEvents);
          }

          // Save the new event
          const event = new Event(schedulingResult.scheduledEvent);
          const savedEvent = await event.save();
          console.log(`✅ New event saved successfully`);

          finalResponse.events = [savedEvent];
          finalResponse.movedEvents = schedulingResult.movedEvents || [];
          finalResponse.message = "Event created successfully";

          if (
            schedulingResult.movedEvents &&
            schedulingResult.movedEvents.length > 0
          ) {
            finalResponse.message += `, moved ${schedulingResult.movedEvents.length} existing events`;
          }
        } catch (dbError) {
          console.error("❌ Database transaction failed:", dbError.message);
          return res.status(500).json({
            error: "Failed to save event to database",
            type: "DATABASE_ERROR",
            details: dbError.message,
          });
        }
      } catch (schedulingError) {
        console.error(`❌ Scheduling failed:`, schedulingError.message);

        // Enhanced error handling for different types of scheduling failures
        if (
          schedulingError.message.includes("conflicts with") ||
          schedulingError.message.includes("No available")
        ) {
          return res.status(409).json({
            error: `Scheduling conflict: ${schedulingError.message}`,
            type: "SCHEDULING_CONFLICT",
            suggestion:
              type === "fixed"
                ? "Try a different time for this fixed event"
                : "The algorithm could not find suitable alternative times",
          });
        } else if (schedulingError.message.includes("active hours")) {
          return res.status(400).json({
            error: `Event time constraint: ${schedulingError.message}`,
            type: "TIME_CONSTRAINT_ERROR",
            suggestion: "Check your active hours in settings",
          });
        } else if (schedulingError.message.includes("rest day")) {
          return res.status(400).json({
            error: `Rest day constraint: ${schedulingError.message}`,
            type: "REST_DAY_ERROR",
            suggestion: "Choose a different day (not your rest day)",
          });
        } else {
          return res.status(500).json({
            error: `Scheduling error: ${schedulingError.message}`,
            type: "SCHEDULING_ERROR",
          });
        }
      }
    }

    // Return enhanced response with moved events information
    res.status(201).json(finalResponse);
  } catch (error) {
    console.error("❌ Event creation error:", error);
    res.status(500).json({
      error: "Internal server error during event creation",
      type: "INTERNAL_ERROR",
      details: error.message,
    });
  }
});

// Get all events for a specific user (with optional date filtering)
router.get("/", async (req, res) => {
  try {
    const { userId, start, end } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing userId query parameter",
        type: "VALIDATION_ERROR",
      });
    }

    let query = { user: userId };

    // Add date filtering if provided
    if (start && end) {
      query.start = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const events = await Event.find(query).sort({ start: 1 });
    console.log(`📋 Retrieved ${events.length} events for user ${userId}`);

    res.status(200).json(events);
  } catch (error) {
    console.error("❌ Error retrieving events:", error);
    res.status(500).json({
      error: "Failed to retrieve events",
      type: "DATABASE_ERROR",
      details: error.message,
    });
  }
});

// Update an event by ID with recurrence and cascading support
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the existing event
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        error: "Event not found",
        type: "EVENT_NOT_FOUND",
      });
    }

    console.log(`\n📝 Updating event: ${existingEvent.title}`);

    // Check if recurrence is being added to the event
    const isAddingRecurrence =
      updateData.recurrence && updateData.recurrence.enabled;

    if (isAddingRecurrence) {
      console.log(
        `🔄 Converting to recurring event with ${updateData.recurrence.count} instances`
      );

      // Handle conversion to recurring event
      const userDoc = await User.findById(existingEvent.user);
      if (!userDoc || !userDoc.settings) {
        return res.status(400).json({
          error: "User settings not found",
          type: "USER_SETTINGS_ERROR",
        });
      }

      // Create the base event data for the recurring series
      const baseEventData = {
        title: updateData.title || existingEvent.title,
        start: updateData.start
          ? new Date(updateData.start)
          : existingEvent.start,
        end: updateData.end ? new Date(updateData.end) : existingEvent.end,
        type: updateData.type || existingEvent.type,
        description: updateData.description || existingEvent.description,
        user: existingEvent.user,
        duration: updateData.duration || existingEvent.duration,
      };

      // Generate the full recurring series using existing logic
      const eventInstances = createRecurringEvents(
        baseEventData,
        updateData.recurrence
      );

      // Get other events for scheduling (excluding the current event being updated)
      const otherEvents = await Event.find({
        user: existingEvent.user,
        _id: { $ne: id },
      });

      try {
        const createdEvents = [];
        const allMovedEvents = [];

        // Process each instance
        for (let i = 0; i < eventInstances.length; i++) {
          const instance = eventInstances[i];

          if (i === 0) {
            // First instance: Update the original event in place
            console.log(
              `📝 Updating original event (instance 1/${eventInstances.length})`
            );

            const updatedOriginal = await Event.findByIdAndUpdate(
              id,
              {
                ...existingEvent,
                updated: new Date(),
              },
              { new: true, runValidators: true }
            );

            createdEvents.push(updatedOriginal);
          } else {
            // Additional instances: Create new events with scheduling
            console.log(
              `🧠 Scheduling instance ${i + 1}/${eventInstances.length}`
            );

            const currentExistingEvents = [
              ...otherEvents,
              ...createdEvents,
              ...allMovedEvents,
            ];

            const schedulingResult = await schedulingService.scheduleEvent(
              instance,
              currentExistingEvents,
              userDoc.settings
            );

            if (schedulingResult.scheduledEvent) {
              // Save the new event to database
              const newEvent = new Event(schedulingResult.scheduledEvent);
              const savedEvent = await newEvent.save();
              createdEvents.push(savedEvent);
            }

            if (
              schedulingResult.movedEvents &&
              schedulingResult.movedEvents.length > 0
            ) {
              console.log(
                `📋 Instance ${i + 1} caused ${
                  schedulingResult.movedEvents.length
                } events to be moved`
              );
              allMovedEvents.push(...schedulingResult.movedEvents);
            }
          }
        }

        // Update any moved events in database
        if (allMovedEvents.length > 0) {
          console.log(
            `🔄 Updating ${allMovedEvents.length} moved events in database`
          );
          await updateMovedEventsInDatabase(allMovedEvents);
        }

        console.log(
          `✅ Successfully created ${createdEvents.length} recurring events`
        );

        const response = {
          success: true,
          events: createdEvents,
          movedEvents: allMovedEvents,
          message: `Converted to recurring event with ${createdEvents.length} instances`,
        };

        if (allMovedEvents.length > 0) {
          response.message += `, moved ${allMovedEvents.length} existing events`;
        }

        res.status(200).json(response);
      } catch (schedulingError) {
        console.error(
          `❌ Recurring conversion failed:`,
          schedulingError.message
        );
        return res.status(409).json({
          error: `Cannot convert to recurring event: ${schedulingError.message}`,
          type: "RECURRING_CONVERSION_CONFLICT",
          suggestion: "Try different timing or check for conflicts",
        });
      }
    } else {
      // Regular update (existing logic for non-recurring updates)
      console.log(`📝 Regular update (no recurrence changes)`);

      // Check if this is a timing-related update that requires rescheduling
      const isTimingUpdate =
        updateData.start ||
        updateData.end ||
        updateData.type ||
        updateData.duration;

      if (isTimingUpdate) {
        console.log(`🧠 Timing update detected, running cascading algorithm`);

        // Fetch user settings and other events for rescheduling
        const userDoc = await User.findById(existingEvent.user);
        if (!userDoc || !userDoc.settings) {
          return res.status(400).json({
            error: "User settings not found",
            type: "USER_SETTINGS_ERROR",
          });
        }

        // Get other events (excluding the one being updated)
        const otherEvents = await Event.find({
          user: existingEvent.user,
          _id: { $ne: id },
        });

        // Prepare updated event data
        const updatedEventData = {
          ...existingEvent.toObject(),
          ...updateData,
          start: updateData.start
            ? new Date(updateData.start)
            : existingEvent.start,
          end: updateData.end ? new Date(updateData.end) : existingEvent.end,
          // Recalculate duration if timing changed
          duration:
            updateData.start || updateData.end
              ? Math.floor(
                  (new Date(updateData.end || existingEvent.end) -
                    new Date(updateData.start || existingEvent.start)) /
                    1000
                )
              : updateData.duration || existingEvent.duration,
        };

        try {
          // Use enhanced scheduling service for the update
          const schedulingResult = await schedulingService.scheduleEvent(
            updatedEventData,
            otherEvents,
            userDoc.settings
          );

          // Database transaction: Update main event and moved events
          try {
            // Update moved events first
            if (
              schedulingResult.movedEvents &&
              schedulingResult.movedEvents.length > 0
            ) {
              console.log(
                `🔄 Updating ${schedulingResult.movedEvents.length} moved events`
              );
              await updateMovedEventsInDatabase(schedulingResult.movedEvents);
            }

            // Update the main event
            const updatedEvent = await Event.findByIdAndUpdate(
              id,
              schedulingResult.scheduledEvent,
              {
                new: true,
                runValidators: true,
              }
            );

            console.log(`✅ Event updated with cascading support`);

            const response = {
              success: true,
              events: [updatedEvent],
              movedEvents: schedulingResult.movedEvents || [],
              message: "Event updated successfully",
            };

            if (
              schedulingResult.movedEvents &&
              schedulingResult.movedEvents.length > 0
            ) {
              response.message += `, moved ${schedulingResult.movedEvents.length} other events`;
            }

            res.status(200).json(response);
          } catch (dbError) {
            console.error("❌ Database update failed:", dbError.message);
            return res.status(500).json({
              error: "Failed to update events in database",
              type: "DATABASE_ERROR",
              details: dbError.message,
            });
          }
        } catch (schedulingError) {
          console.error(
            `❌ Update scheduling failed:`,
            schedulingError.message
          );
          return res.status(409).json({
            error: `Cannot update event: ${schedulingError.message}`,
            type: "UPDATE_SCHEDULING_CONFLICT",
            suggestion: "Try different timing or check for conflicts",
          });
        }
      } else {
        // Simple update (no timing changes) - no cascading needed
        console.log(`📝 Non-timing update, direct database update`);

        const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });

        console.log(`✅ Event updated (non-timing changes)`);

        res.status(200).json({
          success: true,
          events: [updatedEvent],
          movedEvents: [],
          message: "Event updated successfully",
        });
      }
    }
  } catch (error) {
    console.error("❌ Event update error:", error);
    res.status(500).json({
      error: "Internal server error during event update",
      type: "INTERNAL_ERROR",
      details: error.message,
    });
  }
});

// Delete an event
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEvent = await Event.findByIdAndDelete(id);
    if (!deletedEvent) {
      return res.status(404).json({
        error: "Event not found",
        type: "EVENT_NOT_FOUND",
      });
    }

    console.log(`🗑️ Event deleted: ${deletedEvent.title}`);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      deletedEvent: {
        id: deletedEvent._id,
        title: deletedEvent.title,
      },
    });
  } catch (error) {
    console.error("❌ Event deletion error:", error);
    res.status(500).json({
      error: "Failed to delete event",
      type: "DATABASE_ERROR",
      details: error.message,
    });
  }
});

module.exports = router;
