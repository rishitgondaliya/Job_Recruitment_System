const mongoose = require("mongoose");
const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["jobSeeker", "recruiter"],
      required: true,
    },

    // Job Seeker Fields
    about: {
      type: String,
      maxlength: 500,
    },
    education: {
      college: { type: String, trim: true },
      degree: String,
      branch: String,
      grade: Number,
      yearOfPassing: Number,
    },
    resume: String,
    skills: [String],
    experience: [
      {
        company: String,
        position: String,
        startDate: Date,
        endDate: Date,
        description: String,
      },
    ],
    savedJobs: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Listing",
      default: undefined,
    },

    // Recruiter Fields
    companyName: String,
    companyWebsite: String,
    industryType: String,
    position: String,
    jobListing: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Listing",
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
