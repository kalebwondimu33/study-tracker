require("dotenv").config();

const path = require("path");
const { connectDb } = require("./db");
const { createApp } = require("./app");

const app = createApp();
const PORT = process.env.PORT || 4000;
const clientDist = path.join(__dirname, "..", "client", "dist");

app.use(require("express").static(clientDist));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

async function start() {
  await connectDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study tracker running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error.message);
  process.exit(1);
});
