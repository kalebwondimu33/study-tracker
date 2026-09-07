const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true, unique: true },
    hours: { type: Number, default: 0, min: 0, max: 24 },
    learned: { type: String, default: "" },
    status: {
      type: String,
      enum: ["complete", "partial", "skipped"],
      default: "complete",
    },
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);

module.exports = mongoose.models.Entry || mongoose.model("Entry", entrySchema);
