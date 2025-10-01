const ExcelJS = require('exceljs');

async function generateReport(analysisData, facultyData) {
    if (!analysisData || !facultyData) {
        throw new Error('Missing required data for report generation');
    }

    // Validate analysis data structure
    if (!analysisData.analysis) {
        throw new Error('Analysis data is missing the analysis section');
    }

    const sections = Object.entries(analysisData.analysis);
    if (sections.length === 0) {
        throw new Error('No sections found in analysis data');
    }

    // Log detailed report generation data
    console.log('Generating report with data:', JSON.stringify({
        facultyInfo: {
            name: facultyData.faculty_name || facultyData.name,
            staffId: analysisData.staff_id,
            courseCode: analysisData.course_code,
            courseName: analysisData.course_name,
            totalResponses: analysisData.total_responses
        },
        analysisInfo: {
            sectionCount: sections.length,
            sections: sections.map(([key, section]) => ({
                key,
                name: section.section_name,
                questionCount: Object.keys(section.questions || {}).length,
                sampleQuestionKeys: Object.keys(section.questions || {}).slice(0, 2)
            }))
        }
    }, null, 2));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IQAC Feedback System';
    workbook.lastModifiedBy = 'IQAC Feedback System';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add Faculty Details Sheet
    const facultySheet = workbook.addWorksheet('Faculty Details');
    facultySheet.addRow(['Faculty Feedback Analysis Report']);
    facultySheet.addRow(['']);
    facultySheet.addRow(['Faculty Name', facultyData.faculty_name || facultyData.name]);
    facultySheet.addRow(['Staff ID', analysisData.staff_id]);
    facultySheet.addRow(['Course Code', analysisData.course_code]);
    facultySheet.addRow(['Course Name', analysisData.course_name]);
    facultySheet.addRow(['Total Responses', analysisData.total_responses]);
    facultySheet.addRow(['']);

    // Format Faculty Details
    facultySheet.getCell('A1').font = { size: 16, bold: true };
    facultySheet.getColumn('A').width = 20;
    facultySheet.getColumn('B').width = 40;

    // Add section-wise sheets with detailed question analysis
    Object.entries(analysisData.analysis || {}).forEach(([sectionKey, section]) => {
        // Create a shortened worksheet name to avoid Excel's 31 character limit
        const shortSectionName = section.section_name?.length > 25 ? 
            section.section_name.substring(0, 25) : (section.section_name || sectionKey);
        const sectionSheet = workbook.addWorksheet(`${shortSectionName}`);

        // Add section header
        sectionSheet.addRow([`${section.section_name || sectionKey} - Detailed Analysis`]);
        sectionSheet.addRow(['']);

        // Add column headers
        sectionSheet.addRow([
            'Question No.',
            'Question',
            'Option',
            'Response Count',
            'Percentage (%)',
            'Rating Value'
        ]);

        // Format headers
        sectionSheet.getRow(3).font = { bold: true };
        sectionSheet.getRow(3).alignment = { horizontal: 'center' };

        // Add questions data
        let questionNumber = 1;
        // Ensure we're getting the questions from the correct structure
        const questions = section.questions || {};
        Object.values(questions).forEach(question => {
            let firstOption = true;
            // Sort options by count in descending order
            const sortedOptions = [...(question.options || [])].sort((a, b) => b.count - a.count);
            
            sortedOptions.forEach(option => {
                const percentage = (option.count / question.total_responses) * 100;
                const row = sectionSheet.addRow([
                    firstOption ? questionNumber : '',
                    firstOption ? question.question : '',
                    option.text,
                    option.count,
                    option.percentage || Math.round(percentage),
                    option.value || option.label
                ]);
                firstOption = false;
            });

            // Add total responses row
            sectionSheet.addRow([
                '',
                'Total Responses:',
                question.total_responses,
                '',
                '100%',
                ''
            ]);

            // Add empty row between questions
            sectionSheet.addRow(['']);
            questionNumber++;
        });

        // Format section sheet
        sectionSheet.getColumn(1).width = 12;  // Question No.
        sectionSheet.getColumn(2).width = 50;  // Question
        sectionSheet.getColumn(3).width = 30;  // Option
        sectionSheet.getColumn(4).width = 15;  // Response Count
        sectionSheet.getColumn(5).width = 15;  // Percentage
        sectionSheet.getColumn(6).width = 12;  // Rating Value

        // Add cell styles
        sectionSheet.getCell('A1').font = { size: 14, bold: true };
        sectionSheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        // Add borders to data cells
        const dataRows = sectionSheet.getRows(3, sectionSheet.rowCount);
        if (dataRows) {
            dataRows.forEach(row => {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
            });
        }
    });

    // Add Overall Analysis Sheet
    const overallSheet = workbook.addWorksheet('Overall Analysis');
    overallSheet.addRow(['Section', 'Score', 'Questions Count']);
    
    let totalScore = 0;
    let totalSections = 0;

    // Add section scores
    (analysisData.analysis ? Object.entries(analysisData.analysis) : []).forEach(([key, section]) => {
        let sectionScore = 0;
        let questionCount = 0;
        
        Object.values(section.questions || {}).forEach(question => {
            let weightedSum = 0;
            let totalResponses = 0;
            
            (question.options || []).forEach(option => {
                // Map values to 5-point scale: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
                let value;
                if (option.value) {
                    value = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
                } else {
                    value = option.label === 'C' ? 5 : option.label === 'B' ? 3 : 1;
                }
                weightedSum += option.count * value;
                totalResponses += option.count;
            });
            
            const maxPossibleScore = totalResponses * 5;
            const questionScore = maxPossibleScore > 0 
                ? (weightedSum / maxPossibleScore) * 100 
                : 0;
            
            sectionScore += questionScore;
            questionCount++;
        });

        const avgSectionScore = questionCount > 0 ? sectionScore / questionCount : 0;
        overallSheet.addRow([
            section.section_name || key,
            Math.round(avgSectionScore),
            questionCount
        ]);

        totalScore += avgSectionScore;
        totalSections++;
    });

    // Add overall score
    overallSheet.addRow(['']);
    overallSheet.addRow(['Overall Score', Math.round(totalScore / totalSections)]);

    // Format Overall Analysis
    overallSheet.getColumn('A').width = 30;
    overallSheet.getColumn('B').width = 15;
    overallSheet.getColumn('C').width = 20;
    overallSheet.getRow(1).font = { bold: true };

    // Add Detailed Questions Analysis Sheet
    const questionsSheet = workbook.addWorksheet('Questions Analysis');
    questionsSheet.addRow([
        'Section',
        'Question',
        'Total Responses',
        'Option',
        'Responses',
        'Percentage',
        'Score'
    ]);

    // Add questions data with enhanced formatting and analysis
    Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
        Object.entries(section.questions).forEach(([questionKey, question]) => {
            let firstRow = true;
            // Sort options by count in descending order
            const sortedOptions = [...question.options].sort((a, b) => b.count - a.count);
            
            // Calculate weighted score for the question
            let weightedSum = 0;
            let totalResponses = question.total_responses;
            question.options.forEach(option => {
                // Map values to 5-point scale: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
                const mappedValue = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
                weightedSum += option.count * mappedValue;
            });
            const questionScore = (weightedSum / (totalResponses * 5)) * 100;

            sortedOptions.forEach(option => {
                const percentage = (option.count / question.total_responses) * 100;
                const row = questionsSheet.addRow([
                    firstRow ? (section.section_name || sectionKey) : '',
                    firstRow ? question.question : '',
                    firstRow ? question.total_responses : '',
                    option.text,
                    option.count,
                    Math.round(percentage),
                    option.value
                ]);

                // Add conditional formatting
                row.eachCell(cell => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });

                // Color-code percentage cells
                const percentageCell = row.getCell(6);
                if (percentage >= 75) {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE6FFE6' } // Light green
                    };
                } else if (percentage >= 50) {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFF2CC' } // Light yellow
                    };
                } else {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFE6E6' } // Light red
                    };
                }

                firstRow = false;
            });

            // Add question summary row
            const summaryRow = questionsSheet.addRow([
                '',
                'Question Summary',
                totalResponses,
                `Average Score: ${Math.round(questionScore)}%`,
                '',
                '',
                ''
            ]);
            
            summaryRow.font = { bold: true };
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' } // Light purple
            };

            // Add empty row between questions
            questionsSheet.addRow([]);
        });
    });

    // Format Questions Analysis
    questionsSheet.getColumn('A').width = 25;  // Section
    questionsSheet.getColumn('B').width = 50;  // Question
    questionsSheet.getColumn('C').width = 15;  // Total Responses
    questionsSheet.getColumn('D').width = 30;  // Option
    questionsSheet.getColumn('E').width = 15;  // Response Count
    questionsSheet.getColumn('F').width = 15;  // Percentage
    questionsSheet.getColumn('G').width = 15;  // Rating Value

    // Enhanced header formatting
    const headerRow = questionsSheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }  // Professional blue
    };
    headerRow.foreColor = { argb: 'FFFFFFFF' };  // White text
    headerRow.height = 25;  // Taller header row

    return workbook;
}

module.exports = { generateReport };