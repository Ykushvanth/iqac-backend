const express = require("express");
const router = express.Router();
const { generateReport } = require("./report_generator");

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
