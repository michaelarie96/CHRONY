const moment = require("moment");

class SchedulingService {
  constructor() {
    this.SLOT_DURATION_MINUTES = 15; // Check every 15 minutes
    this.MAX_CASCADE_DEPTH = 3; // Maximum recursion depth for cascading
  }

  /**
   * Main entry point for scheduling events using Forward Checking with Backtracking
   * Now enhanced with Smart Cascading Conflict Resolution
   * @param {Object} event - Event to schedule
   * @param {Array} existingEvents - User's existing events
   * @param {Object} userSettings - User's scheduling constraints
   * @returns {Object} - Result with scheduled event and any moved events
   */
  async scheduleEvent(event, existingEvents, userSettings) {
    console.log(`\n🧠 SCHEDULING: ${event.title} (${event.type})`);

    // Validate user settings first
    this.validateUserSettings(userSettings);

    try {
      // Use the new cascading placement algorithm
      const result = await this.placeEventWithCascading(
        event,
        existingEvents,
        userSettings,
        0
      );

      if (result.success) {
        console.log(`✅ Event scheduled successfully with cascading`);
        if (result.movedEvents.length > 0) {
          console.log(
            `📋 Moved events: ${result.movedEvents
              .map((e) => e.title)
              .join(", ")}`
          );
        }
        return {
          scheduledEvent: result.scheduledEvent,
          movedEvents: result.movedEvents,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`❌ Scheduling failed for ${event.title}:`, error.message);
      throw error;
    }
  }

  /**
   * Core cascading algorithm - places an event and handles conflicts recursively
   * @param {Object} event - Event to place
   * @param {Array} existingEvents - Current events (excluding those being moved)
   * @param {Object} userSettings - User constraints
   * @param {number} depth - Current recursion depth
   * @returns {Object} - { success: boolean, scheduledEvent: Object, movedEvents: Array, error: string }
   */
  async placeEventWithCascading(
    event,
    existingEvents,
    userSettings,
    depth = 0
  ) {
    console.log(
      `${"  ".repeat(depth)}🎯 Placing ${event.type} event: ${
        event.title
      } (depth ${depth})`
    );

    // Prevent infinite recursion
    if (depth > this.MAX_CASCADE_DEPTH) {
      return {
        success: false,
        error: `Maximum cascade depth (${this.MAX_CASCADE_DEPTH}) exceeded`,
        movedEvents: [],
      };
    }

    // Route to type-specific placement logic
    switch (event.type) {
      case "fixed":
        return this.placeFixedEventWithCascading(
          event,
          existingEvents,
          userSettings,
          depth
        );

      case "flexible":
        return this.placeFlexibleEventWithCascading(
          event,
          existingEvents,
          userSettings,
          depth
        );

      case "fluid":
        return this.placeFluidEventWithCascading(
          event,
          existingEvents,
          userSettings,
          depth
        );

      default:
        return {
          success: false,
          error: `Unknown event type: ${event.type}`,
          movedEvents: [],
        };
    }
  }

  /**
   * Place a fixed event - highest priority, others must move for it
   */
  async placeFixedEventWithCascading(
    event,
    existingEvents,
    userSettings,
    depth
  ) {
    // Check basic constraints first (rest day, active hours)
    const constraintCheck = this.checkBasicConstraints(event, userSettings);
    if (!constraintCheck.valid) {
      return {
        success: false,
        error: constraintCheck.error,
        movedEvents: [],
      };
    }

    // Find conflicts
    const conflicts = this.findConflicts(event, existingEvents);

    if (conflicts.length === 0) {
      // No conflicts - easy placement
      return {
        success: true,
        scheduledEvent: event,
        movedEvents: [],
      };
    }

    // Check if any conflicts are fixed events (cannot move them)
    const fixedConflicts = conflicts.filter((c) => c.type === "fixed");
    if (fixedConflicts.length > 0) {
      return {
        success: false,
        error: `Fixed event conflicts with other fixed events: ${fixedConflicts
          .map((c) => c.title)
          .join(", ")}`,
        movedEvents: [],
      };
    }

    // Try to move all conflicting events (flexible and fluid)
    return this.resolveConflictsByCascading(
      event,
      conflicts,
      existingEvents,
      userSettings,
      depth
    );
  }

  /**
   * Place a flexible event - can move within same day, may need to move fluid events
   */
  async placeFlexibleEventWithCascading(
    event,
    existingEvents,
    userSettings,
    depth
  ) {
    const targetDate = moment(event.start).format("YYYY-MM-DD");
    const durationMinutes = event.duration
      ? Math.floor(event.duration / 60)
      : Math.floor((new Date(event.end) - new Date(event.start)) / (1000 * 60));

    // Check basic constraints
    const constraintCheck = this.checkBasicConstraints(event, userSettings);
    if (!constraintCheck.valid) {
      return {
        success: false,
        error: constraintCheck.error,
        movedEvents: [],
      };
    }

    // Try direct placement first
    const directPlacement = this.tryDirectFlexiblePlacement(
      event,
      existingEvents,
      userSettings,
      targetDate,
      durationMinutes
    );
    if (directPlacement.success) {
      return {
        success: true,
        scheduledEvent: directPlacement.scheduledEvent,
        movedEvents: [],
      };
    }

    // Direct placement failed - need to create space by moving fluid events
    console.log(
      `${"  ".repeat(
        depth
      )}⚡ Direct placement failed, analyzing gaps and fluid events`
    );

    return this.createSpaceForFlexibleEvent(
      event,
      existingEvents,
      userSettings,
      targetDate,
      durationMinutes,
      depth
    );
  }

  /**
   * Place a fluid event - lowest priority, try to find any available slot in week
   */
  async placeFluidEventWithCascading(
    event,
    existingEvents,
    userSettings,
    depth
  ) {
    const durationMinutes = event.duration
      ? Math.floor(event.duration / 60)
      : Math.floor((new Date(event.end) - new Date(event.start)) / (1000 * 60));
    const weekStart = moment(event.start).startOf("week");

    console.log(
      `${"  ".repeat(
        depth
      )}🌊 Finding ${durationMinutes}min slot anywhere this week`
    );

    // Get working days (excluding rest day)
    const workingDays = this.getWorkingDays(weekStart, userSettings.restDay);

    // Try each day until we find a solution
    for (const day of workingDays) {
      const timeSlots = this.generateDayTimeSlots(
        day.format("YYYY-MM-DD"),
        userSettings
      );
      const validSlots = this.forwardCheck(
        timeSlots,
        durationMinutes,
        existingEvents,
        userSettings,
        event
      );

      if (validSlots.length > 0) {
        const bestSlot = validSlots[0];
        const scheduledEvent = {
          ...event,
          start: bestSlot.start.toDate(),
          end: bestSlot.end.toDate(),
          duration: durationMinutes * 60,
        };

        console.log(
          `${"  ".repeat(depth)}✅ Fluid event placed: ${day.format(
            "dddd"
          )} ${bestSlot.start.format("HH:mm")}`
        );
        return {
          success: true,
          scheduledEvent: scheduledEvent,
          movedEvents: [],
        };
      }
    }

    // No available slots in the week
    return {
      success: false,
      error: `No available ${durationMinutes}-minute slots in the working week`,
      movedEvents: [],
    };
  }

  /**
   * Try to resolve conflicts by moving conflicting events recursively
   */
  async resolveConflictsByCascading(
    targetEvent,
    conflicts,
    existingEvents,
    userSettings,
    depth
  ) {
    console.log(
      `${"  ".repeat(depth)}🔄 Resolving ${
        conflicts.length
      } conflicts through cascading`
    );

    // Separate conflicts by type and process in priority order (fluid first, then flexible)
    const fluidConflicts = conflicts.filter((c) => c.type === "fluid");
    const flexibleConflicts = conflicts.filter((c) => c.type === "flexible");

    console.log(
      `${"  ".repeat(depth)}📋 Fluid conflicts: ${fluidConflicts
        .map((e) => e.title)
        .join(", ")}`
    );
    console.log(
      `${"  ".repeat(depth)}📋 Flexible conflicts: ${flexibleConflicts
        .map((e) => e.title)
        .join(", ")}`
    );

    const allMovedEvents = [];
    let currentExistingEvents = [...existingEvents];

    // Create a "forbidden zone" - the target event's time slot
    const forbiddenZone = {
      start: targetEvent.start,
      end: targetEvent.end,
    };

    // Process fluid conflicts first
    for (const fluidEvent of fluidConflicts) {
      console.log(`${"  ".repeat(depth)}🔄 Processing fluid event:`, {
        title: fluidEvent.title,
        type: fluidEvent.type,
        id: fluidEvent._id || fluidEvent.id,
      });

      currentExistingEvents = currentExistingEvents.filter(
        (e) =>
          e._id?.toString() !== fluidEvent._id?.toString() &&
          e.id !== fluidEvent.id
      );

      // Create the event object more carefully
      const eventToMove = {
        _id: fluidEvent._id,
        id: fluidEvent.id,
        title: fluidEvent.title,
        type: fluidEvent.type,
        start: fluidEvent.start,
        end: fluidEvent.end,
        duration: fluidEvent.duration,
        description: fluidEvent.description,
        user: fluidEvent.user,
        forbiddenZone: forbiddenZone,
      };

      console.log(
        `${"  ".repeat(depth)}📤 Sending to placeEventWithCascading:`,
        {
          title: eventToMove.title,
          type: eventToMove.type,
          hasForbiddenZone: !!eventToMove.forbiddenZone,
        }
      );

      const moveResult = await this.placeEventWithCascading(
        eventToMove,
        [...currentExistingEvents, ...allMovedEvents],
        userSettings,
        depth + 1
      );

      if (!moveResult.success) {
        return {
          success: false,
          error: `Cannot move fluid event "${fluidEvent.title}": ${moveResult.error}`,
          movedEvents: [],
        };
      }

      allMovedEvents.push(moveResult.scheduledEvent);
      allMovedEvents.push(...moveResult.movedEvents);
    }

    // Process flexible conflicts (same pattern)
    for (const flexibleEvent of flexibleConflicts) {
      console.log(`${"  ".repeat(depth)}🔄 Processing flexible event:`, {
        title: flexibleEvent.title,
        type: flexibleEvent.type,
        id: flexibleEvent._id || flexibleEvent.id,
      });

      currentExistingEvents = currentExistingEvents.filter(
        (e) =>
          e._id?.toString() !== flexibleEvent._id?.toString() &&
          e.id !== flexibleEvent.id
      );

      // Create the event object more carefully
      const eventToMove = {
        _id: flexibleEvent._id,
        id: flexibleEvent.id,
        title: flexibleEvent.title,
        type: flexibleEvent.type,
        start: flexibleEvent.start,
        end: flexibleEvent.end,
        duration: flexibleEvent.duration,
        description: flexibleEvent.description,
        user: flexibleEvent.user,
        forbiddenZone: forbiddenZone,
      };

      console.log(
        `${"  ".repeat(depth)}📤 Sending to placeEventWithCascading:`,
        {
          title: eventToMove.title,
          type: eventToMove.type,
          hasForbiddenZone: !!eventToMove.forbiddenZone,
        }
      );

      const moveResult = await this.placeEventWithCascading(
        eventToMove,
        [...currentExistingEvents, ...allMovedEvents],
        userSettings,
        depth + 1
      );

      if (!moveResult.success) {
        return {
          success: false,
          error: `Cannot move flexible event "${flexibleEvent.title}": ${moveResult.error}`,
          movedEvents: [],
        };
      }

      allMovedEvents.push(moveResult.scheduledEvent);
      allMovedEvents.push(...moveResult.movedEvents);
    }

    console.log(
      `${"  ".repeat(depth)}✅ All conflicts resolved, placing target event`
    );
    return {
      success: true,
      scheduledEvent: targetEvent,
      movedEvents: allMovedEvents,
    };
  }

  /**
   * Check basic constraints (rest day, active hours) without considering conflicts
   */
  checkBasicConstraints(event, userSettings) {
    // Check if event is on rest day
    const eventDay = moment(event.start).day(); // 0 = Sunday, 6 = Saturday
    const restDayNumber = userSettings.restDay === "sunday" ? 0 : 6;

    if (eventDay === restDayNumber) {
      return {
        valid: false,
        error: `Cannot schedule on ${userSettings.restDay} (your rest day)`,
      };
    }

    // Check if event fits within active hours
    if (!this.isWithinActiveHours(event.start, event.end, userSettings)) {
      const startTime = moment(event.start).format("HH:mm");
      const endTime = moment(event.end).format("HH:mm");
      return {
        valid: false,
        error: `Event ${startTime}-${endTime} is outside active hours ${userSettings.activeStartTime}-${userSettings.activeEndTime}`,
      };
    }

    return { valid: true };
  }

  /**
   * Try to place flexible event directly without moving other events
   */
  tryDirectFlexiblePlacement(
    event,
    existingEvents,
    userSettings,
    targetDate,
    durationMinutes
  ) {
    console.log(
      `🔍 Trying direct placement for ${durationMinutes}min on ${targetDate}`
    );

    const timeSlots = this.generateDayTimeSlots(targetDate, userSettings);
    const validSlots = this.forwardCheck(
      timeSlots,
      durationMinutes,
      existingEvents,
      userSettings,
      event
    );

    if (validSlots.length > 0) {
      const bestSlot = validSlots[0];
      const scheduledEvent = {
        ...event,
        start: bestSlot.start.toDate(),
        end: bestSlot.end.toDate(),
        duration: durationMinutes * 60,
      };

      console.log(
        `✅ Direct placement successful: ${bestSlot.start.format(
          "HH:mm"
        )} - ${bestSlot.end.format("HH:mm")}`
      );
      return { success: true, scheduledEvent };
    }

    return { success: false };
  }

  /**
   * Create space for flexible event by trying strategies in order of simplicity
   * Optimized approach: try-as-you-find instead of building large arrays
   */
  async createSpaceForFlexibleEvent(
    event,
    existingEvents,
    userSettings,
    targetDate,
    durationMinutes,
    depth
  ) {
    console.log(
      `${"  ".repeat(
        depth
      )}🧮 Creating ${durationMinutes}min space on ${targetDate} (optimized approach)`
    );

    // Get all events on the target date, sorted by start time
    const dayEvents = existingEvents
      .filter((e) => moment(e.start).format("YYYY-MM-DD") === targetDate)
      .sort((a, b) => moment(a.start).diff(moment(b.start)));

    const fluidEvents = dayEvents.filter((e) => e.type === "fluid");

    if (fluidEvents.length === 0) {
      return {
        success: false,
        error: `No fluid events to move on ${targetDate}`,
        movedEvents: [],
      };
    }

    console.log(
      `${"  ".repeat(depth)}📊 Found ${
        fluidEvents.length
      } fluid events to analyze`
    );

    // Strategy 1: Try direct replacement (fluid event alone has enough duration)
    console.log(`${"  ".repeat(depth)}🎯 Strategy 1: Direct replacement`);
    const directReplacementResult = await this.tryDirectReplacement(
      event,
      fluidEvents,
      existingEvents,
      userSettings,
      targetDate,
      durationMinutes,
      depth
    );

    if (directReplacementResult.success) {
      return directReplacementResult;
    }

    // Strategy 2: Try gap + fluid event combinations
    console.log(
      `${"  ".repeat(depth)}🎯 Strategy 2: Gap + fluid event combinations`
    );
    const gapCombinationResult = await this.tryGapCombinations(
      event,
      dayEvents,
      fluidEvents,
      existingEvents,
      userSettings,
      targetDate,
      durationMinutes,
      depth
    );

    if (gapCombinationResult.success) {
      return gapCombinationResult;
    }

    // Strategy 3: Try multiple adjacent fluid events
    console.log(`${"  ".repeat(depth)}🎯 Strategy 3: Adjacent fluid events`);
    const adjacentEventsResult = await this.tryAdjacentFluidEvents(
      event,
      fluidEvents,
      existingEvents,
      userSettings,
      targetDate,
      durationMinutes,
      depth
    );

    if (adjacentEventsResult.success) {
      return adjacentEventsResult;
    }

    // All strategies failed
    return {
      success: false,
      error: `Could not create ${durationMinutes}min space on ${targetDate} using any strategy`,
      movedEvents: [],
    };
  }

  /**
   * Strategy 1: Try direct replacement (prioritized by duration - shortest first)
   */
  async tryDirectReplacement(
    event,
    fluidEvents,
    existingEvents,
    userSettings,
    targetDate,
    durationMinutes,
    depth
  ) {
    // Filter and sort fluid events that have enough duration (shortest first)
    const viableFluidEvents = fluidEvents
      .filter(
        (fluidEvent) => Math.floor(fluidEvent.duration / 60) >= durationMinutes
      )
      .sort((a, b) => a.duration - b.duration); // Shortest first (easier to move)

    console.log(
      `${"  ".repeat(depth)}  📋 Found ${
        viableFluidEvents.length
      } viable direct replacements`
    );

    for (const fluidEvent of viableFluidEvents) {
      const fluidDuration = Math.floor(fluidEvent.duration / 60);
      console.log(
        `${"  ".repeat(depth)}  🔄 Trying direct replacement: "${
          fluidEvent.title
        }" (${fluidDuration}min)`
      );

      // Try to move this fluid event
      const eventsWithoutFluid = existingEvents.filter(
        (e) =>
          e._id?.toString() !== fluidEvent._id?.toString() &&
          e.id !== fluidEvent.id
      );

      const moveResult = await this.placeEventWithCascading(
        fluidEvent,
        eventsWithoutFluid,
        userSettings,
        depth + 1
      );

      if (moveResult.success) {
        // Successfully moved fluid event - now place the flexible event in its spot
        const newExistingEvents = [
          ...eventsWithoutFluid,
          ...moveResult.movedEvents,
        ];
        if (moveResult.scheduledEvent) {
          newExistingEvents.push(moveResult.scheduledEvent);
        }

        const placementResult = this.tryDirectFlexiblePlacement(
          event,
          newExistingEvents,
          userSettings,
          targetDate,
          durationMinutes
        );

        if (placementResult.success) {
          console.log(
            `${"  ".repeat(depth)}  ✅ Direct replacement successful!`
          );
          return {
            success: true,
            scheduledEvent: placementResult.scheduledEvent,
            movedEvents: [moveResult.scheduledEvent, ...moveResult.movedEvents],
          };
        }
      }

      console.log(
        `${"  ".repeat(depth)}  ❌ Direct replacement failed for "${
          fluidEvent.title
        }"`
      );
    }

    return { success: false };
  }

  /**
   * Strategy 2: Try gap + fluid event combinations (prioritized by fluid event duration)
   */
  async tryGapCombinations(
    event,
    dayEvents,
    fluidEvents,
    existingEvents,
    userSettings,
    targetDate,
    durationMinutes,
    depth
  ) {
    // Calculate gaps only when needed (after direct replacement failed)
    const gaps = this.calculateDayGaps(targetDate, dayEvents, userSettings);
    console.log(
      `${"  ".repeat(depth)}  📏 Calculated ${
        gaps.length
      } gaps on ${targetDate}`
    );

    if (gaps.length === 0) {
      return { success: false };
    }

    // Sort fluid events by duration (shortest first - easier to move)
    const sortedFluidEvents = [...fluidEvents].sort(
      (a, b) => a.duration - b.duration
    );

    for (const fluidEvent of sortedFluidEvents) {
      const fluidDuration = Math.floor(fluidEvent.duration / 60);

      // Skip if this would be a direct replacement (already tried)
      if (fluidDuration >= durationMinutes) {
        continue;
      }

      // Find gaps that, combined with this fluid event, create enough space
      for (const gap of gaps) {
        const potentialSpace = gap.durationMinutes + fluidDuration;

        if (
          potentialSpace >= durationMinutes &&
          this.isGapAdjacentToEvent(gap, fluidEvent)
        ) {
          console.log(
            `${"  ".repeat(depth)}  🔄 Trying gap combination: ${
              gap.durationMinutes
            }min gap + "${fluidEvent.title}" (${fluidDuration}min)`
          );

          // Try to move this fluid event
          const eventsWithoutFluid = existingEvents.filter(
            (e) =>
              e._id?.toString() !== fluidEvent._id?.toString() &&
              e.id !== fluidEvent.id
          );

          // Forbidden zone = the gap itself (where the flexible event will be placed)
          const forbiddenZone = {
            start: gap.start,
            end: gap.end,
          };

          // Create event object explicitly
          const eventToMove = {
            _id: fluidEvent._id,
            id: fluidEvent.id,
            title: fluidEvent.title,
            type: fluidEvent.type,
            start: fluidEvent.start,
            end: fluidEvent.end,
            duration: fluidEvent.duration,
            description: fluidEvent.description,
            user: fluidEvent.user,
            forbiddenZone: forbiddenZone,
          };

          const moveResult = await this.placeEventWithCascading(
            eventToMove,
            eventsWithoutFluid,
            userSettings,
            depth + 1
          );

          if (moveResult.success) {
            // Successfully moved fluid event - now place the flexible event
            const newExistingEvents = [
              ...eventsWithoutFluid,
              ...moveResult.movedEvents,
            ];
            if (moveResult.scheduledEvent) {
              newExistingEvents.push(moveResult.scheduledEvent);
            }

            const placementResult = this.tryDirectFlexiblePlacement(
              event,
              newExistingEvents,
              userSettings,
              targetDate,
              durationMinutes
            );

            if (placementResult.success) {
              console.log(
                `${"  ".repeat(depth)}  ✅ Gap combination successful!`
              );
              return {
                success: true,
                scheduledEvent: placementResult.scheduledEvent,
                movedEvents: [
                  moveResult.scheduledEvent,
                  ...moveResult.movedEvents,
                ],
              };
            }
          }

          console.log(
            `${"  ".repeat(depth)}  ❌ Gap combination failed for "${
              fluidEvent.title
            }"`
          );
        }
      }
    }

    return { success: false };
  }

  /**
   * Strategy 3: Try multiple adjacent fluid events (prioritized by total duration)
   */
  async tryAdjacentFluidEvents(
    event,
    fluidEvents,
    existingEvents,
    userSettings,
    targetDate,
    durationMinutes,
    depth
  ) {
    const adjacentPairs = [];

    // Find all adjacent pairs and sort by total duration (shortest first)
    for (let i = 0; i < fluidEvents.length - 1; i++) {
      for (let j = i + 1; j < fluidEvents.length; j++) {
        const event1 = fluidEvents[i];
        const event2 = fluidEvents[j];
        const event1Duration = Math.floor(event1.duration / 60);
        const event2Duration = Math.floor(event2.duration / 60);

        // Skip if either event would be a direct replacement (already tried)
        if (
          event1Duration >= durationMinutes ||
          event2Duration >= durationMinutes
        ) {
          continue;
        }

        if (this.areEventsAdjacent(event1, event2)) {
          const totalDuration = event1Duration + event2Duration;

          if (totalDuration >= durationMinutes) {
            adjacentPairs.push({
              events: [event1, event2],
              totalDuration: totalDuration,
            });
          }
        }
      }
    }

    // Sort by total duration (shortest first - easier to move)
    adjacentPairs.sort((a, b) => a.totalDuration - b.totalDuration);

    console.log(
      `${"  ".repeat(depth)}  📋 Found ${
        adjacentPairs.length
      } adjacent pairs to try`
    );

    for (const pair of adjacentPairs) {
      const [event1, event2] = pair.events;
      console.log(
        `${"  ".repeat(depth)}  🔄 Trying adjacent pair: "${event1.title}" + "${
          event2.title
        }" (${pair.totalDuration}min)`
      );

      // Create a forbidden zone for event2 - should be on the original time of event1
      const forbiddenZone = {
        start: event1.start,
        end: event1.end,
      };

      let currentEventsForPair = [...existingEvents];
      const allMovedEvents = [];

      currentEventsForPair = currentEventsForPair.filter(
        (e) =>
          e._id?.toString() !== event1._id?.toString() && e.id !== event1.id
      );

      // Try to move first event
      const move1Result = await this.placeEventWithCascading(
        event1,
        [...currentEventsForPair, ...allMovedEvents],
        userSettings,
        depth + 1
      );

      if (!move1Result.success) {
        console.log(
          `${"  ".repeat(depth)}  ❌ Failed to move "${event1.title}"`
        );
        continue;
      }

      allMovedEvents.push(
        move1Result.scheduledEvent,
        ...move1Result.movedEvents
      );

      currentEventsForPair = currentEventsForPair.filter(
        (e) =>
          e._id?.toString() !== event2._id?.toString() && e.id !== event2.id
      );

      const eventToMove2 = {
        _id: event2._id,
        id: event2.id,
        title: event2.title,
        type: event2.type,
        start: event2.start,
        end: event2.end,
        duration: event2.duration,
        description: event2.description,
        user: event2.user,
        forbiddenZone: forbiddenZone,
      };

      // Try to move second event
      const move2Result = await this.placeEventWithCascading(
        eventToMove2,
        [...currentEventsForPair, ...allMovedEvents],
        userSettings,
        depth + 1
      );

      if (!move2Result.success) {
        console.log(
          `${"  ".repeat(depth)}  ❌ Failed to move "${event2.title}"`
        );
        continue;
      }

      allMovedEvents.push(
        move2Result.scheduledEvent,
        ...move2Result.movedEvents
      );

      // Try to place the flexible event
      const newExistingEvents = [...eventsWithoutPair, ...allMovedEvents];
      const placementResult = this.tryDirectFlexiblePlacement(
        event,
        newExistingEvents,
        userSettings,
        targetDate,
        durationMinutes
      );

      if (placementResult.success) {
        console.log(
          `${"  ".repeat(depth)}  ✅ Adjacent pair strategy successful!`
        );
        return {
          success: true,
          scheduledEvent: placementResult.scheduledEvent,
          movedEvents: allMovedEvents,
        };
      }

      console.log(
        `${"  ".repeat(depth)}  ❌ Adjacent pair failed for "${
          event1.title
        }" + "${event2.title}"`
      );
    }

    return { success: false };
  }

  /**
   * Check if a gap is adjacent to a fluid event (before or after)
   */
  isGapAdjacentToEvent(gap, event) {
    const eventStart = moment(event.start);
    const eventEnd = moment(event.end);

    // Gap is directly before event
    const gapBeforeEvent = gap.end.isSame(eventStart);

    // Gap is directly after event
    const gapAfterEvent = gap.start.isSame(eventEnd);

    return gapBeforeEvent || gapAfterEvent;
  }

  /**
   * Check if two events are adjacent (one ends when the other starts)
   */
  areEventsAdjacent(event1, event2) {
    const event1End = moment(event1.end);
    const event2Start = moment(event2.start);
    const event2End = moment(event2.end);
    const event1Start = moment(event1.start);

    return event1End.isSame(event2Start) || event2End.isSame(event1Start);
  }

  /**
   * Check if an event fits completely within user's active hours
   */
  isWithinActiveHours(startTime, endTime, userSettings) {
    const eventStart = moment(startTime);
    const eventEnd = moment(endTime);
    const eventDate = eventStart.format("YYYY-MM-DD");

    // Create moment objects for active hours on the same date
    const activeStart = moment(`${eventDate} ${userSettings.activeStartTime}`);
    const activeEnd = moment(`${eventDate} ${userSettings.activeEndTime}`);

    // Event must start at or after active start time
    // AND end at or before active end time
    const startsWithinHours = eventStart.isSameOrAfter(activeStart);
    const endsWithinHours = eventEnd.isSameOrBefore(activeEnd);

    return startsWithinHours && endsWithinHours;
  }

  /**
   * Generate all possible time slots for a day based on user settings
   */
  generateDayTimeSlots(dateString, userSettings) {
    const slots = [];
    const startTime = moment(`${dateString} ${userSettings.activeStartTime}`);
    const endTime = moment(`${dateString} ${userSettings.activeEndTime}`);

    let current = startTime.clone();

    // Generate slots up to (but not including) end time
    // This ensures events can't extend beyond active hours
    while (current.isBefore(endTime)) {
      slots.push(current.clone());
      current.add(this.SLOT_DURATION_MINUTES, "minutes");
    }

    return slots;
  }

  /**
   * Get working days for the week (excluding rest day)
   */
  getWorkingDays(weekStart, restDay) {
    const days = [];
    const restDayNumber = restDay === "sunday" ? 0 : 6; // Sunday = 0, Saturday = 6

    // Generate 7 days starting from week start (Sunday)
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, "days");

      // Skip rest day
      if (day.day() !== restDayNumber) {
        days.push(day);
      }
    }

    return days;
  }

  /**
   * Find conflicts between a proposed event and existing events
   */
  findConflicts(proposedEvent, existingEvents) {
    const conflicts = [];
    const proposedStart = moment(proposedEvent.start);
    const proposedEnd = moment(proposedEvent.end);

    for (const existing of existingEvents) {
      const existingStart = moment(existing.start);
      const existingEnd = moment(existing.end);

      // Check for overlap: events conflict if one starts before the other ends
      const hasOverlap =
        proposedStart.isBefore(existingEnd) &&
        proposedEnd.isAfter(existingStart);

      if (hasOverlap) {
        conflicts.push(existing);
      }
    }

    return conflicts;
  }

  /**
   * Forward Checking: Filter time slots that can accommodate the event duration
   * AND fit within active hours
   */
  forwardCheck(
    timeSlots,
    durationMinutes,
    existingEvents,
    userSettings,
    eventBeingMoved = null
  ) {
    const validSlots = [];

    for (const slot of timeSlots) {
      const proposedStart = slot;
      const proposedEnd = slot.clone().add(durationMinutes, "minutes");

      // Check active hours
      if (
        !this.isWithinActiveHours(
          proposedStart.toDate(),
          proposedEnd.toDate(),
          userSettings
        )
      ) {
        continue;
      }

      // Avoid original slot for existing events
      if (eventBeingMoved && eventBeingMoved._id) {
        const originalStart = moment(eventBeingMoved.start);
        const originalEnd = moment(eventBeingMoved.end);

        if (
          proposedStart.isBefore(originalEnd) &&
          proposedEnd.isAfter(originalStart)
        ) {
          continue;
        }
      }

      // NEW: Avoid forbidden zone (target event's time)
      if (eventBeingMoved && eventBeingMoved.forbiddenZone) {
        const forbiddenStart = moment(eventBeingMoved.forbiddenZone.start);
        const forbiddenEnd = moment(eventBeingMoved.forbiddenZone.end);

        if (
          proposedStart.isBefore(forbiddenEnd) &&
          proposedEnd.isAfter(forbiddenStart)
        ) {
          continue; // Skip this slot, it's reserved for the target event
        }
      }

      // Check conflicts with existing events
      const proposedEvent = {
        start: proposedStart.toDate(),
        end: proposedEnd.toDate(),
      };

      const conflicts = this.findConflicts(proposedEvent, existingEvents);

      if (conflicts.length === 0) {
        validSlots.push({
          start: proposedStart,
          end: proposedEnd,
        });
      }
    }

    return validSlots;
  }

  /**
   * Validate that user settings are present and valid
   */
  validateUserSettings(userSettings) {
    if (!userSettings) {
      throw new Error("User settings are required for scheduling");
    }

    const required = ["activeStartTime", "activeEndTime", "restDay"];
    for (const field of required) {
      if (!userSettings[field]) {
        throw new Error(`User setting '${field}' is required`);
      }
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(userSettings.activeStartTime) ||
      !timeRegex.test(userSettings.activeEndTime)
    ) {
      throw new Error("Invalid time format in user settings");
    }

    // Validate rest day
    if (!["saturday", "sunday"].includes(userSettings.restDay)) {
      throw new Error('Rest day must be either "saturday" or "sunday"');
    }

    return true;
  }
}

module.exports = new SchedulingService();
