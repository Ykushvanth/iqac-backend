const express = require("express");
const router = express.Router();
const { generateSchoolReport, generateSchoolNegativeCommentsExcel } = require("./report_generator");
const { generateSchoolPdf } = require('./pdf_report');
const { getDistinctSchools, getDepartmentsBySchool } = require('./school_wise_report');
const { getDistinctCourses, getDistinctDegrees, getFacultyByFilters, getBatchesForFacultyCourse, getDegreesForFacultyCourse, getCgpaBreakdownForFacultyCourse } = require('./analysis_backend');
const { getFeedbackAnalysis, getFacultyComments } = require('./performance_analysis');
const fastapiService = require('./fastapi_service');
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

// Helper function to get courses for a department across all degrees if degree is not provided
async function getCoursesForDepartment(department, degree = null) {
    try {
        if (degree) {
            // If degree is provided, use the existing function
            return await getDistinctCourses(degree, department);
        } else {
            // If degree is not provided, get courses across all degrees
            console.log(`Fetching courses for department: ${department} (all degrees)`);
            const { data, error } = await supabase
                .from('course_allocation')
                .select('course_code, course_name, batch, degree')
                .eq('staff_dept', department)
                .not('course_code', 'is', null);

            if (error) {
                console.error('Error fetching courses:', error);
                return [];
            }

            // Group courses by course_code and collect all batches
            const courseMap = new Map();
            (data || []).forEach(item => {
                const code = (item.course_code || '').toString().trim();
                const name = (item.course_name || '').toString().trim();
                const batch = (item.batch || '').toString().trim();
                
                if (code) {
                    if (!courseMap.has(code)) {
                        courseMap.set(code, {
                            code: code,
                            name: name || 'Unknown Course',
                            batches: []
                        });
                    }
                    
                    // Add batch if it's not already in the list
                    if (batch && !courseMap.get(code).batches.includes(batch)) {
                        courseMap.get(code).batches.push(batch);
                    }
                }
            });

            const uniqueCourses = Array.from(courseMap.values())
                .map(course => ({
                    ...course,
                    batches: course.batches.sort((a, b) => {
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                        }
                        return a.localeCompare(b);
                    })
                }))
                .sort((a, b) => a.code.localeCompare(b.code));

            console.log(`Processed unique courses for ${department}: ${uniqueCourses.length} courses`);
            return uniqueCourses;
        }
    } catch (error) {
        console.error('Error in getCoursesForDepartment:', error);
        return [];
    }
}

const EXCLUDED_SECTIONS = new Set([
    'COURSE CONTENT AND STRUCTURE',
    'STUDENT-CENTRIC FACTORS'
]);

const normalizeSectionName = (sectionKey, section) => ((section && section.section_name) || sectionKey || '')
    .toString()
    .trim()
    .toUpperCase();

const isExcludedSection = (sectionKey, section) => EXCLUDED_SECTIONS.has(normalizeSectionName(sectionKey, section));

// Get all schools
router.get('/schools', async (req, res) => {
    try {
        console.log('=== GET /api/school-reports/schools endpoint called ===');
        const schools = await getDistinctSchools();
        console.log(`✓ Successfully fetched ${schools.length} schools`);
        res.json(schools);
    } catch (error) {
        console.error('❌ Error fetching schools:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: error.message || 'Failed to fetch schools',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get departments for a school
router.get('/schools/:school/departments', async (req, res) => {
    try {
        const { school } = req.params;
        const departments = await getDepartmentsBySchool(school);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate school-wise report
router.post('/generate-school-report', async (req, res) => {
    try {
        const { school, degree, batch, format, academicYear, semester, observations, titleSuffix } = req.body || {};
        
        if (!school) {
            return res.status(400).json({ error: 'Missing required field: school' });
        }

        console.log(`\n=== Generating School Report ===`);
        console.log(`School: ${school}`);
        console.log(`Degree: ${degree || 'N/A'}`);
        console.log(`Batch: ${batch || 'ALL'}`);

        // Get all departments for this school
        const departments = await getDepartmentsBySchool(school);
        if (!departments || departments.length === 0) {
            return res.status(404).json({ error: `No departments found for school: ${school}` });
        }

        console.log(`Found ${departments.length} departments for school: ${school}`);

        // For each department, generate the same analysis as department report
        const groupedDataByDept = {};
        const departmentPdfData = [];

        for (const dept of departments) {
            console.log(`\nProcessing department: ${dept}`);

            // Get all courses from course_allocation for this department
            // Note: We need to map department from profiles to staff_dept in course_allocation
            // For now, assuming department code matches staff_dept
            // Use helper function that handles empty degree
            const courses = await getCoursesForDepartment(dept, degree || null);
            if (!courses || courses.length === 0) {
                console.log(`No courses found for department: ${dept}${degree ? ` with degree: ${degree}` : ' (across all degrees)'}`);
                continue;
            }

            console.log(`Found ${courses.length} courses for department: ${dept}`);

            // Aggregate analyses per course per faculty
            const groupedData = [];
            for (const course of courses) {
                const code = course.code ? course.code : course;
                const name = course.name || '';
                
                console.log(`Processing course: ${code}`);

                // Get faculty from course_feedback table
                // getFacultyByFilters can handle empty degree - it will search across all degrees
                const faculties = await getFacultyByFilters(degree || '', dept, code);
                
                if (faculties.length === 0) {
                    console.log(`No faculty found for course: ${code} in department: ${dept}`);
                    continue;
                }

                console.log(`Found ${faculties.length} faculty members for course ${code}`);

                const facultyAnalyses = (await Promise.all(
                    faculties.map(async (f) => {
                        const staffId = f.staffid || f.staff_id || '';
                        if (!staffId) {
                            console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                            return null;
                        }
                        console.log(`Getting feedback analysis for staffid: ${staffId} and course: ${code}`);
                        const [analysis, batches, degrees, cgpa] = await Promise.all([
                            getFeedbackAnalysis('', dept || '', '', code, staffId),
                            getBatchesForFacultyCourse(code, staffId),
                            getDegreesForFacultyCourse(code, staffId),
                            getCgpaBreakdownForFacultyCourse(code, staffId)
                        ]);

                        if (analysis && analysis.success) {
                            console.log(`✓ Analysis found for ${f.faculty_name} (staffid: ${staffId}) with ${batches.length} unique batches and ${degrees.length} unique degrees`);
                            return {
                                faculty_name: f.faculty_name || analysis.faculty_name || '',
                                staffid: staffId,
                                staff_id: f.staff_id || '',
                                batches: batches,
                                degrees: degrees,
                                analysisData: {
                                    ...analysis,
                                    staff_dept: dept,
                                    unique_batches: batches,
                                    unique_degrees: degrees,
                                    cgpa_breakdown: cgpa
                                }
                            };
                        } else {
                            console.warn(`⚠ No feedback data found for staffid: ${staffId}, course: ${code}`);
                            return null;
                        }
                    })
                )).filter(Boolean);
                
                if (facultyAnalyses.length > 0) {
                    groupedData.push({
                        course_code: code,
                        course_name: name || (facultyAnalyses[0]?.analysisData?.course_name || ''),
                        faculties: facultyAnalyses
                    });
                    console.log(`✓ Added ${facultyAnalyses.length} faculty analyses for course: ${code}`);
                }
            }

            if (groupedData.length > 0) {
                groupedDataByDept[dept] = groupedData;

                // Prepare PDF data for this department
                const computeOverallScore = (analysis) => {
                    if (!analysis) return 0;
                    let sectionSum = 0;
                    let sectionCount = 0;
                    Object.entries(analysis).forEach(([sectionKey, section]) => {
                        if (isExcludedSection(sectionKey, section)) {
                            return;
                        }
                        let sectionScore = 0;
                        let questionCount = 0;
                        Object.values(section.questions || {}).forEach(question => {
                            let weightedSum = 0;
                            let totalResponses = 0;
                            (question.options || []).forEach(option => {
                                let value;
                                if (option.value !== undefined && option.value !== null) {
                                    value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : Number(option.value) || 0;
                                } else {
                                    const label = (option.label || '').toUpperCase();
                                    value = label === 'C' ? 2 : label === 'B' ? 1 : 0;
                                }
                                weightedSum += (option.count || 0) * value;
                                totalResponses += option.count || 0;
                            });
                            const maxPossible = totalResponses * 2;
                            const questionScore = maxPossible > 0 ? (weightedSum / maxPossible) * 100 : 0;
                            sectionScore += questionScore;
                            questionCount++;
                        });
                        if (questionCount > 0) {
                            sectionSum += sectionScore / questionCount;
                            sectionCount++;
                        }
                    });
                    return sectionCount > 0 ? Math.round(sectionSum / sectionCount) : 0;
                };

                const aggregatedRows = [];
                groupedData.forEach(course => {
                    course.faculties.forEach(fac => {
                        const overall = computeOverallScore(fac.analysisData?.analysis);
                        aggregatedRows.push({
                            course: `${course.course_code || ''} - ${course.course_name || ''}`.trim(),
                            faculty: fac.faculty_name || '',
                            percentage: overall
                        });
                    });
                });

                departmentPdfData.push({
                    department: dept,
                    rows: aggregatedRows,
                    observations: Array.isArray(observations) ? observations : [],
                    academicYear: academicYear || '',
                    semester: semester || '',
                    titleSuffix: titleSuffix || `${degree || ''}${batch && batch !== 'ALL' ? ` - Batch ${batch}` : ''}`
                });
            }
        }

        if (Object.keys(groupedDataByDept).length === 0) {
            const errorMsg = `No analysis data available for selected school "${school}". ` +
                `This could be because:\n` +
                `1. No courses found for the departments in this school${degree ? ` with degree "${degree}"` : ''}\n` +
                `2. No faculty feedback data found for the courses\n` +
                `3. Department codes in profiles table may not match staff_dept in course_allocation table`;
            console.error(errorMsg);
            return res.status(404).json({ 
                error: 'No analysis data available for selected school',
                details: errorMsg,
                school: school,
                departments: departments,
                degree: degree || 'All degrees'
            });
        }

        console.log(`\n=== School Report Generation Summary ===`);
        console.log(`Total departments with data: ${Object.keys(groupedDataByDept).length}`);
        console.log(`Total faculty analyzed: ${Object.values(groupedDataByDept).reduce((sum, courses) => 
            sum + courses.reduce((s, c) => s + c.faculties.length, 0), 0)}`);

        if (format && format.toLowerCase() === 'pdf') {
            const pdfBuffer = await generateSchoolPdf({
                school: school,
                departments: departmentPdfData,
                academicYear: academicYear || '',
                semester: semester || '',
                titleSuffix: titleSuffix || `${degree || ''}${batch && batch !== 'ALL' ? ` - Batch ${batch}` : ''}`
            });

            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('Generated PDF buffer is empty');
            }

            const safeSchoolName = (school || 'school').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            res.status(200);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${safeSchoolName}_school_report.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Accept-Ranges', 'none');
            res.end(pdfBuffer);
            return;
        }

        // Generate Excel report
        const workbook = await generateSchoolReport(school, { degree, batch: batch || 'ALL' }, groupedDataByDept);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${school}_school_report.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating school report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate school-wise negative comments Excel report
router.post('/generate-school-negative-comments-excel', async (req, res) => {
    try {
        const { school, degree, batch } = req.body || {};
        
        if (!school) {
            return res.status(400).json({ error: 'Missing required field: school' });
        }

        console.log(`\n=== Generating School Negative Comments Excel ===`);
        console.log(`School: ${school}`);
        console.log(`Degree: ${degree || 'N/A'}`);
        console.log(`Batch: ${batch || 'ALL'}`);

        // Get all departments for this school
        const departments = await getDepartmentsBySchool(school);
        if (!departments || departments.length === 0) {
            return res.status(404).json({ error: `No departments found for school: ${school}` });
        }

        console.log(`Found ${departments.length} departments for school: ${school}`);

        // For each department, collect negative comments data
        const groupedDataByDept = {};

        for (const dept of departments) {
            console.log(`\nProcessing department: ${dept}`);

            // Get all courses from course_allocation for this department
            const courses = await getCoursesForDepartment(dept, degree || null);
            if (!courses || courses.length === 0) {
                console.log(`No courses found for department: ${dept}${degree ? ` with degree: ${degree}` : ' (across all degrees)'}`);
                continue;
            }

            console.log(`Found ${courses.length} courses for department: ${dept}`);

            // Aggregate negative comments per course per faculty
            const groupedData = [];
            for (const course of courses) {
                const code = course.code ? course.code : course;
                const name = course.name || '';
                
                console.log(`Processing course: ${code}`);

                // Get faculty from course_feedback table
                const faculties = await getFacultyByFilters(degree || '', dept, code);
                
                if (faculties.length === 0) {
                    console.log(`No faculty found for course: ${code} in department: ${dept}`);
                    continue;
                }

                console.log(`Found ${faculties.length} faculty members for course ${code}`);

                const courseFaculties = [];
                
                await Promise.all(
                    faculties.map(async (f) => {
                        const staffId = f.staffid || f.staff_id || '';
                        if (!staffId) {
                            console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                            return;
                        }
                        
                        try {
                            // First, get comments
                            const commentsResult = await getFacultyComments('', dept || '', '', code, staffId);
                            
                            if (!commentsResult.success) {
                                console.log(`Failed to get comments for ${f.faculty_name} (staffid: ${staffId}): ${commentsResult.message || 'Unknown error'}`);
                                return;
                            }
                            
                            let negativeComments = [];
                            if (commentsResult.comments && commentsResult.comments.length > 0) {
                                console.log(`Found ${commentsResult.comments.length} comments for ${f.faculty_name}, analyzing...`);
                                
                                const sentimentResult = await fastapiService.analyzeComments(
                                    commentsResult.comments,
                                    {
                                        faculty_name: commentsResult.faculty_name || f.faculty_name,
                                        staff_id: commentsResult.staff_id || staffId,
                                        course_code: commentsResult.course_code || code,
                                        course_name: commentsResult.course_name || name
                                    }
                                );

                                if (sentimentResult.success && sentimentResult.analysis) {
                                    negativeComments = sentimentResult.analysis.negative_comments_list || [];
                                    console.log(`FastAPI analysis result: ${negativeComments.length} negative comments found`);
                                } else {
                                    console.log(`FastAPI analysis failed for ${f.faculty_name}: ${sentimentResult.message || 'Unknown error'}`);
                                }
                            } else {
                                console.log(`No comments found for ${f.faculty_name} (staffid: ${staffId})`);
                            }

                            if (negativeComments.length === 0) {
                                console.log(`Skipping ${f.faculty_name} - no negative comments`);
                                return;
                            }

                            // Get analysis data, batches, and degrees for metadata
                            const [analysisResult, batches, degrees] = await Promise.all([
                                getFeedbackAnalysis(degree || '', dept || '', '', code, staffId),
                                getBatchesForFacultyCourse(code, staffId),
                                getDegreesForFacultyCourse(code, staffId)
                            ]);
                            
                            courseFaculties.push({
                                faculty_name: f.faculty_name || commentsResult?.faculty_name || '',
                                staffid: staffId,
                                staff_id: staffId,
                                batches: batches,
                                degrees: degrees,
                                analysisData: analysisResult.success ? {
                                    ...analysisResult,
                                    unique_batches: batches,
                                    unique_degrees: degrees
                                } : null,
                                negativeComments: negativeComments
                            });
                            
                            console.log(`✓ Processed ${f.faculty_name} - ${negativeComments.length} negative comments${analysisResult.success ? ' (with analysis data)' : ' (no analysis data)'}`);
                        } catch (error) {
                            console.error(`Error processing ${f.faculty_name}:`, error);
                        }
                    })
                );

                if (courseFaculties.length > 0) {
                    groupedData.push({
                        course_code: code,
                        course_name: name,
                        faculties: courseFaculties
                    });
                }
            }

            if (groupedData.length > 0) {
                groupedDataByDept[dept] = groupedData;
            }
        }

        if (Object.keys(groupedDataByDept).length === 0) {
            const errorMsg = `No faculty with negative comments found for selected school "${school}". ` +
                `This could be because:\n` +
                `1. No courses found for the departments in this school${degree ? ` with degree "${degree}"` : ''}\n` +
                `2. No faculty feedback data found for the courses\n` +
                `3. No negative comments found for any faculty`;
            console.error(errorMsg);
            return res.status(404).json({ 
                error: 'No faculty with negative comments found for selected school',
                details: errorMsg,
                school: school,
                departments: departments,
                degree: degree || 'All degrees'
            });
        }

        console.log(`\n=== School Negative Comments Excel Summary ===`);
        console.log(`Total departments with data: ${Object.keys(groupedDataByDept).length}`);
        console.log(`Total faculty with negative comments: ${Object.values(groupedDataByDept).reduce((sum, courses) => 
            sum + courses.reduce((s, c) => s + c.faculties.length, 0), 0)}`);

        // Generate Excel report
        const workbook = await generateSchoolNegativeCommentsExcel(school, { degree, batch: batch || 'ALL' }, groupedDataByDept);
        const buffer = await workbook.xlsx.writeBuffer();

        if (!buffer || buffer.length === 0) {
            throw new Error('Generated Excel buffer is empty');
        }

        const safeSchoolName = (school || 'school').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.status(200);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeSchoolName}_negative_comments_report.xlsx"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buffer);
        
    } catch (error) {
        console.error('Error generating school negative comments Excel:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

