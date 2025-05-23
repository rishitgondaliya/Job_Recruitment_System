# 💼 Job Recruitment System

A Node.js + Mongoose base web application for managing job postings and applications with secure authentication, role-based access, and a clean, user-friendly interface.

---

## 🚀 Features

👤 User Registration & Login (JWT-based)

🧑‍💼 Role-based Authentication (Admin / Recruiter / Job Seeker)

🔐 Forgot Password & Reset via Email (SendGrid)

📁 Resume Upload

📃 Job Posting & Editing (by Recruiters)

📃 Adding job categories & editing, activate/deactivate or delete users (by Admin)

🔎 Job Filter (by category, location type, experience, salary)

📄 Applied Jobs View for Job Seekers

⭐ Job Rating & Review System

📊 Pagination & Filtering for Listings

📊 Pagination & Filtering for Recruiters (filter jobseekers)

🎯 Profile Management (photo, skills, experience, education, resume)

---

## 📥 Installation & Setup

### ✅ Prerequisites
Before you begin, ensure you have the following installed on your machine:

Node.js (v16+), if you don't have download from : https://nodejs.org/en/download

MongoDB (Community Edition), if you don't have download from : https://www.mongodb.com/try/download/community

### Clone the project
cd jrs

### Install dependencies
npm install

### Start the app
npm start

- After starting the server : 
    - Admin credencials will be logged in the console, use those for admin login.
    - Admin :
        - Manage users (activate / deactivate / delete)
        - Add, update or delete job categories


#### Register new user (jobSeeker or recruiter) to use all functionalities

- Job Seeker :
    - View all job listings
    - View job details
    - View job categories
    - Update profile
    - Apply for jobs
    - Save jobs
    - Rate and review job

- Recruiter :
    - Add / update new job post
    - View job seekers
    - view applications
    - shortlist application and schedule interviews
    - post interview results
    - update profile