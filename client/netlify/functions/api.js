const serverless = require("serverless-http");
const { connectDb } = require("../../../server/db");
const { createApp } = require("../../../server/app");

const app = createApp();
const handle = serverless(app);

function restoreApiPath(event) {
  const current = event.path || event.rawPath || "/";
  if (current.startsWith("/.netlify/functions/api")) {
    const rest = current.slice("/.netlify/functions/api".length);
    const nextPath = `/api${rest.startsWith("/") || rest === "" ? rest : `/${rest}`}` || "/api";
    event.path = nextPath;
    if (event.rawPath) event.rawPath = nextPath;
  }
  return event;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDb();
  return handle(restoreApiPath(event), context);
};
