class SimpleSessionScheduler {
  static ID = 'simple-session-scheduler';
}

//////////////////////////////////////////
// Hooks                                //
//////////////////////////////////////////

Hooks.once('init', registerSettings);

Hooks.once('ready', promptNextSessionDate);

//////////////////////////////////////////
// Settings                             //
//////////////////////////////////////////

async function registerSettings() {
  game.settings.register(SimpleSessionScheduler.ID, "enable", {
    type: Boolean,
    name: game.i18n.localize("simple-session-scheduler.settings.enable.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.enable.hint"),
    scope: "world", // Scope of the setting
    config: true, // Show in settings
    default: true, // Default value
    requiresReload: true, // Reload world to apply changes
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: enable: ", value);
    }
  });

  game.settings.register(SimpleSessionScheduler.ID, "sessionFrequency", {
    name: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "weekly",
    requiresReload: true,
    choices: {
      daily: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.daily"),
      weekly: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.weekly"),
      biweekly: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.biweekly"),
      monthly: game.i18n.localize("simple-session-scheduler.settings.sessionFrequency.monthly"),
    },
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: sessionFrequency: ", value);
    }
  });

  game.settings.register(SimpleSessionScheduler.ID, "announceType", {
    type: String,
    name: game.i18n.localize("simple-session-scheduler.settings.announceType.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.announceType.hint"),
    scope: "world",
    config: true,
    default: "whisperGMs",
    choices: {
      none: game.i18n.localize("simple-session-scheduler.settings.announceType.none"),
      public: game.i18n.localize("simple-session-scheduler.settings.announceType.public"),
      whisperGMs: game.i18n.localize("simple-session-scheduler.settings.announceType.whisperGMs"),
      whisperCurrentUser: game.i18n.localize("simple-session-scheduler.settings.announceType.whisperCurrentUser"),
    },
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: announceType: ", value);
    }
  });

  game.settings.register(SimpleSessionScheduler.ID, "silentMode", {
    type: Boolean,
    name: game.i18n.localize("simple-session-scheduler.settings.silentMode.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.silentMode.hint"),
    scope: "world",
    config: true,
    default: false,
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: silentMode: ", value);
    }
  });

  game.settings.register(SimpleSessionScheduler.ID, "sessionReminder", {
    type: String,
    name: game.i18n.localize("simple-session-scheduler.settings.sessionReminder.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.sessionReminder.hint"),
    scope: "user",
    config: true,
    default: "whisper",
    choices: {
      prompt: game.i18n.localize("simple-session-scheduler.settings.sessionReminder.prompt"),
      whisper: game.i18n.localize("simple-session-scheduler.settings.sessionReminder.whisper"),
      none: game.i18n.localize("simple-session-scheduler.settings.sessionReminder.none"),
    },
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: sessionReminder: ", value);
    }
  });

  game.settings.register(SimpleSessionScheduler.ID, "dateSettings", {
    type: String,
    name: game.i18n.localize("simple-session-scheduler.settings.dateSettings.name"),
    hint: game.i18n.localize("simple-session-scheduler.settings.dateSettings.hint"),
    scope: "user",
    config: true, // Show in settings
    choices: {
      "long": game.i18n.localize("simple-session-scheduler.settings.dateSettings.long"),
      "numeric": game.i18n.localize("simple-session-scheduler.settings.dateSettings.numeric")
    },
    default: "long", // Default value
    onChange: value => {
      console.log("simple-session-scheduler | Setting changed: dateSettings: ", value);
    }
  });

}
//////////////////////////////////////////
// Prompt and Set                       //
//////////////////////////////////////////

async function promptNextSessionDate() {
  if (!game.settings.get(SimpleSessionScheduler.ID, "enable")) {
    // If the module is disabled, do not proceed
    return;
  }

  console.log("simple-session-scheduler | Old session date: " + game.world.nextSession);
  const nextSessionDate = new Date(game.world.nextSession);
  const futureNextSessionDate = nextFutureOccurrence(game.world.nextSession);

  if (nextSessionDate.getTime() == futureNextSessionDate.getTime()) {
    // If the next session date is already set to the future date, no need to update, but do the dialog or whisper depending on settings
    console.log("simple-session-scheduler | Next session date is already set to the future date, no need to update.");
    if (game.settings.get(SimpleSessionScheduler.ID, "sessionReminder") === "whisper") {
      // Whisper the user
      const message = game.i18n.format("simple-session-scheduler.announcement.sessionDate", { date: futureNextSessionDate.toLocaleString(undefined, getDateFormat()) });
      ChatMessage.create({
        content: message,
        whisper: [game.user.id],
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("simple-session-scheduler.announcement.speaker") })
      });
      return
    } else if (game.settings.get(SimpleSessionScheduler.ID, "sessionReminder") === "prompt") {
      // Show a dialog
      const sessionDatePrompt = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.localize("simple-session-scheduler.dialogs.sessionDate.title"),
        },
        content: game.i18n.localize("simple-session-scheduler.dialogs.sessionDate.content"),
      });
      return;
    }
  }

  if (!game.user.isGM) {
    // If the user is not a GM, do not proceed, they should not be able to set the next session date. show them a prompt or whisper that the session has passed and they should notify the GM
    if (game.settings.get(SimpleSessionScheduler.ID, "sessionReminder") === "whisper") {
      // Whisper the user
      const message = game.i18n.format("simple-session-scheduler.announcement.sessionDatePassed", { date: nextSessionDate.toLocaleString() });
      ChatMessage.create({
        content: message,
        whisper: [game.user.id]
      });
    } else if (game.settings.get(SimpleSessionScheduler.ID, "sessionReminder") === "prompt") {
      // Show a dialog
      const sessionDatePrompt = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.localize("simple-session-scheduler.dialogs.sessionDatePassed.title", {
            date: nextSessionDate.toLocaleString()
          }),
        },
        content: game.i18n.localize("simple-session-scheduler.dialogs.sessionDatePassed.content", {
          date: nextSessionDate.toLocaleString()
        }),
      });
    }
    return;
  }


  if (game.settings.get(SimpleSessionScheduler.ID, "silentMode")) {
    console.log("simple-session-scheduler | Silent mode is enabled, skipping prompt.");
    await updateNextSessionDate(futureNextSessionDate.toISOString());
    sendNextSessionAnnouncement();
    console.log("simple-session-scheduler | Next session date updated silently to:", futureNextSessionDate);
    return;
  }

  if (nextSessionDate.getTime() == futureNextSessionDate.getTime()) {
    const sessionDatePrompt = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.localize("simple-session-scheduler.dialogs.sessionDate.title"),
      },
      content: game.i18n.localize("simple-session-scheduler.dialogs.sessionDate.content"),
    });
    return;
  }

  let messageContent = game.i18n.format("simple-session-scheduler.dialogs.reschedule.lastSession") + "<ul><li>" +
    nextSessionDate.toLocaleString() + "</li></ul>" +
    game.i18n.format("simple-session-scheduler.dialogs.reschedule.futureSession") +
    "<ul><li>" + futureNextSessionDate.toLocaleString() + "</li></ul>" +
    game.i18n.localize("simple-session-scheduler.dialogs.reschedule.confirm");

  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize("simple-session-scheduler.dialogs.reschedule.title")
    },
    content: messageContent,
    rejectClose: false,
    modal: true
  });
  if (proceed) {
    console.log("Proceed.");
    await updateNextSessionDate(futureNextSessionDate.toISOString());
    sendNextSessionAnnouncement();
    console.log("simple-session-scheduler | Next session date:", nextSessionDate);
  }
  else console.log("Do not proceed.");
}


function nextFutureOccurrence(isoString) {
  const original = new Date(isoString);
  const now = new Date();

  const frequency = game.settings.get(SimpleSessionScheduler.ID, "sessionFrequency");

  // Copy original and set to this session's occurrence
  let next = new Date(original);

  // If the next occurrence is in the past, keep adding the appropriate interval until it's in the future
  switch (frequency) {
    case "daily":
      while (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case "weekly":
      while (next <= now) {
        next.setDate(next.getDate() + 7);
      }
      break;
    case "biweekly":
      while (next <= now) {
        next.setDate(next.getDate() + 14);
      }
      break;
    case "monthly":
      while (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }
  return next;
}

async function updateNextSessionDate(date) {
  const worldData = {
    action: "editWorld",
    id: game.world.id,
    nextSession: date,
  };
  await foundry.utils.fetchJsonWithTimeout(foundry.utils.getRoute("setup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(worldData),
  });
  game.world.updateSource(worldData);
  console.log("simple-session-scheduler | Updated next session date to:", date);
}

async function sendNextSessionAnnouncement() {
  if (!game.settings.get(SimpleSessionScheduler.ID, "enable")) {
    return;
  }

  const announceType = game.settings.get(SimpleSessionScheduler.ID, "announceType");
  const nextSessionDate = new Date(game.world.nextSession);
  var messageContent = "";

  if (game.settings.get(SimpleSessionScheduler.ID, "silentMode")) {
    messageContent = game.i18n.format("simple-session-scheduler.announcement.silentMessage", {
      date: nextSessionDate.toLocaleString()
    });
  } else {
    messageContent = game.i18n.format("simple-session-scheduler.announcement.message", {
      date: nextSessionDate.toLocaleString(),
    });
  }

  switch (announceType) {
    case "public":
      ChatMessage.create({
        content: messageContent,
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("simple-session-scheduler.announcement.speaker") })
      });
      break;
    case "whisperGMs":
      const gmUsers = game.users.filter(user => user.isGM);
      ChatMessage.create({
        content: messageContent,
        whisper: gmUsers.map(user => user.id),
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("simple-session-scheduler.announcement.speaker") })
      });
      break;
    case "whisperCurrentUser":
      const currentUser = game.user;
      ChatMessage.create({
        content: messageContent,
        whisper: [currentUser.id],
        speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("simple-session-scheduler.announcement.speaker") })
      });
      break;
    case "none":
      // No announcement
      break;
  }
}

function getDateFormat() {
  const dateSetting = game.settings.get(SimpleSessionScheduler.ID, "dateSettings");
  if (dateSetting === "long") {
    return { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  } else if (dateSetting === "numeric") {
    return { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
  }
  return {};
}
