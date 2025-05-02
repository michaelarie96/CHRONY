const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const RecurrenceGroup = require("../models/recurrenceGroup");
const mongoose = require("mongoose");

// Create a new event (with possible recurrence)
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      title,
      start,
      end,
      type,
      description,
      user,
      isRecurring,
      frequency,
      interval,
      endsOn,
    } = req.body;

    if (!title || !start || !end || !type || !user) {
      return res
        .status(400)
        .json({
          error: "Missing required fields: title, start, end, type, or user",
        });
    }

    // Create the base event
    const eventData = {
      title,
      start: new Date(start),
      end: new Date(end),
      type,
      description: description || "",
      user,
    };

    // If this is a recurring event, create a recurrence group and instances
    if (isRecurring) {
      // Create recurrence group
      const recurrenceGroup = new RecurrenceGroup({
        frequency,
        interval,
        startsOn: new Date(start),
        endsOn: endsOn ? new Date(endsOn) : null,
        user,
      });

      await recurrenceGroup.save({ session });

      // Add recurrence info to the base event
      eventData.recurrenceGroupId = recurrenceGroup._id;
      eventData.recurrencePosition = 0; // First event in the series

      // Create the base event
      const baseEvent = new Event(eventData);
      await baseEvent.save({ session });

      // Generate recurring instances
      const instances = await generateRecurringInstances(
        recurrenceGroup, 
        baseEvent, 
        session
      );

      await session.commitTransaction();
      session.endSession();

      // Return the base event and first instance
      return res.status(201).json({
        baseEvent,
        recurrenceGroup,
        instances: [baseEvent, ...instances],
      });
    } else {
      // Non-recurring event - simply create and return it
      const event = new Event(eventData);
      await event.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json(event);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: error.message });
  }
});

// Get all events for a specific user (with date range filtering)
router.get("/", async (req, res) => {
  try {
    const { userId, start, end } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const query = { user: userId };

    // Add date range filtering if provided
    if (start && end) {
      query.$or = [
        // Events that start within the range
        { start: { $gte: new Date(start), $lte: new Date(end) } },
        // Events that end within the range
        { end: { $gte: new Date(start), $lte: new Date(end) } },
        // Events that span the entire range
        { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } },
      ];
    }

    // Fetch events with recurrence group info
    const events = await Event.find(query)
      .populate("recurrenceGroupId")
      .sort({ start: 1 });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an event with recurrence options
router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { updateType, ...updates } = req.body;

    // Find the event to be updated
    const event = await Event.findById(id).populate("recurrenceGroupId");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Handle different update types
    if (event.recurrenceGroupId) {
      switch (updateType) {
        case "this": // Update only this instance
          await handleUpdateThisInstance(event, updates, session);
          break;

        case "thisAndFuture": // Update this and all future instances
          await handleUpdateThisAndFuture(event, updates, session);
          break;

        case "all": // Update all instances
          await handleUpdateAll(event, updates, session);
          break;

        default:
          // Default to just updating this instance
          await handleUpdateThisInstance(event, updates, session);
      }
    } else {
      // Non-recurring event - simple update
      Object.assign(event, updates);
      await event.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Return the updated event
    const updatedEvent = await Event.findById(id).populate("recurrenceGroupId");
    res.status(200).json(updatedEvent);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
});

// Delete an event with recurrence options
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { deleteType } = req.query;

    // Find the event to be deleted
    const event = await Event.findById(id).populate("recurrenceGroupId");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Handle different delete types for recurring events
    if (event.recurrenceGroupId) {
      switch (deleteType) {
        case "this": // Delete only this instance
          await handleDeleteThisInstance(event, session);
          break;

        case "thisAndFuture": // Delete this and all future instances
          await handleDeleteThisAndFuture(event, session);
          break;

        case "all": // Delete all instances
          await handleDeleteAll(event, session);
          break;

        default:
          // Default to just deleting this instance
          await handleDeleteThisInstance(event, session);
      }
    } else {
      // Non-recurring event - simple delete
      await Event.findByIdAndDelete(id, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
});

// Get recurrence group and all its instances
router.get("/recurrence/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;

    const recurrenceGroup = await RecurrenceGroup.findById(groupId);

    if (!recurrenceGroup) {
      return res.status(404).json({ error: "Recurrence group not found" });
    }

    // Find all events in this recurrence group
    const events = await Event.find({ recurrenceGroupId: groupId }).sort({
      recurrencePosition: 1,
    });

    res.status(200).json({ recurrenceGroup, events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate more instances for a recurring event
router.post("/recurrence/:groupId/generate", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { groupId } = req.params;

    const recurrenceGroup = await RecurrenceGroup.findById(groupId);

    if (!recurrenceGroup) {
      return res.status(404).json({ error: "Recurrence group not found" });
    }

    // Find the base event (position 0)
    const baseEvent = await Event.findOne({
      recurrenceGroupId: groupId,
      recurrencePosition: 0,
    });

    if (!baseEvent) {
      return res.status(404).json({ error: "Base event not found" });
    }

    // Find the current highest position
    const lastEvent = await Event.findOne({ recurrenceGroupId: groupId }).sort({
      recurrencePosition: -1,
    });

    const startPosition = lastEvent.recurrencePosition + 1;

    // Generate new instances
    const newInstances = await generateRecurringInstances(
      recurrenceGroup,
      baseEvent,
      session,
      startPosition
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(newInstances);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate recurring instances
async function generateRecurringInstances(
  recurrenceGroup,
  baseEvent,
  session,
  startPosition = 1
) {
  const instances = [];
  const { frequency, interval, endsOn } = recurrenceGroup;
  const baseStart = new Date(baseEvent.start);
  const baseDuration = new Date(baseEvent.end) - baseStart;
  
  // Generate events for the next 3 months
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  let currentPosition = startPosition;
  let currentDate = new Date(baseStart);
  
  // Function to advance date based on recurrence pattern
  function advanceDate(date) {
    const newDate = new Date(date);
    
    if (frequency === 'daily') {
      newDate.setDate(newDate.getDate() + interval);
    } else if (frequency === 'weekly') {
      newDate.setDate(newDate.getDate() + (interval * 7));
    } else if (frequency === 'monthly') {
      newDate.setMonth(newDate.getMonth() + interval);
    }
    
    return newDate;
  }
  
  // Skip to the start position
  for (let i = 0; i < startPosition; i++) {
    currentDate = advanceDate(currentDate);
  }
  
  // Generate instances until we reach 3 months from now or the end date
  while (currentDate <= threeMonthsFromNow) {
    // Check if we've reached the end date
    if (endsOn && currentDate > endsOn) {
      break;
    }
    
    // Create the instance
    const instanceStart = new Date(currentDate);
    const instanceEnd = new Date(instanceStart.getTime() + baseDuration);
    
    const instance = new Event({
      title: baseEvent.title,
      type: baseEvent.type,
      start: instanceStart,
      end: instanceEnd,
      description: baseEvent.description,
      user: baseEvent.user,
      isRecurringInstance: true,
      recurrenceGroupId: recurrenceGroup._id,
      recurrencePosition: currentPosition
    });
    
    await instance.save({ session });
    instances.push(instance);
    
    // Move to next occurrence
    currentDate = advanceDate(currentDate);
    currentPosition++;
    
    // Safety limit to prevent infinite loops
    if (instances.length > 500) {
      break;
    }
  }
  
  return instances;
}

// Handler for updating only this instance
async function handleUpdateThisInstance(event, updates, session) {
  if (!event.isRecurringInstance) {
    // This is the base event, just update it
    Object.assign(event, updates);
    await event.save({ session });
    return;
  }

  // For recurring instances, mark as exception and apply updates
  event.isException = true;
  Object.assign(event, updates);
  event.modifiedProperties = Object.keys(updates);
  await event.save({ session });
}

// Handler for updating this and all future instances
async function handleUpdateThisAndFuture(event, updates, session) {
  const recurrenceGroup = event.recurrenceGroupId;

  // Create a new recurrence group for future events
  const newRecurrenceGroup = new RecurrenceGroup({
    frequency: recurrenceGroup.frequency,
    interval: recurrenceGroup.interval,
    startsOn: event.start, // Start from this event
    endsOn: recurrenceGroup.endsOn,
    user: event.user,
  });

  // Apply updates to the recurrence settings if provided
  if (updates.frequency) newRecurrenceGroup.frequency = updates.frequency;
  if (updates.interval) newRecurrenceGroup.interval = updates.interval;
  if (updates.endsOn) newRecurrenceGroup.endsOn = new Date(updates.endsOn);

  await newRecurrenceGroup.save({ session });

  // Update end date of old recurrence group
  recurrenceGroup.endsOn = new Date(event.start);
  recurrenceGroup.endsOn.setDate(recurrenceGroup.endsOn.getDate() - 1); // End before this event
  await recurrenceGroup.save({ session });

  // Delete all future instances of old pattern
  await Event.deleteMany(
    {
      recurrenceGroupId: recurrenceGroup._id,
      recurrencePosition: { $gte: event.recurrencePosition },
      _id: { $ne: event._id }, // Don't delete this event
    },
    { session }
  );

  // Update this event with the new pattern and updates
  Object.assign(event, updates);
  event.recurrenceGroupId = newRecurrenceGroup._id;
  event.recurrencePosition = 0; // This becomes the base event of the new series
  event.isException = false;
  event.modifiedProperties = {};
  await event.save({ session });

  // Generate new future instances
  await generateRecurringInstances(
    newRecurrenceGroup,
    event,
    session
  );
}

// Handler for updating all instances
async function handleUpdateAll(event, updates, session) {
  const recurrenceGroup = event.recurrenceGroupId;

  // Update recurrence group settings if provided
  if (updates.frequency) recurrenceGroup.frequency = updates.frequency;
  if (updates.interval) recurrenceGroup.interval = updates.interval;
  if (updates.endsOn) recurrenceGroup.endsOn = new Date(updates.endsOn);

  await recurrenceGroup.save({ session });

  // Find all events in this group
  const events = await Event.find(
    {
      recurrenceGroupId: recurrenceGroup._id,
    },
    null,
    { session }
  );

  // Update all events except those that are exceptions
  for (const evt of events) {
    if (!evt.isException) {
      // Only update fields that aren't time-related
      // (to preserve the individual timing of each instance)
      const fieldsToUpdate = {};
      if (updates.title) fieldsToUpdate.title = updates.title;
      if (updates.description) fieldsToUpdate.description = updates.description;
      if (updates.type) fieldsToUpdate.type = updates.type;

      Object.assign(evt, fieldsToUpdate);
      await evt.save({ session });
    }
  }
}

// Handler for deleting only this instance
async function handleDeleteThisInstance(event, session) {
  if (event.recurrencePosition === 0) {
    // This is the base event, find the next event to make it the base
    const nextEvent = await Event.findOne(
      {
        recurrenceGroupId: event.recurrenceGroupId,
        recurrencePosition: 1,
      },
      null,
      { session }
    );

    if (nextEvent) {
      // Make the next event the base event
      nextEvent.recurrencePosition = 0;
      await nextEvent.save({ session });

      // Delete the current base event
      await Event.findByIdAndDelete(event._id, { session });
    } else {
      // This is the only event in the series, delete the recurrence group too
      await RecurrenceGroup.findByIdAndDelete(event.recurrenceGroupId._id, {
        session,
      });
      await Event.findByIdAndDelete(event._id, { session });
    }
  } else {
    // For non-base instances, mark as deleted by creating a "tombstone"
    event.isException = true;
    event.modifiedProperties = ["deleted"];
    event.isDeleted = true;
    await event.save({ session });
  }
}

// Handler for deleting this and all future instances
async function handleDeleteThisAndFuture(event, session) {
  const recurrenceGroup = event.recurrenceGroupId;

  // Update the end date of the recurrence group
  recurrenceGroup.endsOn = new Date(event.start);
  recurrenceGroup.endsOn.setDate(recurrenceGroup.endsOn.getDate() - 1); // End before this event
  await recurrenceGroup.save({ session });

  // Delete all future instances including this one
  await Event.deleteMany(
    {
      recurrenceGroupId: recurrenceGroup._id,
      recurrencePosition: { $gte: event.recurrencePosition },
    },
    { session }
  );
}

// Handler for deleting all instances
async function handleDeleteAll(event, session) {
  // Delete the recurrence group
  await RecurrenceGroup.findByIdAndDelete(event.recurrenceGroupId._id, {
    session,
  });

  // Delete all events in this group
  await Event.deleteMany(
    {
      recurrenceGroupId: event.recurrenceGroupId._id,
    },
    { session }
  );
}

module.exports = router;
