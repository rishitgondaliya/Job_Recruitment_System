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
      email: {
        type: String,
        required: true,
        trim: true,
      }
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
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Interview date must be future date",
      },
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ["Scheduled", "Cancelled", "Completed"],
    },
    result: {
      type: String,
      enum: ["Selected", "Not selected"]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
