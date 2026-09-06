const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || 'internships.db';

// LOGGING SETUP
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
}

log('🚀 Server starting...');

// SECURITY HEADERS
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
});

// RATE LIMITING
const applicationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many applications submitted, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SERVE STATIC FILES (Frontend)
app.use(express.static(path.join(__dirname)));

// REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
    log(`${req.method} ${req.path}`, 'REQUEST');
    next();
});

// DATABASE
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        log(`Database connection error: ${err.message}`, 'ERROR');
        process.exit(1);
    }
    log('Connected to SQLite database');
    initializeDatabase();
});

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                log(`Database error: ${err.message}`, 'ERROR');
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                log(`Database error: ${err.message}`, 'ERROR');
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                log(`Database error: ${err.message}`, 'ERROR');
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
};

// INITIALIZE DATABASE
async function initializeDatabase() {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS internships (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                domain TEXT NOT NULL,
                mode TEXT NOT NULL,
                location TEXT,
                duration TEXT,
                stipend TEXT,
                openings INTEGER,
                description TEXT,
                skills TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                internship_id TEXT NOT NULL,
                applicant_name TEXT NOT NULL,
                applicant_email TEXT NOT NULL,
                portfolio_url TEXT,
                cover_letter TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (internship_id, applicant_email),
                FOREIGN KEY (internship_id) REFERENCES internships(id)
            )
        `);

        log('Database tables created/verified');
        seedDatabase();
    } catch (error) {
        log(`Database initialization error: ${error.message}`, 'ERROR');
    }
}

// SEED DATABASE
async function seedDatabase() {
    try {
        const count = await dbGet('SELECT COUNT(*) as count FROM internships');

        if (count.count === 0) {
            log('Seeding database with 12 internships...');

            const sampleData = [
                { id: 'INT-001', title: 'Frontend Intern', company: 'TechCorp', domain: 'Full Stack Development', mode: 'Remote', location: 'India', duration: '3 months', stipend: '₹15,000/month', openings: 3, description: "Join our frontend team to build responsive web applications using React and Vue.js. You'll work on real projects and learn modern web development practices.", skills: 'HTML,CSS,JavaScript,React' },
                { id: 'INT-002', title: 'Backend Engineer', company: 'DataFlow Systems', domain: 'Backend Development', mode: 'On-site', location: 'Bangalore', duration: '6 months', stipend: '₹20,000/month', openings: 2, description: 'Help build scalable backend services using Node.js and Python. Experience with databases, APIs, and microservices architecture.', skills: 'Node.js,Python,MongoDB,PostgreSQL' },
                { id: 'INT-003', title: 'UI/UX Designer', company: 'CreativeStudio', domain: 'UI/UX Design', mode: 'Hybrid', location: 'Mumbai', duration: '4 months', stipend: '₹12,000/month', openings: 1, description: 'Design beautiful user interfaces and conduct user research. Work with Figma, Adobe XD, and modern design systems.', skills: 'Figma,User Research,Prototyping,UI Design' },
                { id: 'INT-004', title: 'Data Analyst', company: 'InsightLabs', domain: 'Data Analytics', mode: 'Remote', location: 'India', duration: '3 months', stipend: '₹18,000/month', openings: 5, description: 'Analyze datasets using Python and SQL. Create dashboards and insights reports for business decisions.', skills: 'Python,SQL,Tableau,Excel' },
                { id: 'INT-005', title: 'Cybersecurity Specialist', company: 'SecureNet', domain: 'Cyber Security', mode: 'On-site', location: 'Delhi', duration: '6 months', stipend: '₹25,000/month', openings: 2, description: 'Work on penetration testing, vulnerability assessment, and security protocols. Learn real-world cybersecurity practices.', skills: 'Linux,Networking,Penetration Testing,Security' },
                { id: 'INT-006', title: 'Data Science Intern', company: 'ML Innovations', domain: 'Data Science', mode: 'Remote', location: 'India', duration: '5 months', stipend: '₹22,000/month', openings: 3, description: 'Build machine learning models and work with large datasets. Experience with TensorFlow, scikit-learn, and data visualization.', skills: 'Python,Machine Learning,TensorFlow,Data Analysis' },
                { id: 'INT-007', title: 'Full Stack Developer', company: 'WebForce', domain: 'Full Stack Development', mode: 'Hybrid', location: 'Hyderabad', duration: '4 months', stipend: '₹19,000/month', openings: 2, description: 'Develop full-stack web applications using React, Node.js, and MongoDB. Learn the complete development lifecycle.', skills: 'React,Node.js,MongoDB,Docker' },
                { id: 'INT-008', title: 'Frontend Developer', company: 'PixelStudio', domain: 'Frontend Development', mode: 'Remote', location: 'India', duration: '3 months', stipend: '₹16,000/month', openings: 4, description: 'Create interactive web interfaces with modern frameworks. Focus on performance, accessibility, and responsive design.', skills: 'React,TypeScript,CSS,Webpack' },
                { id: 'INT-009', title: 'Quality Assurance Engineer', company: 'QualityFirst', domain: 'Full Stack Development', mode: 'On-site', location: 'Pune', duration: '3 months', stipend: '₹14,000/month', openings: 3, description: 'Test software applications and identify bugs. Learn automation testing with Selenium and manual testing methodologies.', skills: 'Selenium,Testing,JavaScript,SQL' },
                { id: 'INT-010', title: 'Product Manager', company: 'InnovateTech', domain: 'Backend Development', mode: 'Remote', location: 'India', duration: '6 months', stipend: '₹21,000/month', openings: 1, description: 'Manage product roadmap and work with cross-functional teams. Learn product strategy and customer insights.', skills: 'Product Strategy,Analytics,Communication,Leadership' },
                { id: 'INT-011', title: 'Mobile App Developer', company: 'AppCrafters', domain: 'Frontend Development', mode: 'Hybrid', location: 'Bangalore', duration: '5 months', stipend: '₹20,000/month', openings: 2, description: 'Develop iOS and Android applications using React Native. Build features and optimize app performance.', skills: 'React Native,JavaScript,iOS,Android' },
                { id: 'INT-012', title: 'DevOps Engineer', company: 'CloudOps', domain: 'Full Stack Development', mode: 'Remote', location: 'India', duration: '4 months', stipend: '₹23,000/month', openings: 2, description: 'Manage cloud infrastructure and CI/CD pipelines. Work with AWS, Docker, and Kubernetes.', skills: 'AWS,Docker,Kubernetes,CI/CD' }
            ];

            for (const data of sampleData) {
                await dbRun(
                    `INSERT INTO internships (id, title, company, domain, mode, location, duration, stipend, openings, description, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [data.id, data.title, data.company, data.domain, data.mode, data.location, data.duration, data.stipend, data.openings, data.description, data.skills]
                );
            }
            log('Database seeded with 12 internships');
        } else {
            log(`Database has ${count.count} internships`);
        }
    } catch (error) {
        log(`Seeding error: ${error.message}`, 'ERROR');
    }
}

// VALIDATION
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Only allow http/https portfolio links — rejects javascript:, data:, file:, etc.
function validateURL(url) {
    if (!url) return true;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateApplicationForm(data) {
    const errors = [];

    if (!data.internship_id || data.internship_id.trim() === '') {
        errors.push('Internship ID is required');
    }

    if (!data.applicant_name || data.applicant_name.trim() === '') {
        errors.push('Name is required');
    } else if (data.applicant_name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }

    if (!data.applicant_email || data.applicant_email.trim() === '') {
        errors.push('Email is required');
    } else if (!validateEmail(data.applicant_email)) {
        errors.push('Invalid email format');
    }

    if (data.portfolio_url && !validateURL(data.portfolio_url)) {
        errors.push('Invalid portfolio URL format');
    }

    return errors;
}

// Mask an email before it ever reaches a log line: j***@domain.com
function maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) return '[hidden]';
    const [user, domain] = email.split('@');
    const maskedUser = user.length <= 1 ? '*' : user[0] + '*'.repeat(user.length - 1);
    return `${maskedUser}@${domain}`;
}

// API ENDPOINTS

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'API running', timestamp: new Date().toISOString() });
});

// GET all internships
app.get('/api/internships', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 6);
        const offset = (page - 1) * limit;

        const domain = req.query.domain ? `%${req.query.domain}%` : '%';
        const mode = req.query.mode ? `%${req.query.mode}%` : '%';
        const search = req.query.search ? `%${req.query.search}%` : '%';

        const internships = await dbAll(`
            SELECT * FROM internships 
            WHERE domain LIKE ? AND mode LIKE ? 
            AND (title LIKE ? OR company LIKE ? OR description LIKE ?)
            LIMIT ? OFFSET ?
        `, [domain, mode, search, search, search, limit, offset]);

        const countResult = await dbGet(`
            SELECT COUNT(*) as total FROM internships 
            WHERE domain LIKE ? AND mode LIKE ? 
            AND (title LIKE ? OR company LIKE ? OR description LIKE ?)
        `, [domain, mode, search, search, search]);

        const total = countResult.total;
        const pages = Math.ceil(total / limit);

        log(`Fetched ${internships.length} internships (page ${page})`);

        res.json({
            status: 'success',
            data: internships,
            pagination: { page, limit, total, pages, hasMore: page < pages }
        });
    } catch (error) {
        log(`GET /api/internships error: ${error.message}`, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Failed to fetch internships' });
    }
});

// GET single internship
app.get('/api/internships/:id', async (req, res) => {
    try {
        const internship = await dbGet('SELECT * FROM internships WHERE id = ?', [req.params.id]);

        if (!internship) {
            return res.status(404).json({ status: 'error', message: 'Internship not found' });
        }

        log(`Fetched internship: ${req.params.id}`);
        res.json({ status: 'success', data: internship });
    } catch (error) {
        log(`GET /api/internships/:id error: ${error.message}`, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Failed to fetch internship' });
    }
});

// POST application
app.post('/api/applications', applicationLimiter, async (req, res) => {
    try {
        const { internship_id, applicant_name, applicant_email, portfolio_url, cover_letter } = req.body;

        const validationErrors = validateApplicationForm({
            internship_id,
            applicant_name,
            applicant_email,
            portfolio_url,
            cover_letter
        });

        if (validationErrors.length > 0) {
            log(`Application validation failed for internship ${internship_id}: ${validationErrors.join(', ')}`, 'WARN');
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        const internship = await dbGet('SELECT id FROM internships WHERE id = ?', [internship_id]);
        if (!internship) {
            log(`Application for non-existent internship: ${internship_id}`, 'WARN');
            return res.status(404).json({ status: 'error', message: 'Internship not found' });
        }

        const duplicate = await dbGet(
            'SELECT id FROM applications WHERE internship_id = ? AND applicant_email = ?',
            [internship_id, applicant_email]
        );
        if (duplicate) {
            log(`Duplicate application attempt: ${internship_id} by ${maskEmail(applicant_email)}`, 'WARN');
            return res.status(409).json({ status: 'error', message: 'You have already applied to this internship' });
        }

        await dbRun(
            `INSERT INTO applications (internship_id, applicant_name, applicant_email, portfolio_url, cover_letter)
             VALUES (?, ?, ?, ?, ?)`,
            [internship_id, applicant_name, applicant_email, portfolio_url || null, cover_letter || null]
        );

        log(`Application submitted for ${internship_id} by ${maskEmail(applicant_email)}`);

        res.status(201).json({
            status: 'success',
            message: 'Application submitted successfully'
        });
    } catch (error) {
        log(`POST /api/applications error: ${error.message}`, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Failed to submit application' });
    }
});

// GET applications
app.get('/api/applications/:internship_id', async (req, res) => {
    try {
        const internship = await dbGet('SELECT id FROM internships WHERE id = ?', [req.params.internship_id]);
        if (!internship) {
            return res.status(404).json({ status: 'error', message: 'Internship not found' });
        }

        const applications = await dbAll(
            'SELECT id, internship_id, applicant_name, applicant_email, status, created_at FROM applications WHERE internship_id = ? ORDER BY created_at DESC',
            [req.params.internship_id]
        );

        res.json({ status: 'success', data: applications, pagination: { total: applications.length } });
    } catch (error) {
        log(`GET /api/applications error: ${error.message}`, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Failed to fetch applications' });
    }
});

// 404 HANDLER - Serve index.html for SPA routing
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        log(`404 Not Found: ${req.method} ${req.path}`, 'WARN');
        res.status(404).json({ status: 'error', message: 'Route not found' });
    } else {
        // Serve index.html for all other routes (SPA)
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    log(`Unhandled error: ${err.message}`, 'ERROR');
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// START SERVER
app.listen(PORT, () => {
    log(`🚀 Server running on http://localhost:${PORT}`);
    log(`📊 API: http://localhost:${PORT}/api/internships`);
    log(`💓 Health: http://localhost:${PORT}/api/health`);
    log(`📁 Logs: ${logFile}`);
    log(`✅ Frontend & Backend on SAME URL!`);
});

process.on('SIGINT', () => {
    log('Server shutting down...');
    db.close(() => {
        log('Database connection closed');
        process.exit(0);
    });
});
