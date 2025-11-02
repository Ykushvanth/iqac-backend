const express = require("express");
const router = express.Router();
const { generateReport, generateDepartmentReport } = require("./report_generator");
const { getDistinctCourses, getFacultyByFilters, getDistinctBatches } = require('./analysis_backend');
const { getFeedbackAnalysis } = require('./performance_analysis');

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

// Generate department-wise report (degree+dept+batch)
router.post('/generate-department-report', async (req, res) => {
    try {
        const { degree, dept, batch } = req.body || {};
        if (!degree || !dept || !batch) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept, batch' });
        }

        // Get all courses for the filters
        const courses = await getDistinctCourses(degree, dept, batch);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for selected filters' });
        }

        // Aggregate analyses per course per faculty
        const groupedData = [];
        for (const course of courses) {
            const code = course.code ? course.code : course; // API may return array of strings or objects
            const name = course.name || '';
            const faculties = await getFacultyByFilters(degree, dept, batch, code, '');
            const facultyAnalyses = [];
            for (const f of faculties) {
                const staffId = f.staff_id || f.staffid || '';
                const analysis = await getFeedbackAnalysis(degree, dept, batch, code, staffId);
                if (analysis && analysis.success) {
                    facultyAnalyses.push({
    faculty_name: f.faculty_name || analysis.faculty_name || '',
    staff_id: staffId,
    analysisData: {
        ...analysis,
        batch: batch  // ADD THIS LINE - Pass the batch info
    }
});
                }
            }
            if (facultyAnalyses.length > 0) {
                groupedData.push({
                    course_code: code,
                    course_name: name || (facultyAnalyses[0]?.analysisData?.course_name || ''),
                    faculties: facultyAnalyses
                });
            }
        }

        if (groupedData.length === 0) {
            return res.status(404).json({ error: 'No analysis data available for selected filters' });
        }

        const workbook = await generateDepartmentReport({ degree, dept, batch }, groupedData);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${dept}_${batch}_department_report.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating department report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate department-wise report across all batches (no batch filter)
// router.post('/generate-department-report-all-batches', async (req, res) => {
//     try {
//         const { degree, dept } = req.body || {};
//         if (!degree || !dept) {
//             return res.status(400).json({ error: 'Missing required fields: degree, dept' });
//         }

//         // Fetch all batches for the degree+dept
//         const batches = await getDistinctBatches(degree, dept);
//         if (!batches || batches.length === 0) {
//             return res.status(404).json({ error: 'No batches found for selected degree and department' });
//         }

//         // Aggregate by course_code across batches
//         const courseMap = new Map(); // course_code -> { course_code, course_name, faculties: [] }

//         for (const batch of batches) {
//             const courses = await getDistinctCourses(degree, dept, batch);
//             if (!courses || courses.length === 0) continue;

//             for (const course of courses) {
//                 const code = course.code ? course.code : course;
//                 const name = course.name || '';
//                 const faculties = await getFacultyByFilters(degree, dept, batch, code, '');

//                 for (const f of faculties) {
//                     const staffId = f.staff_id || f.staffid || '';
//                     const analysis = await getFeedbackAnalysis(degree, dept, batch, code, staffId);
//                     if (analysis && analysis.success) {
//                         const key = code;
//                         if (!courseMap.has(key)) {
//                             courseMap.set(key, {
//                                 course_code: code,
//                                 course_name: name || (analysis.course_name || ''),
//                                 faculties: []
//                             });
//                         }
//                         courseMap.get(key).faculties.push({
//                             faculty_name: f.faculty_name || analysis.faculty_name || '',
//                             staff_id: staffId,
//                             analysisData: analysis
//                         });
//                     }
//                 }
//             }
//         }

//         const groupedData = Array.from(courseMap.values());
//         if (groupedData.length === 0) {
//             return res.status(404).json({ error: 'No analysis data available for selected filters' });
//         }

//         const workbook = await generateDepartmentReport({ degree, dept, batch: 'ALL' }, groupedData);
//         const buffer = await workbook.xlsx.writeBuffer();
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename=${dept}_department_report_all_batches.xlsx`);
//         res.send(buffer);
//     } catch (error) {
//         console.error('Error generating all-batches department report:', error);
//         res.status(500).json({ error: error.message });
//     }
// });


// Generate department-wise report across all batches (no batch filter)
router.post('/generate-department-report-all-batches', async (req, res) => {
    try {
        const { degree, dept } = req.body || {};
        if (!degree || !dept) {
            return res.status(400).json({ error: 'Missing required fields: degree, dept' });
        }

        // Fetch all batches for the degree+dept
        const batches = await getDistinctBatches(degree, dept);
        if (!batches || batches.length === 0) {
            return res.status(404).json({ error: 'No batches found for selected degree and department' });
        }

        // Aggregate by course_code across batches
        const courseMap = new Map(); // course_code -> { course_code, course_name, faculties: [] }

        for (const batch of batches) {
            const courses = await getDistinctCourses(degree, dept, batch);
            if (!courses || courses.length === 0) continue;

            for (const course of courses) {
                const code = course.code ? course.code : course;
                const name = course.name || '';
                const faculties = await getFacultyByFilters(degree, dept, batch, code, '');

                for (const f of faculties) {
                    const staffId = f.staff_id || f.staffid || '';
                    const analysis = await getFeedbackAnalysis(degree, dept, batch, code, staffId);
                    if (analysis && analysis.success) {
                        const key = code;
                        if (!courseMap.has(key)) {
                            courseMap.set(key, {
                                course_code: code,
                                course_name: name || (analysis.course_name || ''),
                                faculties: []
                            });
                        }
                        courseMap.get(key).faculties.push({
                            faculty_name: f.faculty_name || analysis.faculty_name || '',
                            staff_id: staffId,
                            analysisData: {
                                ...analysis,
                                batch: batch  // ADD THIS LINE - Pass the batch info
                            }
                        });
                    }
                }
            }
        }

        const groupedData = Array.from(courseMap.values());
        if (groupedData.length === 0) {
            return res.status(404).json({ error: 'No analysis data available for selected filters' });
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