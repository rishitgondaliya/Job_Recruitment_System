const mongoose = require("mongoose");
const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    // general fields
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: [true, "User profile exists!"],
    },
    profileType: {
      type: String,
      enum: ["jobSeeker", "recruiter"],
      required: true,
    },

    // Job Seeker Fields
    about: {
      type: String,
      trim: true,
      match: [
        /^[A-Za-z\s'-0-9]+$/,
        "About can only contain alphabets, spaces, hyphens, numbers and apostrophes",
      ],
      maxlength: 500,
    },
    education: {
      college: {
        type: String,
        trim: true,
        // required: [true, "College is required"],
      },
      degree: {
        type: String,
        trim: true,
        // required: [true, "Degree is required"],
      },
      branch: {
        type: String,
        trim: true,
        // required: [true, "Branch is required"],
      },
      grade: { type: Number, trim: true },
      yearOfPassing: {
        type: Number,
        trim: true,
        // required: [true, "Passing year is required"],
      },
    },
    resume: String,
    skills: {
      type: [String],
      default: undefined,
    },
    savedJobs: {
      type: [
        {
          jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "savedJobs",
            required: true,
          },
          jobTitle: {
            type: String,
            trim: true,
            // required: [true, "Title is required"],
          },
        },
        { _id: false },
      ],
      default: undefined, // If empty, the field will be absent
      validate: {
        validator: function (jobs) {
          const jobIds = jobs.map((job) => job.jobId.toString());
          return new Set(jobIds).size === jobIds.length;
        },
        message: "Job is already saved!",
      },
    },

    // Recruiter Fields
    companyName: {
      type: String,
      trim: true,
      // required: [true, "Company name is required"],
    },
    companyWebsite: { type: String, trim: true },
    industryType: {
      type: String,
      trim: true,
      // required: [true, "Industry is required"],
    },
    position: {
      type: String,
      trim: true,
      // required: [true, "Position is required"],
    },
    jobListing: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Listing",
      default: undefined,
    },

    // other general fileds
    experience: {
      type: [
        {
          company: {
            type: String,
            trim: true,
            // required: [true, "Company is required"],
          },
          position: {
            type: String,
            trim: true,
            // required: [true, "Position is required"],
          },
          startDate: {
            type: Date,
            validate: {
              validator: function (value) {
                return !value || value < this.endDate;
              },
              message: "Start date must be before the end date.",
            },
          },
          endDate: {
            type: Date,
            validate: {
              validator: function (value) {
                return !value || value > this.startDate;
              },
              message: "End date must be after the start date.",
            },
          },
          description: {
            type: String,
            trim: true,
            maxlength: 300,
            match: [
              /^[A-Za-z\s'-0-9]+$/,
              "Description can only contain alphabets, spaces, hyphens, and apostrophes",
            ],
          },
        },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
