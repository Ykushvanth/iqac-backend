const express = require("express");
const router = express.Router();
const ExcelJS = require('exceljs');

async function generateBulkReport(facultyAnalyses, filters) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IQAC Feedback System';
    workbook.lastModifiedBy = 'IQAC Feedback System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add Report Info Sheet
    const infoSheet = workbook.addWorksheet('Report Information');
    infoSheet.addRow(['Faculty Feedback Analysis - Consolidated Report']);
    infoSheet.addRow(['']);
    infoSheet.addRow(['Degree', filters.degree]);
    infoSheet.addRow(['Department', filters.department]);
    infoSheet.addRow(['Batch', filters.batch]);
    infoSheet.addRow(['Course Code', filters.course]);
    infoSheet.addRow(['Total Faculty', facultyAnalyses.length]);
    infoSheet.addRow(['Generated Date', new Date().toLocaleString()]);
    
    // Format Info Sheet
    infoSheet.getCell('A1').font = { size: 16, bold: true };
    infoSheet.getColumn('A').width = 20;
    infoSheet.getColumn('B').width = 40;

    // Add Summary Sheet
    const summarySheet = workbook.addWorksheet('Faculty Analysis Summary');
    
    // Add headers
    summarySheet.addRow([
        'Faculty Name',
        'Staff ID',
        'Total Responses',
        'Overall Score',
        'Teaching Effectiveness Score',
        'Classroom Dynamics Score',
        'Course Content Score',
        'Assessment Score'
    ]);

    // Format headers
    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
    };
    headerRow.font.color = { argb: 'FFFFFFFF' };

    // Add data for each faculty
    facultyAnalyses.forEach(({ analysisData, facultyData }) => {
        const sectionScores = {};
        let totalScore = 0;
        let sectionCount = 0;

        // Calculate section scores
        Object.entries(analysisData.analysis || {}).forEach(([key, section]) => {
            let sectionScore = 0;
            let questionCount = 0;

            Object.values(section.questions || {}).forEach(question => {
                let weightedSum = 0;
                let totalResponses = 0;

                question.options.forEach(option => {
                    // Map values to 5-point scale: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
                    let value;
                    if (option.value) {
                        // Map the values: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
                        value = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
                    } else {
                        switch (option.label) {
                            case 'C': value = 5; break;  // Good
                            case 'B': value = 3; break;  // Neutral
                            case 'A': value = 1; break;  // Needs Improvement
                            default: value = 0;
                        }
                    }
                    weightedSum += option.count * value;
                    totalResponses += option.count;
                });

                // Calculate percentage: (actual score / maximum possible score) * 100
                // Maximum possible score is when all responses are 'Good' (value 5)
                const maxPossibleScore = totalResponses * 5; // Maximum score is 5 (Good)
                const questionScore = maxPossibleScore > 0 ? (weightedSum / maxPossibleScore) * 100 : 0;
                sectionScore += questionScore;
                questionCount++;
            });

            const avgSectionScore = questionCount > 0 ? Math.round(sectionScore / questionCount) : 0;
            sectionScores[section.section_name || key] = avgSectionScore;
            totalScore += avgSectionScore;
            sectionCount++;
        });

        const overallScore = sectionCount > 0 ? Math.round(totalScore / sectionCount) : 0;

        // Add row for this faculty
        summarySheet.addRow([
            facultyData.faculty_name || facultyData.name,
            facultyData.staff_id || facultyData.staffid,
            analysisData.total_responses,
            overallScore,
            sectionScores['TEACHING EFFECTIVENESS'] || 0,
            sectionScores['CLASSROOM DYNAMICS AND ENGAGEMENT'] || 0,
            sectionScores['COURSE CONTENT'] || 0,
            sectionScores['ASSESSMENT'] || 0
        ]);
    });

    // Format summary sheet
    summarySheet.columns.forEach((column, i) => {
        column.width = i === 0 ? 30 : 20;
        column.alignment = { horizontal: 'center' };
    });

    // Add borders and colors to all cells
    summarySheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Add color coding for scores (columns 4-8)
            if (rowNumber > 1 && cell.col >= 4) {
                const score = parseInt(cell.value) || 0;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { 
                        argb: score >= 75 ? 'FFE6FFE6' :  // Light green
                              score >= 50 ? 'FFFFF2CC' :  // Light yellow
                                          'FFFFE6E6'      // Light red
                    }
                };
            }
        });
    });

    return workbook;
}

router.post("/generate-bulk-report", async (req, res) => {
    try {
        const { facultyAnalyses, filters } = req.body;

        if (!facultyAnalyses || !filters) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const workbook = await generateBulkReport(facultyAnalyses, filters);
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=faculty_feedback_analysis_${filters.department}_${filters.course}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error('Error generating bulk report:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;