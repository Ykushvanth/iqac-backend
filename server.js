const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const dotenv = require('dotenv');
const { handleFileUpload } = require('./uplod_file_backend');
const { 
    getDistinctDegrees,
    getDistinctDepartments,
    getDistinctBatches,
    getDistinctCourses,
    getFacultyByFilters
} = require('./analysis_backend');
const { getFeedbackAnalysis } = require('./performance_analysis');
const {
    getAllQuestions,
    getQuestionsBySection,
    getDistinctSectionTypes,
    getAllOptions,
    getOptionsForQuestion,
    getQuestionsWithOptions,
    submitFeedback,
    addQuestion,
    addQuestionOptions,
    updateQuestion,
    updateQuestionOptions
} = require('./questions');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Report routes
const reportRoutes = require('./report_routes');
const bulkReportRoutes = require('./bulk_report_routes');
app.use('/api/reports', reportRoutes);
app.use('/api/bulk-reports', bulkReportRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// Analysis routes
app.get('/api/analysis/degrees', async (req, res) => {
    try {
        console.log('Fetching degrees...');
        const degrees = await getDistinctDegrees();
        console.log('Degrees fetched:', degrees);
        res.json(degrees);
    } catch (error) {
        console.error('Error fetching degrees:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/departments', async (req, res) => {
    try {
        console.log('Fetching departments for degree:', req.query.degree);
        const departments = await getDistinctDepartments(req.query.degree);
        console.log('Departments fetched:', departments);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/batches', async (req, res) => {
    try {
        console.log('Fetching batches for:', req.query.degree, req.query.dept);
        const batches = await getDistinctBatches(req.query.degree, req.query.dept);
        console.log('Batches fetched:', batches);
        res.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/courses', async (req, res) => {
    try {
        console.log('Fetching courses for:', req.query);
        const courses = await getDistinctCourses(
            req.query.degree,
            req.query.dept,
            req.query.batch
        );
        console.log('Courses fetched:', courses);
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Faculty route
app.get('/api/analysis/faculty', async (req, res) => {
    try {
        const { degree, dept, batch, course, staffId } = req.query;
        if (!degree || !dept || !batch || !course) {
            return res.status(400).json({ error: 'Missing required query params' });
        }
        const faculty = await getFacultyByFilters(degree, dept, batch, course, staffId);
        res.json(faculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ error: error.message });
    }
});

// Feedback analysis route
app.get('/api/analysis/feedback', async (req, res) => {
    try {
        const { degree, dept, batch, course, staffId } = req.query;
        if (!degree || !dept || !batch || !course) {
            return res.status(400).json({ error: 'Missing required query params' });
        }
        const analysis = await getFeedbackAnalysis(degree, dept, batch, course, staffId);
        res.json(analysis);
    } catch (error) {
        console.error('Error fetching feedback analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

// Questions routes
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await getAllQuestions();
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/sections', async (req, res) => {
    try {
        const sectionTypes = await getDistinctSectionTypes();
        res.json(sectionTypes);
    } catch (error) {
        console.error('Error fetching section types:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/section/:sectionType', async (req, res) => {
    try {
        const { sectionType } = req.params;
        const questions = await getQuestionsBySection(sectionType);
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions by section:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/options', async (req, res) => {
    try {
        const options = await getAllOptions();
        res.json(options);
    } catch (error) {
        console.error('Error fetching options:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/:questionId/options', async (req, res) => {
    try {
        const { questionId } = req.params;
        const options = await getOptionsForQuestion(parseInt(questionId));
        res.json(options);
    } catch (error) {
        console.error('Error fetching options for question:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/with-options', async (req, res) => {
    try {
        const questionsWithOptions = await getQuestionsWithOptions();
        res.json(questionsWithOptions);
    } catch (error) {
        console.error('Error fetching questions with options:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update question route
app.put('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const questionData = req.body;
        console.log('Updating question:', id, questionData);

        if (!questionData.section_type || !questionData.question || !questionData.column_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await updateQuestion(id, questionData);
        console.log('Update result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update question options route
app.put('/api/questions/:id/options', async (req, res) => {
    try {
        const { id } = req.params;
        const optionsData = req.body;
        console.log('Updating options for question:', id, optionsData);

        if (!Array.isArray(optionsData) || optionsData.length === 0) {
            return res.status(400).json({ error: 'Invalid options data' });
        }

        const result = await updateQuestionOptions(id, optionsData);
        console.log('Options update result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error updating question options:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/questions', async (req, res) => {
    try {
        const questionData = req.body;
        if (!questionData.section_type || !questionData.question || !questionData.column_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await addQuestion(questionData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/questions/options', async (req, res) => {
    try {
        const optionsData = req.body;
        console.log('Received options data:', optionsData);
        
        if (!Array.isArray(optionsData) || optionsData.length === 0) {
            return res.status(400).json({ error: 'Invalid options data' });
        }
        
        // Ensure all options have the required fields
        for (const option of optionsData) {
            if (!option.question_id || !option.option_label || !option.option_text) {
                return res.status(400).json({ 
                    error: 'Missing required fields in options data',
                    details: 'Each option must have question_id, option_label, and option_text'
                });
            }
        }
        
        const result = await addQuestionOptions(optionsData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error adding question options:', error);
        res.status(500).json({ error: error.message });
    }
});

// File upload route
app.post('/api/upload', async (req, res) => {
    try {
        console.log('Received upload request');
        
        if (!req.files || !req.files.file) {
            console.log('No file in request');
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log('File received:', req.files.file);
        const result = await handleFileUpload(req.files.file);
        
        console.log('Upload result:', result);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error processing file',
            error: error.message 
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});