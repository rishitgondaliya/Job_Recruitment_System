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
    profilePhoto: String,

    // Job Seeker Fields
    about: {
      type: String,
      trim: true,
      match: [
        /^[A-Za-z\s'-0-9@#&!]+$/,
        "About can only contain alphabets, spaces, numbers, -, ', !, @, # and &.",
      ],
      maxlength: 500,
    },
    education: {
      college: {
        type: String,
        trim: true,
      },
      degree: {
        type: String,
        trim: true,
      },
      branch: {
        type: String,
        trim: true,
      },
      grade: { type: Number, trim: true },
      startYear: {
        type: Date,
        // validate: {
        //   validator: function (value) {
        //     return value <= new Date();
        //   },
        //   message: "Start year cannot be in the future",
        // }
      },
      passingYear: {
        type: Date,
      },
    },
    resume: String,
    skills: {
      type: [String],
      default: undefined,
    },

    // Recruiter Fields
    companyName: {
      type: String,
      trim: true,
    },
    companyWebsite: { type: String, trim: true },
    industryType: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
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
          },
          position: {
            type: String,
            trim: true,
          },
          startDate: {
            type: Date,
            validate: {
              validator: function (value) {
                return value <= Date.now();
              },
              message: "Start date must be from past.",
            },
            default: undefined
          },
          endDate: {
            type: Date,
            validate: {
              validator: function (value) {
                return value > this.startDate && !(value > Date.now());
              },
              message: "End date must be after the start date and should not be future date.",
            },
            default: undefined
          },
          description: {
            type: String,
            trim: true,
            maxlength: 300,
            match: [
              /^[A-Za-z\s'-0-9@#&!]+$/,
              "Description can only contain alphabets, spaces, !, @, #, & and '.",
            ],
          },
        },
        { _id: false },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

profileSchema.pre("validate", function (next) {
  const { startYear, passingYear } = this.education || {};

  // Only validate if both dates are present
  if (startYear && passingYear && passingYear <= startYear) {
    this.invalidate(
      "education.passingYear",
      "Passing year should be greater than start year"
    );
  }

  next();
});


module.exports = mongoose.model("Profile", profileSchema);
