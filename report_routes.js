const express = require("express");
const router = express.Router();
const { generateReport, generateDepartmentReport, generateDepartmentNegativeCommentsExcel } = require("./report_generator");
const { generateDepartmentPdf, generateDepartmentNegativeCommentsPdf } = require('./pdf_report');
const { getDistinctCourses, getFacultyByFilters, getDistinctBatches, getBatchesForFacultyCourse, getDegreesForFacultyCourse, getCgpaBreakdownForFacultyCourse } = require('./analysis_backend');
const { getFeedbackAnalysis, getFacultyComments } = require('./performance_analysis');
const fastapiService = require('./fastapi_service');

const EXCLUDED_SECTIONS = new Set([
    'COURSE CONTENT AND STRUCTURE',
    'STUDENT-CENTRIC FACTORS'
]);

const normalizeSectionName = (sectionKey, section) => ((section && section.section_name) || sectionKey || '')
    .toString()
    .trim()
    .toUpperCase();

const isExcludedSection = (sectionKey, section) => EXCLUDED_SECTIONS.has(normalizeSectionName(sectionKey, section));

router.post("/generate-report", async (req, res) => {
    try {
        const { analysisData, facultyData } = req.body;
        
        // Validate required data
        if (!analysisData || !facultyData) {
            throw new Error('Missing required data: analysisData or facultyData');
        }

        if (!analysisData.analysis || Object.keys(analysisData.analysis).length === 0) {
            throw new Error('No analysis data available');
        }
        
        console.log('Received request body:', JSON.stringify({
            analysisData: {
                staff_id: analysisData?.staff_id,
                course_code: analysisData?.course_code,
                course_name: analysisData?.course_name,
                total_responses: analysisData?.total_responses,
                hasAnalysis: !!analysisData?.analysis,
                analysisStructure: analysisData?.analysis ? 
                    Object.entries(analysisData.analysis).map(([key, section]) => ({
                        sectionKey: key,
                        sectionName: section.section_name,
                        questionsCount: Object.keys(section.questions || {}).length,
                        sampleQuestion: section.questions ? 
                            Object.values(section.questions)[0] : null
                    })) : 'No analysis data'
            },
            facultyData: {
                name: facultyData?.faculty_name || facultyData?.name
            }
        }, null, 2));
        
        const workbook = await generateReport(analysisData, facultyData);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=faculty_feedback_report_${analysisData.staff_id || "unknown"}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            error: error.message,
            details: error.stack,
            analysisDataPresent: !!req.body?.analysisData,
            facultyDataPresent: !!req.body?.facultyData
        });
    }
});

module.exports = router;

// Department PDF generation endpoint (no logo, matches sample format)
router.post('/generate-department-pdf', async (req, res) => {
    try {
        const { 
            department, 
            academicYear, 
            semester, 
            observations, 
            rows, 
            titleSuffix 
        } = req.body || {};
        
        // Validate required fields
        if (!department) {
            return res.status(400).json({ error: 'department is required' });
        }

        console.log('Generating PDF with data:', {
            department,
            academicYear,
            semester,
            observationsCount: observations?.length || 0,
            rowsCount: rows?.length || 0,
            titleSuffix
        });

        // Generate PDF buffer
        const buffer = await generateDepartmentPdf({ 
            department, 
            academicYear, 
            semester, 
            observations: observations || [], 
            rows: rows || [], 
            titleSuffix: titleSuffix || 'A 2024-25 (Odd Semester)'
        });

        // Validate buffer
        if (!buffer || buffer.length === 0) {
            throw new Error('Generated PDF buffer is empty');
        }

        console.log('PDF generated successfully, size:', buffer.length, 'bytes');

        // Generate safe filename
        const safeDeptName = (department || 'department')
            .toString()
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();
        
        const filename = `${safeDeptName}_feedback_report.pdf`;

        // Set headers and send buffer
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        res.send(buffer);
        
    } catch (error) {
        console.error('Error generating department PDF:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Generate department-wise report (degree+staff_dept)
// Gets courses and staff_ids from course_allocation, then generates report with unique batch responses per faculty
router.post('/generate-department-report', async (req, res) => {
    try {
        const { degree, dept, batch, format, academicYear, semester, observations, titleSuffix } = req.body || {};
        // Note: 'dept' here refers to staff_dept from course_allocation
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept (staff_dept)' });
        }

        console.log(`\n=== Generating Department Report ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Staff Dept: ${dept}`);

        // Get all courses from course_allocation for the filters (degree + staff_dept)
        const courses = await getDistinctCourses(degree, dept);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for selected filters' });
        }

        console.log(`Found ${courses.length} courses for degree: ${degree}, staff_dept: ${dept}`);

        // Aggregate analyses per course per faculty with batch-wise breakdown
        const groupedData = [];
        for (const course of courses) {
            const code = course.code ? course.code : course;
            const name = course.name || '';
            
            console.log(`\nProcessing course: ${code}`);
            
            // Get faculty from course_feedback table (same as faculty cards)
            // Filtered by: degree, dept, course_code - matches what users see in UI
            const faculties = await getFacultyByFilters(degree, dept, code);
            
            if (faculties.length === 0) {
                console.log(`No faculty found in course_feedback for course: ${code}`);
                continue;
            }

            console.log(`Found ${faculties.length} faculty members in course_feedback for course ${code}`);

            const facultyAnalyses = (await Promise.all(
                faculties.map(async (f) => {
                    const staffId = f.staffid || f.staff_id || '';
                    if (!staffId) {
                        console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                        return null;
                    }
                    console.log(`Getting feedback analysis for staffid: ${staffId} and course: ${code}`);
                    // Run analysis, batches, degrees, cgpa in parallel
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
            } else {
                console.log(`⚠ No faculty analyses found for course: ${code}`);
            }
        }

        if (groupedData.length === 0) {
            return res.status(404).json({ error: 'No analysis data available for selected filters' });
        }

        console.log(`\n=== Report Generation Summary ===`);
        console.log(`Total courses with data: ${groupedData.length}`);
        console.log(`Total faculty analyzed: ${groupedData.reduce((sum, c) => sum + c.faculties.length, 0)}`);

        // Helper to compute overall score for a faculty analysis
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

        if (format && format.toLowerCase() === 'pdf') {
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

            const pdfBuffer = await generateDepartmentPdf({
                department: dept,
                academicYear: academicYear || '',
                semester: semester || '',
                observations: Array.isArray(observations) ? observations : [],
                rows: aggregatedRows,
                titleSuffix: titleSuffix || `${degree}${batch && batch !== 'ALL' ? ` - Batch ${batch}` : ''}`
            });

            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('Generated PDF buffer is empty');
            }

            const safeDeptName = (dept || 'department').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            res.status(200);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${safeDeptName}_department_report.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Accept-Ranges', 'none');
            res.end(pdfBuffer);
            return;
        }

        const workbook = await generateDepartmentReport({ degree, dept, batch: 'ALL' }, groupedData);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${dept}_department_report.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating department report:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/generate-department-report-all-batches', async (req, res) => {
    try {
        const { degree, dept, format, academicYear, semester, observations, titleSuffix } = req.body || {};
        // Note: 'dept' here refers to staff_dept from course_allocation
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept (staff_dept)' });
        }

        console.log(`\n=== Generating Department Report (All Batches) ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Staff Dept: ${dept}`);

        // Get all courses from course_allocation for the filters (degree + staff_dept)
        const courses = await getDistinctCourses(degree, dept);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for selected filters' });
        }

        console.log(`Found ${courses.length} courses for degree: ${degree}, staff_dept: ${dept}`);

        // Aggregate by course_code across all batches
        const courseMap = new Map(); // course_code -> { course_code, course_name, faculties: [] }

        for (const course of courses) {
            const code = course.code ? course.code : course;
            const name = course.name || '';
            
            console.log(`\nProcessing course: ${code}`);

            // Get faculty from course_feedback table (same as faculty cards)
            // Filtered by: degree, dept, course_code - matches what users see in UI
            const faculties = await getFacultyByFilters(degree, dept, code);
            
            if (faculties.length === 0) {
                console.log(`No faculty found in course_feedback for course: ${code}`);
                continue;
            }

            console.log(`Found ${faculties.length} faculty members in course_feedback for course ${code}`);

            // Initialize course in map if not exists
            if (!courseMap.has(code)) {
                courseMap.set(code, {
                    course_code: code,
                    course_name: name || '',
                    faculties: []
                });
            }

            await Promise.all(
                faculties.map(async (f) => {
                    const staffId = f.staffid || f.staff_id || '';
                    if (!staffId) {
                        console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                        return;
                    }
                    console.log(`Getting feedback analysis for staffid: ${staffId} and course: ${code} (all batches)`);
                    const [analysis, batches, degrees, cgpa] = await Promise.all([
                        getFeedbackAnalysis('', dept || '', '', code, staffId),
                        getBatchesForFacultyCourse(code, staffId),
                        getDegreesForFacultyCourse(code, staffId),
                        getCgpaBreakdownForFacultyCourse(code, staffId)
                    ]);
                    if (analysis && analysis.success) {
                        courseMap.get(code).faculties.push({
                            faculty_name: f.faculty_name || analysis.faculty_name || '',
                            staffid: staffId,
                            staff_id: f.staff_id || '',
                            batches: batches,
                            degrees: degrees,
                            analysisData: {
                                ...analysis,
                                batch: 'ALL',
                                staff_dept: dept,
                                unique_batches: batches,
                                unique_degrees: degrees,
                                cgpa_breakdown: cgpa
                            }
                        });
                        console.log(`✓ Analysis found for ${f.faculty_name} (staffid: ${staffId})`);
                    } else {
                        console.warn(`⚠ No feedback data found for staffid: ${staffId}, course: ${code}`);
                    }
                })
            );
        }

        const groupedData = Array.from(courseMap.values()).filter(course => course.faculties.length > 0);
        
        if (groupedData.length === 0) {
            return res.status(404).json({ error: 'No analysis data available for selected filters' });
        }

        console.log(`\n=== Report Generation Summary (All Batches) ===`);
        console.log(`Total courses with data: ${groupedData.length}`);
        console.log(`Total faculty analyzed: ${groupedData.reduce((sum, c) => sum + c.faculties.length, 0)}`);

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

        if (format && format.toLowerCase() === 'pdf') {
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

            const pdfBuffer = await generateDepartmentPdf({
                department: dept,
                academicYear: academicYear || '',
                semester: semester || '',
                observations: Array.isArray(observations) ? observations : [],
                rows: aggregatedRows,
                titleSuffix: titleSuffix || `${degree} - All Batches`
            });

            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('Generated PDF buffer is empty');
            }

            const safeDeptName = (dept || 'department').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            res.status(200);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${safeDeptName}_department_report_all_batches.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Accept-Ranges', 'none');
            res.end(pdfBuffer);
            return;
        }

        const workbook = await generateDepartmentReport({ degree, dept, batch: 'ALL' }, groupedData);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${dept}_department_report_all_batches.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating all-batches department report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate department PDF with negative comments
router.post('/generate-department-negative-comments-pdf', async (req, res) => {
    try {
        const { degree, dept, batch, academicYear, semester, observations, titleSuffix } = req.body || {};
        
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept (staff_dept)' });
        }

        console.log(`\n=== Generating Department Negative Comments PDF ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Staff Dept: ${dept}`);

        // Get all courses from course_allocation for the filters (degree + staff_dept)
        const courses = await getDistinctCourses(degree, dept);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for selected filters' });
        }

        console.log(`Found ${courses.length} courses for degree: ${degree}, staff_dept: ${dept}`);

        // Aggregate negative comments per course per faculty
        const aggregatedRows = [];
        
        for (const course of courses) {
            const code = course.code ? course.code : course;
            const name = course.name || '';
            
            console.log(`\nProcessing course: ${code}`);
            
            // Get faculty from course_feedback table
            const faculties = await getFacultyByFilters(degree, dept, code);
            
            if (faculties.length === 0) {
                console.log(`No faculty found in course_feedback for course: ${code}`);
                continue;
            }

            console.log(`Found ${faculties.length} faculty members in course_feedback for course ${code}`);

            // Check each faculty for negative comments
            await Promise.all(
                faculties.map(async (f) => {
                    const staffId = f.staffid || f.staff_id || '';
                    if (!staffId) {
                        console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                        return;
                    }
                    
                    try {
                        console.log(`Checking negative comments for staffid: ${staffId} and course: ${code}`);
                        
                        // Get comments for this faculty
                        const commentsResult = await getFacultyComments('', dept || '', '', code, staffId);
                        
                        if (!commentsResult.success || !commentsResult.comments || commentsResult.comments.length === 0) {
                            console.log(`No comments found for ${f.faculty_name} (staffid: ${staffId})`);
                            return;
                        }

                        // Analyze comments using FastAPI
                        const analysisResult = await fastapiService.analyzeComments(
                            commentsResult.comments,
                            {
                                faculty_name: commentsResult.faculty_name,
                                staff_id: commentsResult.staff_id,
                                course_code: commentsResult.course_code,
                                course_name: commentsResult.course_name
                            }
                        );

                        if (analysisResult.success && analysisResult.analysis) {
                            const negativeCommentsList = analysisResult.analysis.negative_comments_list || [];
                            
                            if (negativeCommentsList.length > 0) {
                                aggregatedRows.push({
                                    course: `${code || ''} - ${name || ''}`.trim(),
                                    faculty: f.faculty_name || commentsResult.faculty_name || '',
                                    comments: negativeCommentsList // Array of actual negative comments
                                });
                                console.log(`✓ Found ${negativeCommentsList.length} negative comments for ${f.faculty_name}`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing negative comments for ${f.faculty_name}:`, error);
                    }
                })
            );
        }

        if (aggregatedRows.length === 0) {
            return res.status(404).json({ error: 'No faculty with negative comments found for selected filters' });
        }

        console.log(`\n=== Negative Comments PDF Summary ===`);
        console.log(`Total faculty with negative comments: ${aggregatedRows.length}`);

        // Generate PDF
        const pdfBuffer = await generateDepartmentNegativeCommentsPdf({
            department: dept,
            academicYear: academicYear || '2025-26',
            semester: semester || 'Odd',
            observations: Array.isArray(observations) ? observations : [],
            rows: aggregatedRows,
            titleSuffix: titleSuffix || `${degree}${batch && batch !== 'ALL' ? ` - Batch ${batch}` : ''}`
        });

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Generated PDF buffer is empty');
        }

        const safeDeptName = (dept || 'department').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.status(200);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeDeptName}_negative_comments_report.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'none');
        res.end(pdfBuffer);
        
    } catch (error) {
        console.error('Error generating negative comments PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate department Excel with negative comments
router.post('/generate-department-negative-comments-excel', async (req, res) => {
    try {
        const { degree, dept, batch, academicYear, semester } = req.body || {};
        
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept (staff_dept)' });
        }

        console.log(`\n=== Generating Department Negative Comments Excel ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Staff Dept: ${dept}`);

        // Get all courses from course_allocation for the filters
        const courses = await getDistinctCourses(degree, dept);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for selected filters' });
        }

        console.log(`Found ${courses.length} courses for degree: ${degree}, staff_dept: ${dept}`);

        // Build grouped data structure similar to regular Excel report
        const groupedData = [];
        
        for (const course of courses) {
            const code = course.code ? course.code : course;
            const name = course.name || '';
            
            console.log(`\nProcessing course: ${code}`);
            
            // Get faculty from course_feedback table
            const faculties = await getFacultyByFilters(degree, dept, code);
            
            if (faculties.length === 0) {
                console.log(`No faculty found in course_feedback for course: ${code}`);
                continue;
            }

            console.log(`Found ${faculties.length} faculty members in course_feedback for course ${code}`);

            const courseFaculties = [];
            
            // Process each faculty
            await Promise.all(
                faculties.map(async (f) => {
                    const staffId = f.staffid || f.staff_id || '';
                    if (!staffId) {
                        console.warn(`Skipping faculty with no staffid: ${f.faculty_name}`);
                        return;
                    }
                    
                    try {
                        // Get comments for this faculty first (we need this for negative comments)
                        // getFacultyComments signature: (degree, department, batch, courseCode, staffId, cgpa)
                        const commentsResult = await getFacultyComments('', dept || '', '', code, staffId);
                        
                        if (!commentsResult.success) {
                            console.log(`Failed to get comments for ${f.faculty_name} (staffid: ${staffId}): ${commentsResult.message || 'Unknown error'}`);
                            return;
                        }
                        
                        let negativeComments = [];
                        if (commentsResult.comments && commentsResult.comments.length > 0) {
                            console.log(`Found ${commentsResult.comments.length} comments for ${f.faculty_name}, analyzing...`);
                            
                            // Analyze comments using FastAPI
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

                        // Only include faculty with negative comments
                        if (negativeComments.length === 0) {
                            console.log(`Skipping ${f.faculty_name} - no negative comments`);
                            return;
                        }

                        // Get analysis data, batches, and degrees for this faculty (for scores, CGPA, etc.)
                        // Note: getFeedbackAnalysis signature is (degree, department, batch, courseCode, staffId)
                        const [analysisResult, batches, degrees] = await Promise.all([
                            getFeedbackAnalysis(degree || '', dept || '', '', code, staffId),
                            getBatchesForFacultyCourse(code, staffId),
                            getDegreesForFacultyCourse(code, staffId)
                        ]);
                        
                        // Add faculty data with analysis and negative comments
                        // Include even if analysis fails, as long as we have negative comments
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
                            } : null, // Can be null if no analysis
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

        if (groupedData.length === 0) {
            console.log('\n=== No Data Found - Debug Info ===');
            console.log(`Courses found: ${courses.length}`);
            console.log(`Total faculty checked: ${courses.reduce((sum, c) => {
                // This is approximate since we process in parallel
                return sum;
            }, 0)}`);
            return res.status(404).json({ 
                error: 'No faculty with negative comments found for selected filters',
                debug: {
                    courses_found: courses.length,
                    courses_checked: courses.map(c => c.code || c).join(', ')
                }
            });
        }

        console.log(`\n=== Negative Comments Excel Summary ===`);
        console.log(`Total courses: ${groupedData.length}`);
        const totalFaculty = groupedData.reduce((sum, c) => sum + c.faculties.length, 0);
        console.log(`Total faculty: ${totalFaculty}`);

        // Generate Excel
        const workbook = await generateDepartmentNegativeCommentsExcel(
            {
                degree: degree || '',
                dept: dept || '',
                batch: batch || 'ALL'
            },
            groupedData
        );

        // Convert workbook to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        if (!buffer || buffer.length === 0) {
            throw new Error('Generated Excel buffer is empty');
        }

        const safeDeptName = (dept || 'department').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.status(200);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeDeptName}_negative_comments_report.xlsx"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buffer);
        
    } catch (error) {
        console.error('Error generating negative comments Excel:', error);
        res.status(500).json({ error: error.message });
    }
});