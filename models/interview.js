const mongoose = require("mongoose");
const { Schema } = mongoose;

const interviewSchema = new Schema(
  {
    user: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    interviewDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Interview date must be future date",
      },
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
