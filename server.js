

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const dotenv = require('dotenv');
const FRONTEND_APP_URL = process.env.FRONTEND_URL || 'https://iqac-frontend-rho.vercel.app';
const { handleFileUpload } = require('./uplod_file_backend');
const { handleCoursesUpload } = require('./courses_upload');

const { 
    getDistinctDegrees,
    getDistinctDepartments,
    getDistinctBatches,
    getDistinctCourses,
    getFacultyByFilters
} = require('./analysis_backend');
const { getFeedbackAnalysis, getFacultyComments } = require('./performance_analysis');
const { getDepartmentVisualizationData } = require('./visualize_backend');
const fastapiService = require('./fastapi_service');
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
    updateQuestionOptions,
    deleteQuestion
} = require('./questions');
const { sendOTP, verifyOTP } = require('./login');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: `${FRONTEND_APP_URL}`,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Report routes
const reportRoutes = require('./report_routes');
const bulkReportRoutes = require('./bulk_report_routes');
const schoolWiseReportRoutes = require('./school_wise_report_routes');
app.use('/api/reports', reportRoutes);
app.use('/api/bulk-reports', bulkReportRoutes);
app.use('/api/school-reports', schoolWiseReportRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// ==================== AUTHENTICATION ROUTES ====================

app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('Send OTP request received for email:', email);
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const result = await sendOTP(email);
        res.json(result);
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// ==================== ANALYSIS ROUTES ====================

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        console.log('Verify OTP request received:', { email, otp });
        
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const result = await verifyOTP(email, otp);
        res.json(result);
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});

app.get('/api/analysis/degrees', async (req, res) => {
    try {
        console.log('Fetching degrees from courses table...');
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
        const { degree, dept } = req.query;
        console.log('Fetching courses for:', { degree, dept });
        
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required parameters: degree, dept' });
        }
        
        const courses = await getDistinctCourses(degree, dept);
        console.log('Courses fetched:', courses.length);
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/faculty', async (req, res) => {
    try {
        const { degree, dept, course, staffId } = req.query;
        
        console.log('Fetching faculty with params:', { degree, dept, course, staffId });
        
        if (!degree || !dept || !course) {
            return res.status(400).json({ 
                error: 'Missing required query params',
                required: ['degree', 'dept', 'course']
            });
        }
        
        const faculty = await getFacultyByFilters(degree, dept, course, staffId);
        console.log(`Faculty fetched: ${faculty.length} members`);
        res.json(faculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/feedback', async (req, res) => {
    try {
        const { degree, dept, course, staffId, batch } = req.query;
        
        console.log('Feedback analysis request:', { degree, dept, course, staffId, batch });
        
        // Required: course and staffId (for faculty-specific analysis)
        if (!course) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required query params',
                message: 'Course code is required',
                required: ['course', 'staffId'],
                received: { degree, dept, course, staffId, batch }
            });
        }

        if (!staffId || staffId.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required query params',
                message: 'Staff ID is required for faculty-specific analysis',
                required: ['course', 'staffId'],
                received: { degree, dept, course, staffId, batch }
            });
        }
        
        // degree, dept, and batch are optional but help with filtering
        const analysis = await getFeedbackAnalysis(degree || '', dept || '', batch || '', course, staffId);
        res.json(analysis);
    } catch (error) {
        console.error('Error fetching feedback analysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/batches', async (req, res) => {
    try {
        const { degree, dept } = req.query;
        console.log('Fetching batches for:', degree, dept);
        const batches = await getDistinctBatches(degree, dept);
        console.log('Batches fetched:', batches);
        res.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/comments', async (req, res) => {
    try {
        const { degree, dept, batch, course, staffId, cgpa } = req.query;
        
        console.log('Comments analysis request received with params:', { degree, dept, batch, course, staffId, cgpa });
        
        // Required: course and staffId (for faculty-specific analysis)
        if (!course) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required query params',
                message: 'Course code is required',
                received: { degree, dept, batch, course, staffId }
            });
        }

        if (!staffId || staffId.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required query params',
                message: 'Staff ID is required for faculty-specific analysis',
                received: { degree, dept, batch, course, staffId }
            });
        }
        
        // degree, dept, and batch are optional but help with filtering
        const commentsResult = await getFacultyComments(degree || '', dept || '', batch || '', course, staffId, cgpa);
        
        if (!commentsResult.success) {
            return res.json(commentsResult);
        }
        
        if (commentsResult.total_comments === 0) {
            return res.json({
                success: true,
                message: 'No comments found for analysis',
                faculty_info: {
                    faculty_name: commentsResult.faculty_name,
                    staff_id: commentsResult.staff_id,
                    course_code: commentsResult.course_code,
                    course_name: commentsResult.course_name
                },
                total_comments: 0,
                analysis: null
            });
        }
        
        console.log(`\n=== Sending ${commentsResult.total_comments} comments to FastAPI ===`);
        console.log('Sample comments being sent:', commentsResult.comments.slice(0, 3));
        
        const analysisResult = await fastapiService.analyzeComments(
            commentsResult.comments,
            {
                faculty_name: commentsResult.faculty_name,
                staff_id: commentsResult.staff_id,
                course_code: commentsResult.course_code,
                course_name: commentsResult.course_name
            }
        );
        
        console.log('FastAPI analysis result:', {
            success: analysisResult.success,
            hasAnalysis: !!analysisResult.analysis,
            analysisKeys: analysisResult.analysis ? Object.keys(analysisResult.analysis) : []
        });
        
        if (!analysisResult.success) {
            console.error('FastAPI analysis failed:', analysisResult.message);
            return res.json({
                success: false,
                message: analysisResult.message,
                error: analysisResult.error,
                faculty_info: {
                    faculty_name: commentsResult.faculty_name,
                    staff_id: commentsResult.staff_id,
                    course_code: commentsResult.course_code,
                    course_name: commentsResult.course_name
                },
                total_comments: commentsResult.total_comments,
                comments: commentsResult.comments,
                debug: commentsResult.debug
            });
        }
        
        // Verify and log analysis structure
        const analysis = analysisResult.analysis || {};
        console.log('\n=== Final Analysis Structure Verification ===');
        console.log('Analysis keys:', Object.keys(analysis));
        console.log('- negative_comments:', analysis.negative_comments || 'MISSING');
        console.log('- negative_comments_list:', Array.isArray(analysis.negative_comments_list) ? `${analysis.negative_comments_list.length} items` : 'MISSING or NOT ARRAY');
        console.log('- negative_comments_summary:', analysis.negative_comments_summary ? 'PRESENT' : 'MISSING');
        console.log('- sentiment_distribution:', analysis.sentiment_distribution ? 'PRESENT' : 'MISSING');
        
        if (analysis.sentiment_distribution) {
            console.log('  - negative_percentage:', analysis.sentiment_distribution.negative_percentage || 'N/A');
            console.log('  - positive_percentage:', analysis.sentiment_distribution.positive_percentage || 'N/A');
            console.log('  - neutral_percentage:', analysis.sentiment_distribution.neutral_percentage || 'N/A');
        }
        
        // Ensure analysis has all required fields for frontend
        const finalAnalysis = {
            ...analysis,
            // Ensure negative_comments is a number
            negative_comments: analysis.negative_comments || (Array.isArray(analysis.negative_comments_list) ? analysis.negative_comments_list.length : 0),
            // Ensure negative_comments_list is an array
            negative_comments_list: Array.isArray(analysis.negative_comments_list) ? analysis.negative_comments_list : [],
            // Ensure sentiment_distribution exists
            sentiment_distribution: analysis.sentiment_distribution || {
                positive_percentage: 0,
                negative_percentage: 0,
                neutral_percentage: 0
            }
        };
        
        console.log('\n=== Final Response Structure ===');
        console.log('Total comments sent:', commentsResult.total_comments);
        console.log('Negative comments in analysis:', finalAnalysis.negative_comments);
        console.log('Negative comments list items:', finalAnalysis.negative_comments_list.length);
        
        res.json({
            success: true,
            faculty_info: {
                faculty_name: commentsResult.faculty_name,
                staff_id: commentsResult.staff_id,
                course_code: commentsResult.course_code,
                course_name: commentsResult.course_name
            },
            total_comments: commentsResult.total_comments,
            comments: commentsResult.comments,
            analysis: finalAnalysis,
            debug: {
                ...commentsResult.debug,
                fastapi_debug: analysisResult._debug
            }
        });
        
    } catch (error) {
        console.error('Error fetching comments analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== VISUALIZATION ROUTES ====================
app.get('/api/visualization/department', async (req, res) => {
    try {
        const { degree, dept } = req.query;
        
        console.log('Visualization request:', { degree, dept });
        
        if (!degree || !dept) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required query params',
                required: ['degree', 'dept']
            });
        }
        
        const visualizationData = await getDepartmentVisualizationData(degree, dept);
        res.json(visualizationData);
    } catch (error) {
        console.error('Error fetching visualization data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== FASTAPI ROUTES ====================
app.get('/api/fastapi/health', async (req, res) => {
    try {
        const healthResult = await fastapiService.healthCheck();
        res.json(healthResult);
    } catch (error) {
        console.error('Error checking FastAPI health:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== DEBUG ROUTES ====================
app.get('/api/debug/database', async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const dotenv = require('dotenv');
        dotenv.config();
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false
                }
            }
        );
        
        const { data: sampleData, error } = await supabase
            .from('course_feedback')
            .select('degree, dept, batch, course_code, staff_id, staffid, comment, faculty_name')
            .not('comment', 'is', null)
            .not('comment', 'eq', '')
            .limit(10);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        const { data: uniqueDegrees } = await supabase
            .from('course_feedback')
            .select('degree')
            .not('degree', 'is', null);
        
        const { data: uniqueDepts } = await supabase
            .from('course_feedback')
            .select('dept')
            .not('dept', 'is', null);
        
        const { data: uniqueBatches } = await supabase
            .from('course_feedback')
            .select('batch')
            .not('batch', 'is', null);
        
        const { data: uniqueCourses } = await supabase
            .from('course_feedback')
            .select('course_code')
            .not('course_code', 'is', null);
        
        const { data: specificCourse } = await supabase
            .from('course_feedback')
            .select('*')
            .eq('course_code', '212CSE3302')
            .limit(5);
        
        res.json({
            success: true,
            sampleData: sampleData,
            specificCourse: specificCourse,
            uniqueValues: {
                degrees: [...new Set(uniqueDegrees?.map(d => d.degree) || [])],
                depts: [...new Set(uniqueDepts?.map(d => d.dept).filter(Boolean) || [])],
                batches: [...new Set(uniqueBatches?.map(b => b.batch) || [])],
                courses: [...new Set(uniqueCourses?.map(c => c.course_code) || [])]
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== QUESTIONS ROUTES ====================
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

app.delete('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting question via API:', id);
        const result = await deleteQuestion(id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== FILE UPLOAD ROUTES ====================
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


app.post('/api/upload-courses', async (req, res) => {
    try {
        console.log('Received courses upload request');
        
        if (!req.files || !req.files.file) {
            console.log('No file in request');
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log('Courses file received:', req.files.file);
        const result = await handleCoursesUpload(req.files.file);
        
        console.log('Courses upload result:', result);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Courses upload error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error processing courses file',
            error: error.message 
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Authentication routes available at http://localhost:${PORT}/api/auth/*`);
});