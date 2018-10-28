const Arena = require('bull-arena');

const express = require('express');
const router = express.Router();

const arenaConfig = Arena({
  queues: [
    {
      // Name of the bull queue, this name must match up exactly with what you've defined in bull.
      name: "event",
      // Hostname or queue prefix, you can put whatever you want.
      hostId: "MyAwesomeQueues",
    },
  ],
});

// Make arena's resources (js/css deps) available at the base app route
router.use('/', arenaConfig);

