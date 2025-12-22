require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Skill = require('../models/skill');
const Category = require('../models/Category');
const connectDB = require('../config/db');

const seedDatabase = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Clear existing data
    await User.deleteMany({});
    await Skill.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing data');

    // 1. Create Categories
    const categories = [
      { key: 'development', title: 'Development', description: 'Software engineering and coding' },
      { key: 'design', title: 'Design', description: 'UI/UX, Graphic Design, and Art' },
      { key: 'business', title: 'Business', description: 'Product Management, Marketing, and Strategy' },
      { key: 'data', title: 'Data Science', description: 'AI, ML, and Data Analysis' },
    ];
    await Category.insertMany(categories);
    console.log('Created categories');

    // 2. Create Skills
    const skillsData = [
      { name: 'React.js', slug: 'react-js', category: 'development' },
      { name: 'Node.js', slug: 'node-js', category: 'development' },
      { name: 'JavaScript', slug: 'javascript', category: 'development' },
      { name: 'TypeScript', slug: 'typescript', category: 'development' },
      { name: 'Python', slug: 'python', category: 'development' },
      { name: 'UI Design', slug: 'ui-design', category: 'design' },
      { name: 'UX Design', slug: 'ux-design', category: 'design' },
      { name: 'Figma', slug: 'figma', category: 'design' },
      { name: 'Product Management', slug: 'product-management', category: 'business' },
      { name: 'User Research', slug: 'user-research', category: 'business' },
      { name: 'Machine Learning', slug: 'machine-learning', category: 'data' },
      { name: 'Data Analysis', slug: 'data-analysis', category: 'data' },
    ];
    const createdSkills = await Skill.insertMany(skillsData);
    console.log('Created skills');

    // Helper to find skill ID by name
    const getSkillId = (name) => {
      const skill = createdSkills.find(s => s.name === name);
      return skill ? skill._id : null;
    };

    // 3. Create Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const users = [
      {
        name: "Sarah Chen",
        email: "sarah.chen@example.com",
        passwordHash,
        bio: "Full-stack developer with 7+ years experience. Passionate about React, Node.js, and helping junior developers grow. I love teaching and have mentored 50+ students. Currently working as a Senior Engineer at a fintech startup.",
        location: "San Francisco, CA",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        teaches: [
          { name: "React.js", level: "expert", skillRef: getSkillId("React.js") },
          { name: "Node.js", level: "expert", skillRef: getSkillId("Node.js") },
          { name: "JavaScript", level: "expert", skillRef: getSkillId("JavaScript") }
        ],
        learns: [
          { name: "Machine Learning", level: "beginner", skillRef: getSkillId("Machine Learning") }
        ],
        rating: 4.9,
        reviewsCount: 12,
        isMentor: true,
        isVerified: true,
        title: "Senior Full-Stack Developer",
        yearsOfExperience: 7,
        linkedin: "sarahchen",
        github: "sarahchen",
        website: "https://sarahchen.dev",
        demoVideos: [
          {
            title: "Advanced React Patterns",
            url: "https://res.cloudinary.com/demo/video/upload/v1687516235/docs_video_demo.mp4", // Dummy video
            publicId: "demo_1"
          }
        ]
      },
      {
        name: "Marcus Johnson",
        email: "marcus.johnson@example.com",
        passwordHash,
        bio: "Product Manager with 5+ years in tech. Expert in strategy, user research, and team leadership. I mentor product managers and help them navigate the career path. Former product lead at multiple startups.",
        location: "New York, NY",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
        teaches: [
          { name: "Product Management", level: "expert", skillRef: getSkillId("Product Management") },
          { name: "User Research", level: "advanced", skillRef: getSkillId("User Research") }
        ],
        learns: [
          { name: "Python", level: "beginner", skillRef: getSkillId("Python") }
        ],
        rating: 4.7,
        reviewsCount: 8,
        isMentor: true,
        isVerified: true,
        title: "Senior Product Manager",
        yearsOfExperience: 5,
        linkedin: "marcusjohnson",
        twitter: "marcusjohnson"
      },
      {
        name: "Priya Patel",
        email: "priya.patel@example.com",
        passwordHash,
        bio: "UX/UI Designer passionate about creating beautiful, accessible interfaces. 7+ years experience in digital design. Love teaching design thinking and mentoring junior designers. Currently leading design at a Fortune 500 company.",
        location: "Mumbai, India",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
        teaches: [
          { name: "UI Design", level: "expert", skillRef: getSkillId("UI Design") },
          { name: "UX Design", level: "expert", skillRef: getSkillId("UX Design") },
          { name: "Figma", level: "expert", skillRef: getSkillId("Figma") }
        ],
        learns: [
          { name: "JavaScript", level: "intermediate", skillRef: getSkillId("JavaScript") }
        ],
        rating: 4.8,
        reviewsCount: 15,
        isMentor: true,
        isVerified: true,
        title: "Lead UX/UI Designer",
        yearsOfExperience: 7,
        linkedin: "priyapatel",
        website: "https://priyadesigns.com",
        demoVideos: [
          {
            title: "Design System Creation from Scratch",
            url: "https://res.cloudinary.com/demo/video/upload/v1687516235/docs_video_demo.mp4",
            publicId: "demo_2"
          }
        ]
      },
      {
        name: "David Kim",
        email: "david.kim@example.com",
        passwordHash,
        bio: "DevOps Engineer specializing in AWS, Docker, and Kubernetes. I help developers understand infrastructure and CI/CD pipelines. 4 years of experience in cloud computing.",
        location: "Seoul, South Korea",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        teaches: [
          { name: "Python", level: "advanced", skillRef: getSkillId("Python") }
        ],
        learns: [
          { name: "React.js", level: "beginner", skillRef: getSkillId("React.js") }
        ],
        rating: 4.6,
        reviewsCount: 5,
        isMentor: true,
        isVerified: false,
        title: "DevOps Engineer",
        yearsOfExperience: 4,
        github: "davidkim"
      },
      {
        name: "Elena Rodriguez",
        email: "elena.rodriguez@example.com",
        passwordHash,
        bio: "Data Scientist with a background in mathematics. I love explaining complex ML concepts in simple terms. Experienced in Python, TensorFlow, and data visualization.",
        location: "Madrid, Spain",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
        teaches: [
          { name: "Machine Learning", level: "expert", skillRef: getSkillId("Machine Learning") },
          { name: "Data Analysis", level: "expert", skillRef: getSkillId("Data Analysis") },
          { name: "Python", level: "expert", skillRef: getSkillId("Python") }
        ],
        learns: [
          { name: "Product Management", level: "beginner", skillRef: getSkillId("Product Management") }
        ],
        rating: 5.0,
        reviewsCount: 20,
        isMentor: true,
        isVerified: true,
        title: "Senior Data Scientist",
        yearsOfExperience: 6,
        linkedin: "elenarodriguez"
      }
    ];

    await User.insertMany(users);
    console.log(`Created ${users.length} users`);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedDatabase();
