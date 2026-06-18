// Added by Opviva — require("./opviva-sentry") at the very top of your server entry.
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "https://b5643a1bcf891396b3f379a40a9dfcda@o4510995911016448.ingest.de.sentry.io/4511585104363600", tracesSampleRate: 1.0 });
module.exports = Sentry;
