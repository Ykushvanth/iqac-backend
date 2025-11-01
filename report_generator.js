// const ExcelJS = require('exceljs');

// async function generateReport(analysisData, facultyData) {
//     if (!analysisData || !facultyData) {
//         throw new Error('Missing required data for report generation');
//     }

//     // Validate analysis data structure
//     if (!analysisData.analysis) {
//         throw new Error('Analysis data is missing the analysis section');
//     }

//     const sections = Object.entries(analysisData.analysis);
//     if (sections.length === 0) {
//         throw new Error('No sections found in analysis data');
//     }

//     // Log detailed report generation data
//     console.log('Generating report with data:', JSON.stringify({
//         facultyInfo: {
//             name: facultyData.faculty_name || facultyData.name,
//             staffId: analysisData.staff_id,
//             courseCode: analysisData.course_code,
//             courseName: analysisData.course_name,
//             totalResponses: analysisData.total_responses
//         },
//         analysisInfo: {
//             sectionCount: sections.length,
//             sections: sections.map(([key, section]) => ({
//                 key,
//                 name: section.section_name,
//                 questionCount: Object.keys(section.questions || {}).length,
//                 sampleQuestionKeys: Object.keys(section.questions || {}).slice(0, 2)
//             }))
//         }
//     }, null, 2));

//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'IQAC Feedback System';
//     workbook.lastModifiedBy = 'IQAC Feedback System';
//     workbook.created = new Date();
//     workbook.modified = new Date();
    
//     // Add Faculty Details Sheet
//     const facultySheet = workbook.addWorksheet('Faculty Details');
//     facultySheet.addRow(['Faculty Feedback Analysis Report']);
//     facultySheet.addRow(['']);
//     facultySheet.addRow(['Faculty Name', facultyData.faculty_name || facultyData.name]);
//     facultySheet.addRow(['Staff ID', analysisData.staff_id]);
//     facultySheet.addRow(['Course Code', analysisData.course_code]);
//     facultySheet.addRow(['Course Name', analysisData.course_name]);
//     facultySheet.addRow(['Total Responses', analysisData.total_responses]);
//     facultySheet.addRow(['']);

//     // Format Faculty Details
//     facultySheet.getCell('A1').font = { size: 16, bold: true };
//     facultySheet.getColumn('A').width = 20;
//     facultySheet.getColumn('B').width = 40;

//     // Add section-wise sheets with detailed question analysis
//     Object.entries(analysisData.analysis || {}).forEach(([sectionKey, section]) => {
//         // Create a shortened worksheet name to avoid Excel's 31 character limit
//         const shortSectionName = section.section_name?.length > 25 ? 
//             section.section_name.substring(0, 25) : (section.section_name || sectionKey);
//         const sectionSheet = workbook.addWorksheet(`${shortSectionName}`);

//         // Add section header
//         sectionSheet.addRow([`${section.section_name || sectionKey} - Detailed Analysis`]);
//         sectionSheet.addRow(['']);

//         // Add column headers
//         sectionSheet.addRow([
//             'Question No.',
//             'Question',
//             'Option',
//             'Response Count',
//             'Percentage (%)',
//             'Rating Value'
//         ]);

//         // Format headers
//         sectionSheet.getRow(3).font = { bold: true };
//         sectionSheet.getRow(3).alignment = { horizontal: 'center' };

//         // Add questions data
//         let questionNumber = 1;
//         // Ensure we're getting the questions from the correct structure
//         const questions = section.questions || {};
//         Object.values(questions).forEach(question => {
//             let firstOption = true;
//             // Sort options by count in descending order
//             const sortedOptions = [...(question.options || [])].sort((a, b) => b.count - a.count);
            
//             sortedOptions.forEach(option => {
//                 const percentage = (option.count / question.total_responses) * 100;
//                 const row = sectionSheet.addRow([
//                     firstOption ? questionNumber : '',
//                     firstOption ? question.question : '',
//                     option.text,
//                     option.count,
//                     option.percentage || Math.round(percentage),
//                     option.value || option.label
//                 ]);
//                 firstOption = false;
//             });

//             // Add total responses row
//             sectionSheet.addRow([
//                 '',
//                 'Total Responses:',
//                 question.total_responses,
//                 '',
//                 '100%',
//                 ''
//             ]);

//             // Add empty row between questions
//             sectionSheet.addRow(['']);
//             questionNumber++;
//         });

//         // Format section sheet
//         sectionSheet.getColumn(1).width = 12;  // Question No.
//         sectionSheet.getColumn(2).width = 50;  // Question
//         sectionSheet.getColumn(3).width = 30;  // Option
//         sectionSheet.getColumn(4).width = 15;  // Response Count
//         sectionSheet.getColumn(5).width = 15;  // Percentage
//         sectionSheet.getColumn(6).width = 12;  // Rating Value

//         // Add cell styles
//         sectionSheet.getCell('A1').font = { size: 14, bold: true };
//         sectionSheet.getCell('A1').fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FFE6E6FA' }
//         };

//         // Add borders to data cells
//         const dataRows = sectionSheet.getRows(3, sectionSheet.rowCount);
//         if (dataRows) {
//             dataRows.forEach(row => {
//                 row.eachCell(cell => {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
//                     cell.alignment = { vertical: 'middle', horizontal: 'center' };
//                 });
//             });
//         }
//     });

//     // Add Overall Analysis Sheet
//     const overallSheet = workbook.addWorksheet('Overall Analysis');
//     overallSheet.addRow(['Section', 'Score', 'Questions Count']);
    
//     let totalScore = 0;
//     let totalSections = 0;

//     // Add section scores
//     (analysisData.analysis ? Object.entries(analysisData.analysis) : []).forEach(([key, section]) => {
//         let sectionScore = 0;
//         let questionCount = 0;
        
//         Object.values(section.questions || {}).forEach(question => {
//             let weightedSum = 0;
//             let totalResponses = 0;
            
//             (question.options || []).forEach(option => {
//                 // Map values to 5-point scale: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
//                 let value;
//                 if (option.value) {
//                     value = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
//                 } else {
//                     value = option.label === 'C' ? 5 : option.label === 'B' ? 3 : 1;
//                 }
//                 weightedSum += option.count * value;
//                 totalResponses += option.count;
//             });
            
//             const maxPossibleScore = totalResponses * 5;
//             const questionScore = maxPossibleScore > 0 
//                 ? (weightedSum / maxPossibleScore) * 100 
//                 : 0;
            
//             sectionScore += questionScore;
//             questionCount++;
//         });

//         const avgSectionScore = questionCount > 0 ? sectionScore / questionCount : 0;
//         overallSheet.addRow([
//             section.section_name || key,
//             Math.round(avgSectionScore),
//             questionCount
//         ]);

//         totalScore += avgSectionScore;
//         totalSections++;
//     });

//     // Add overall score
//     overallSheet.addRow(['']);
//     overallSheet.addRow(['Overall Score', Math.round(totalScore / totalSections)]);

//     // Format Overall Analysis
//     overallSheet.getColumn('A').width = 30;
//     overallSheet.getColumn('B').width = 15;
//     overallSheet.getColumn('C').width = 20;
//     overallSheet.getRow(1).font = { bold: true };

//     // Add Detailed Questions Analysis Sheet
//     const questionsSheet = workbook.addWorksheet('Questions Analysis');
//     questionsSheet.addRow([
//         'Section',
//         'Question',
//         'Total Responses',
//         'Option',
//         'Responses',
//         'Percentage',
//         'Score'
//     ]);

//     // Add questions data with enhanced formatting and analysis
//     Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
//         Object.entries(section.questions).forEach(([questionKey, question]) => {
//             let firstRow = true;
//             // Sort options by count in descending order
//             const sortedOptions = [...question.options].sort((a, b) => b.count - a.count);
            
//             // Calculate weighted score for the question
//             let weightedSum = 0;
//             let totalResponses = question.total_responses;
//             question.options.forEach(option => {
//                 // Map values to 5-point scale: 1 (bad) = 1, 2 (neutral) = 3, 3 (good) = 5
//                 const mappedValue = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
//                 weightedSum += option.count * mappedValue;
//             });
//             const questionScore = (weightedSum / (totalResponses * 5)) * 100;

//             sortedOptions.forEach(option => {
//                 const percentage = (option.count / question.total_responses) * 100;
//                 const row = questionsSheet.addRow([
//                     firstRow ? (section.section_name || sectionKey) : '',
//                     firstRow ? question.question : '',
//                     firstRow ? question.total_responses : '',
//                     option.text,
//                     option.count,
//                     Math.round(percentage),
//                     option.value
//                 ]);

//                 // Add conditional formatting
//                 row.eachCell(cell => {
//                     cell.alignment = { vertical: 'middle', horizontal: 'center' };
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
//                 });

//                 // Color-code percentage cells
//                 const percentageCell = row.getCell(6);
//                 if (percentage >= 75) {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFE6FFE6' } // Light green
//                     };
//                 } else if (percentage >= 50) {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFFF2CC' } // Light yellow
//                     };
//                 } else {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFFE6E6' } // Light red
//                     };
//                 }

//                 firstRow = false;
//             });

//             // Add question summary row
//             const summaryRow = questionsSheet.addRow([
//                 '',
//                 'Question Summary',
//                 totalResponses,
//                 `Average Score: ${Math.round(questionScore)}%`,
//                 '',
//                 '',
//                 ''
//             ]);
            
//             summaryRow.font = { bold: true };
//             summaryRow.fill = {
//                 type: 'pattern',
//                 pattern: 'solid',
//                 fgColor: { argb: 'FFE6E6FA' } // Light purple
//             };

//             // Add empty row between questions
//             questionsSheet.addRow([]);
//         });
//     });

//     // Format Questions Analysis
//     questionsSheet.getColumn('A').width = 25;  // Section
//     questionsSheet.getColumn('B').width = 50;  // Question
//     questionsSheet.getColumn('C').width = 15;  // Total Responses
//     questionsSheet.getColumn('D').width = 30;  // Option
//     questionsSheet.getColumn('E').width = 15;  // Response Count
//     questionsSheet.getColumn('F').width = 15;  // Percentage
//     questionsSheet.getColumn('G').width = 15;  // Rating Value

//     // Enhanced header formatting
//     const headerRow = questionsSheet.getRow(1);
//     headerRow.font = { bold: true, size: 12 };
//     headerRow.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF4F81BD' }  // Professional blue
//     };
//     headerRow.foreColor = { argb: 'FFFFFFFF' };  // White text
//     headerRow.height = 25;  // Taller header row

//     return workbook;
// }

// module.exports = { generateReport };

// // Generate a department-wise consolidated report (flat table with question columns)
// async function generateDepartmentReport(filters, groupedData) {
//     const ExcelJS = require('exceljs');
//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'IQAC Feedback System';
//     workbook.lastModifiedBy = 'IQAC Feedback System';
//     workbook.created = new Date();
//     workbook.modified = new Date();

//     // One wide sheet similar to legacy format
//     const sheet = workbook.addWorksheet('Department Report');

//     // Header rows (title + filter info)
//     sheet.addRow(['Department-wise Feedback Analysis Report']);
//     sheet.addRow(['']);
//     sheet.addRow(['Degree', filters.degree || '']);
//     sheet.addRow(['Department', filters.dept || '']);
//     sheet.addRow(['Batch', filters.batch || '']);
//     sheet.addRow(['Generated On', new Date().toLocaleString()]);
//     sheet.addRow(['']);
//     sheet.getCell('A1').font = { size: 16, bold: true };

//     // Build table headers: Course Details, Question Details, Score
//     const courseDetailHeaders = [
//         'Dept', 'Degree', 'UG_or_PG', 'Arts_or_Engg', 'Short_Form',
//         'Course_Code', 'Course_Name', 'Staff_id', 'Faculty_Name', 'Name'
//     ];

//     // Create flat list of question headers based on first available analysis
//     const findFirstAnalysis = () => {
//         for (const course of groupedData) {
//             for (const f of course.faculties) {
//                 if (f.analysisData && f.analysisData.analysis) return f.analysisData;
//             }
//         }
//         return null;
//     };

//     const first = findFirstAnalysis();
//     const questionHeaders = [];
//     if (first && first.analysis) {
//         Object.values(first.analysis).forEach(section => {
//             Object.values(section.questions || {}).forEach(q => {
//                 questionHeaders.push(q.question);
//             });
//         });
//     }

//     // Build section headers for per-section average (after questions)
//     const sectionHeaders = [];
//     if (first && first.analysis) {
//         Object.entries(first.analysis).forEach(([key, section]) => {
//             sectionHeaders.push(`${section.section_name || key} Avg`);
//         });
//     }

//     const scoreHeaders = ['Average'];

//     // First header row labels
//     sheet.addRow([...courseDetailHeaders, ...questionHeaders, ...sectionHeaders, ...scoreHeaders]);
//     sheet.getRow(sheet.rowCount).font = { bold: true };

//     // Column widths
//     const widths = [
//         10, 12, 10, 12, 12, // meta (without Year)
//         14, 30, 14, 22, 18  // course/faculty
//     ];
//     for (let i = 0; i < widths.length; i++) {
//         sheet.getColumn(i + 1).width = widths[i];
//     }

//     // Helper: compute overall score and per-question positive percentage
//     const computeOverall = (analysisData) => {
//         if (!analysisData || !analysisData.analysis) return { overall: 0, perQuestion: [], perSection: [] };
//         const perQuestion = [];
//         const perSection = [];
//         let sectionSum = 0;
//         let sectionCount = 0;
//         Object.values(analysisData.analysis).forEach(section => {
//             let sectionScore = 0;
//             let qCount = 0;
//             Object.values(section.questions || {}).forEach(q => {
//                 let weightedSum = 0;
//                 let totalResponses = 0;
//                 (q.options || []).forEach(o => {
//                     const mapped = o.value === 1 ? 1 : o.value === 2 ? 3 : o.value === 3 ? 5 : o.value;
//                     weightedSum += o.count * mapped;
//                     totalResponses += o.count;
//                 });
//                 const maxScore = totalResponses * 5;
//                 const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
//                 sectionScore += qScore;
//                 qCount++;
//                 // positive percentage (value == 3) or highest option as fallback
//                 const positive = (q.options || []).find(o => o.value === 3);
//                 const posPct = positive && q.total_responses > 0
//                     ? Math.round((positive.count / q.total_responses) * 100)
//                     : (q.options && q.options.length > 0
//                         ? Math.round(Math.max(...q.options.map(o => (o.count / (q.total_responses || 1)) * 100)))
//                         : 0);
//                 perQuestion.push(posPct);
//             });
//             const avgSection = qCount > 0 ? sectionScore / qCount : 0;
//             sectionSum += avgSection;
//             sectionCount++;
//             perSection.push(Math.round(avgSection));
//         });
//         const overall = sectionCount > 0 ? Math.round(sectionSum / sectionCount) : 0;
//         return { overall, perQuestion, perSection };
//     };

//     // Add rows per faculty per course
//     groupedData.forEach(course => {
//         course.faculties.forEach(f => {
//             const meta = [
//                 filters.dept || '',
//                 filters.degree || '',
//                 f.analysisData?.ug_or_pg || '',
//                 f.analysisData?.arts_or_engg || '',
//                 f.analysisData?.short_form || '',
//                 (f.analysisData?.course_code || course.course_code || ''),
//                 course.course_name || '',
//                 f.staff_id || '',
//                 f.faculty_name || '',
//                 f.faculty_name || ''
//             ];
//             const { overall, perQuestion, perSection } = computeOverall(f.analysisData);
//             const row = [...meta];
//             // Ensure same number of question cells as headers
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
//             }
//             // Section averages
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
//             }
//             row.push(overall + '%');
//             sheet.addRow(row);
//         });
//     });

//     return workbook;
// }

// module.exports.generateDepartmentReport = generateDepartmentReport;








// const ExcelJS = require('exceljs');

// async function generateReport(analysisData, facultyData) {
//     if (!analysisData || !facultyData) {
//         throw new Error('Missing required data for report generation');
//     }

//     if (!analysisData.analysis) {
//         throw new Error('Analysis data is missing the analysis section');
//     }

//     const sections = Object.entries(analysisData.analysis);
//     if (sections.length === 0) {
//         throw new Error('No sections found in analysis data');
//     }

//     console.log('Generating report with', sections.length, 'sections');

//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'IQAC Feedback System';
//     workbook.lastModifiedBy = 'IQAC Feedback System';
//     workbook.created = new Date();
//     workbook.modified = new Date();
    
//     // Add Faculty Details Sheet
//     const facultySheet = workbook.addWorksheet('Faculty Details');
//     facultySheet.addRow(['Faculty Feedback Analysis Report']);
//     facultySheet.addRow(['']);
//     facultySheet.addRow(['Faculty Name', facultyData.faculty_name || facultyData.name]);
//     facultySheet.addRow(['Staff ID', analysisData.staff_id]);
//     facultySheet.addRow(['Course Code', analysisData.course_code]);
//     facultySheet.addRow(['Course Name', analysisData.course_name]);
//     facultySheet.addRow(['Total Responses', analysisData.total_responses]);
//     facultySheet.addRow(['']);

//     // Format Faculty Details
//     facultySheet.getCell('A1').font = { size: 16, bold: true };
//     facultySheet.getColumn('A').width = 20;
//     facultySheet.getColumn('B').width = 40;

//     // Add section-wise sheets with detailed question analysis
//     Object.entries(analysisData.analysis || {}).forEach(([sectionKey, section]) => {
//         const shortSectionName = section.section_name?.length > 25 ? 
//             section.section_name.substring(0, 25) : (section.section_name || sectionKey);
//         const sectionSheet = workbook.addWorksheet(`${shortSectionName}`);

//         sectionSheet.addRow([`${section.section_name || sectionKey} - Detailed Analysis`]);
//         sectionSheet.addRow(['']);

//         sectionSheet.addRow([
//             'Question No.',
//             'Question',
//             'Option',
//             'Response Count',
//             'Percentage (%)',
//             'Rating Value'
//         ]);

//         sectionSheet.getRow(3).font = { bold: true };
//         sectionSheet.getRow(3).alignment = { horizontal: 'center' };

//         let questionNumber = 1;
//         const questions = section.questions || {};
//         Object.values(questions).forEach(question => {
//             let firstOption = true;
//             const sortedOptions = [...(question.options || [])].sort((a, b) => b.count - a.count);
            
//             sortedOptions.forEach(option => {
//                 const percentage = (option.count / question.total_responses) * 100;
//                 const row = sectionSheet.addRow([
//                     firstOption ? questionNumber : '',
//                     firstOption ? question.question : '',
//                     option.text,
//                     option.count,
//                     option.percentage || Math.round(percentage),
//                     option.value || option.label
//                 ]);
//                 firstOption = false;
//             });

//             sectionSheet.addRow([
//                 '',
//                 'Total Responses:',
//                 question.total_responses,
//                 '',
//                 '100%',
//                 ''
//             ]);

//             sectionSheet.addRow(['']);
//             questionNumber++;
//         });

//         sectionSheet.getColumn(1).width = 12;
//         sectionSheet.getColumn(2).width = 50;
//         sectionSheet.getColumn(3).width = 30;
//         sectionSheet.getColumn(4).width = 15;
//         sectionSheet.getColumn(5).width = 15;
//         sectionSheet.getColumn(6).width = 12;

//         sectionSheet.getCell('A1').font = { size: 14, bold: true };
//         sectionSheet.getCell('A1').fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FFE6E6FA' }
//         };

//         const dataRows = sectionSheet.getRows(3, sectionSheet.rowCount);
//         if (dataRows) {
//             dataRows.forEach(row => {
//                 row.eachCell(cell => {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
//                     cell.alignment = { vertical: 'middle', horizontal: 'center' };
//                 });
//             });
//         }
//     });

//     // Add Overall Analysis Sheet with ALL sections dynamically
//     const overallSheet = workbook.addWorksheet('Overall Analysis');
//     overallSheet.addRow(['Section', 'Score', 'Questions Count']);
    
//     let totalScore = 0;
//     let totalSections = 0;

//     // Add ALL section scores dynamically
//     (analysisData.analysis ? Object.entries(analysisData.analysis) : []).forEach(([key, section]) => {
//         let sectionScore = 0;
//         let questionCount = 0;
        
//         Object.values(section.questions || {}).forEach(question => {
//             let weightedSum = 0;
//             let totalResponses = 0;
            
//             (question.options || []).forEach(option => {
//                 let value;
//                 if (option.value) {
//                     value = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
//                 } else {
//                     value = option.label === 'C' ? 5 : option.label === 'B' ? 3 : 1;
//                 }
//                 weightedSum += option.count * value;
//                 totalResponses += option.count;
//             });
            
//             const maxPossibleScore = totalResponses * 5;
//             const questionScore = maxPossibleScore > 0 
//                 ? (weightedSum / maxPossibleScore) * 100 
//                 : 0;
            
//             sectionScore += questionScore;
//             questionCount++;
//         });

//         const avgSectionScore = questionCount > 0 ? sectionScore / questionCount : 0;
//         overallSheet.addRow([
//             section.section_name || key,
//             Math.round(avgSectionScore),
//             questionCount
//         ]);

//         totalScore += avgSectionScore;
//         totalSections++;
//     });

//     overallSheet.addRow(['']);
//     overallSheet.addRow(['Overall Score', Math.round(totalScore / totalSections)]);

//     overallSheet.getColumn('A').width = 30;
//     overallSheet.getColumn('B').width = 15;
//     overallSheet.getColumn('C').width = 20;
//     overallSheet.getRow(1).font = { bold: true };

//     // Add Detailed Questions Analysis Sheet
//     const questionsSheet = workbook.addWorksheet('Questions Analysis');
//     questionsSheet.addRow([
//         'Section',
//         'Question',
//         'Total Responses',
//         'Option',
//         'Responses',
//         'Percentage',
//         'Score'
//     ]);

//     Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
//         Object.entries(section.questions).forEach(([questionKey, question]) => {
//             let firstRow = true;
//             const sortedOptions = [...question.options].sort((a, b) => b.count - a.count);
            
//             let weightedSum = 0;
//             let totalResponses = question.total_responses;
//             question.options.forEach(option => {
//                 const mappedValue = option.value === 1 ? 1 : option.value === 2 ? 3 : option.value === 3 ? 5 : option.value;
//                 weightedSum += option.count * mappedValue;
//             });
//             const questionScore = (weightedSum / (totalResponses * 5)) * 100;

//             sortedOptions.forEach(option => {
//                 const percentage = (option.count / question.total_responses) * 100;
//                 const row = questionsSheet.addRow([
//                     firstRow ? (section.section_name || sectionKey) : '',
//                     firstRow ? question.question : '',
//                     firstRow ? question.total_responses : '',
//                     option.text,
//                     option.count,
//                     Math.round(percentage),
//                     option.value
//                 ]);

//                 row.eachCell(cell => {
//                     cell.alignment = { vertical: 'middle', horizontal: 'center' };
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
//                 });

//                 const percentageCell = row.getCell(6);
//                 if (percentage >= 75) {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFE6FFE6' }
//                     };
//                 } else if (percentage >= 50) {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFFF2CC' }
//                     };
//                 } else {
//                     percentageCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFFE6E6' }
//                     };
//                 }

//                 firstRow = false;
//             });

//             const summaryRow = questionsSheet.addRow([
//                 '',
//                 'Question Summary',
//                 totalResponses,
//                 `Average Score: ${Math.round(questionScore)}%`,
//                 '',
//                 '',
//                 ''
//             ]);
            
//             summaryRow.font = { bold: true };
//             summaryRow.fill = {
//                 type: 'pattern',
//                 pattern: 'solid',
//                 fgColor: { argb: 'FFE6E6FA' }
//             };

//             questionsSheet.addRow([]);
//         });
//     });

//     questionsSheet.getColumn('A').width = 25;
//     questionsSheet.getColumn('B').width = 50;
//     questionsSheet.getColumn('C').width = 15;
//     questionsSheet.getColumn('D').width = 30;
//     questionsSheet.getColumn('E').width = 15;
//     questionsSheet.getColumn('F').width = 15;
//     questionsSheet.getColumn('G').width = 15;

//     const headerRow = questionsSheet.getRow(1);
//     headerRow.font = { bold: true, size: 12 };
//     headerRow.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF4F81BD' }
//     };
//     headerRow.font.color = { argb: 'FFFFFFFF' };
//     headerRow.height = 25;

//     return workbook;
// }

// // Generate a department-wise consolidated report (flat table with question columns)
// async function generateDepartmentReport(filters, groupedData) {
//     const ExcelJS = require('exceljs');
//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'IQAC Feedback System';
//     workbook.lastModifiedBy = 'IQAC Feedback System';
//     workbook.created = new Date();
//     workbook.modified = new Date();

//     const sheet = workbook.addWorksheet('Department Report');

//     sheet.addRow(['Department-wise Feedback Analysis Report']);
//     sheet.addRow(['']);
//     sheet.addRow(['Degree', filters.degree || '']);
//     sheet.addRow(['Department', filters.dept || '']);
//     sheet.addRow(['Batch', filters.batch || '']);
//     sheet.addRow(['Generated On', new Date().toLocaleString()]);
//     sheet.addRow(['']);
//     sheet.getCell('A1').font = { size: 16, bold: true };

//     const courseDetailHeaders = [
//         'Dept', 'Degree', 'UG_or_PG', 'Arts_or_Engg', 'Short_Form',
//         'Course_Code', 'Course_Name', 'Staff_id', 'Faculty_Name', 'Name'
//     ];

//     const findFirstAnalysis = () => {
//         for (const course of groupedData) {
//             for (const f of course.faculties) {
//                 if (f.analysisData && f.analysisData.analysis) return f.analysisData;
//             }
//         }
//         return null;
//     };

//     const first = findFirstAnalysis();
//     const questionHeaders = [];
//     const sectionHeaders = [];
    
//     if (first && first.analysis) {
//         // Dynamically get ALL questions from ALL sections
//         Object.values(first.analysis).forEach(section => {
//             Object.values(section.questions || {}).forEach(q => {
//                 questionHeaders.push(q.question);
//             });
//         });

//         // Dynamically get ALL section names
//         Object.entries(first.analysis).forEach(([key, section]) => {
//             sectionHeaders.push(`${section.section_name || key} Avg`);
//         });
//     }

//     const scoreHeaders = ['Average'];

//     sheet.addRow([...courseDetailHeaders, ...questionHeaders, ...sectionHeaders, ...scoreHeaders]);
//     sheet.getRow(sheet.rowCount).font = { bold: true };

//     const widths = [10, 12, 10, 12, 12, 14, 30, 14, 22, 18];
//     for (let i = 0; i < widths.length; i++) {
//         sheet.getColumn(i + 1).width = widths[i];
//     }

//     const computeOverall = (analysisData) => {
//         if (!analysisData || !analysisData.analysis) return { overall: 0, perQuestion: [], perSection: [] };
//         const perQuestion = [];
//         const perSection = [];
//         let sectionSum = 0;
//         let sectionCount = 0;
        
//         Object.values(analysisData.analysis).forEach(section => {
//             let sectionScore = 0;
//             let qCount = 0;
//             Object.values(section.questions || {}).forEach(q => {
//                 let weightedSum = 0;
//                 let totalResponses = 0;
//                 (q.options || []).forEach(o => {
//                     const mapped = o.value === 1 ? 1 : o.value === 2 ? 3 : o.value === 3 ? 5 : o.value;
//                     weightedSum += o.count * mapped;
//                     totalResponses += o.count;
//                 });
//                 const maxScore = totalResponses * 5;
//                 const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
//                 sectionScore += qScore;
//                 qCount++;
                
//                 const positive = (q.options || []).find(o => o.value === 3);
//                 const posPct = positive && q.total_responses > 0
//                     ? Math.round((positive.count / q.total_responses) * 100)
//                     : (q.options && q.options.length > 0
//                         ? Math.round(Math.max(...q.options.map(o => (o.count / (q.total_responses || 1)) * 100)))
//                         : 0);
//                 perQuestion.push(posPct);
//             });
//             const avgSection = qCount > 0 ? sectionScore / qCount : 0;
//             sectionSum += avgSection;
//             sectionCount++;
//             perSection.push(Math.round(avgSection));
//         });
//         const overall = sectionCount > 0 ? Math.round(sectionSum / sectionCount) : 0;
//         return { overall, perQuestion, perSection };
//     };

//     groupedData.forEach(course => {
//         course.faculties.forEach(f => {
//             const meta = [
//                 filters.dept || '',
//                 filters.degree || '',
//                 f.analysisData?.ug_or_pg || '',
//                 f.analysisData?.arts_or_engg || '',
//                 f.analysisData?.short_form || '',
//                 (f.analysisData?.course_code || course.course_code || ''),
//                 course.course_name || '',
//                 f.staff_id || '',
//                 f.faculty_name || '',
//                 f.faculty_name || ''
//             ];
//             const { overall, perQuestion, perSection } = computeOverall(f.analysisData);
//             const row = [...meta];
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
//             }
//             row.push(overall + '%');
//             sheet.addRow(row);
//         });
//     });

//     return workbook;
// }

// module.exports = { generateReport, generateDepartmentReport };




const ExcelJS = require('exceljs');

async function generateReport(analysisData, facultyData) {
    if (!analysisData || !facultyData) {
        throw new Error('Missing required data for report generation');
    }

    if (!analysisData.analysis) {
        throw new Error('Analysis data is missing the analysis section');
    }

    const sections = Object.entries(analysisData.analysis);
    if (sections.length === 0) {
        throw new Error('No sections found in analysis data');
    }

    console.log('Generating report with', sections.length, 'sections');

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
        const shortSectionName = section.section_name?.length > 25 ? 
            section.section_name.substring(0, 25) : (section.section_name || sectionKey);
        const sectionSheet = workbook.addWorksheet(`${shortSectionName}`);

        sectionSheet.addRow([`${section.section_name || sectionKey} - Detailed Analysis`]);
        sectionSheet.addRow(['']);

        sectionSheet.addRow([
            'Question No.',
            'Question',
            'Option',
            'Response Count',
            'Percentage (%)',
            'Rating Value'
        ]);

        sectionSheet.getRow(3).font = { bold: true };
        sectionSheet.getRow(3).alignment = { horizontal: 'center' };

        let questionNumber = 1;
        const questions = section.questions || {};
        Object.values(questions).forEach(question => {
            let firstOption = true;
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

            sectionSheet.addRow([
                '',
                'Total Responses:',
                question.total_responses,
                '',
                '100%',
                ''
            ]);

            sectionSheet.addRow(['']);
            questionNumber++;
        });

        sectionSheet.getColumn(1).width = 12;
        sectionSheet.getColumn(2).width = 50;
        sectionSheet.getColumn(3).width = 30;
        sectionSheet.getColumn(4).width = 15;
        sectionSheet.getColumn(5).width = 15;
        sectionSheet.getColumn(6).width = 12;

        sectionSheet.getCell('A1').font = { size: 14, bold: true };
        sectionSheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

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

    // Add Overall Analysis Sheet with ALL sections dynamically
    const overallSheet = workbook.addWorksheet('Overall Analysis');
    overallSheet.addRow(['Section', 'Score', 'Questions Count']);
    
    let totalScore = 0;
    let totalSections = 0;

    // Add ALL section scores dynamically
    (analysisData.analysis ? Object.entries(analysisData.analysis) : []).forEach(([key, section]) => {
        let sectionScore = 0;
        let questionCount = 0;
        
        Object.values(section.questions || {}).forEach(question => {
            let weightedSum = 0;
            let totalResponses = 0;
            
            (question.options || []).forEach(option => {
                let value;
                if (option.value) {
                    value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
                } else {
                    value = option.label === 'C' ? 2 : option.label === 'B' ? 1 : 0;
                }
                weightedSum += option.count * value;
                totalResponses += option.count;
            });
            
            const maxPossibleScore = totalResponses * 2;
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

    overallSheet.addRow(['']);
    overallSheet.addRow(['Overall Score', Math.round(totalScore / totalSections)]);

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

    Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
        Object.entries(section.questions).forEach(([questionKey, question]) => {
            let firstRow = true;
            const sortedOptions = [...question.options].sort((a, b) => b.count - a.count);
            
            let weightedSum = 0;
            let totalResponses = question.total_responses;
            question.options.forEach(option => {
                const mappedValue = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
                weightedSum += option.count * mappedValue;
            });
            const questionScore = (weightedSum / (totalResponses * 2)) * 100;

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

                row.eachCell(cell => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });

                const percentageCell = row.getCell(6);
                if (percentage >= 75) {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE6FFE6' }
                    };
                } else if (percentage >= 50) {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFF2CC' }
                    };
                } else {
                    percentageCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFE6E6' }
                    };
                }

                firstRow = false;
            });

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
                fgColor: { argb: 'FFE6E6FA' }
            };

            questionsSheet.addRow([]);
        });
    });

    questionsSheet.getColumn('A').width = 25;
    questionsSheet.getColumn('B').width = 50;
    questionsSheet.getColumn('C').width = 15;
    questionsSheet.getColumn('D').width = 30;
    questionsSheet.getColumn('E').width = 15;
    questionsSheet.getColumn('F').width = 15;
    questionsSheet.getColumn('G').width = 15;

    const headerRow = questionsSheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
    };
    headerRow.font.color = { argb: 'FFFFFFFF' };
    headerRow.height = 25;

    return workbook;
}

// Generate a department-wise consolidated report (flat table with question columns)
async function generateDepartmentReport(filters, groupedData) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IQAC Feedback System';
    workbook.lastModifiedBy = 'IQAC Feedback System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Department Report');

    sheet.addRow(['Department-wise Feedback Analysis Report']);
    sheet.addRow(['']);
    sheet.addRow(['Degree', filters.degree || '']);
    sheet.addRow(['Department', filters.dept || '']);
    sheet.addRow(['Batch', filters.batch || '']);
    sheet.addRow(['Generated On', new Date().toLocaleString()]);
    sheet.addRow(['']);
    sheet.getCell('A1').font = { size: 16, bold: true };

    const courseDetailHeaders = [
        'Dept', 'Degree', 'UG_or_PG', 'Arts_or_Engg', 'Short_Form',
        'Course_Code', 'Course_Name', 'Staff_id', 'Faculty_Name', 'Name'
    ];

    const findFirstAnalysis = () => {
        for (const course of groupedData) {
            for (const f of course.faculties) {
                if (f.analysisData && f.analysisData.analysis) return f.analysisData;
            }
        }
        return null;
    };

    const first = findFirstAnalysis();
    const questionHeaders = [];
    const sectionHeaders = [];
    
    if (first && first.analysis) {
        // Dynamically get ALL questions from ALL sections
        Object.values(first.analysis).forEach(section => {
            Object.values(section.questions || {}).forEach(q => {
                questionHeaders.push(q.question);
            });
        });

        // Dynamically get ALL section names
        Object.entries(first.analysis).forEach(([key, section]) => {
            sectionHeaders.push(`${section.section_name || key} Avg`);
        });
    }

    const scoreHeaders = ['Average'];

    sheet.addRow([...courseDetailHeaders, ...questionHeaders, ...sectionHeaders, ...scoreHeaders]);
    sheet.getRow(sheet.rowCount).font = { bold: true };

    const widths = [10, 12, 10, 12, 12, 14, 30, 14, 22, 18];
    for (let i = 0; i < widths.length; i++) {
        sheet.getColumn(i + 1).width = widths[i];
    }

    const computeOverall = (analysisData) => {
        if (!analysisData || !analysisData.analysis) return { overall: 0, perQuestion: [], perSection: [] };
        const perQuestion = [];
        const perSection = [];
        let sectionSum = 0;
        let sectionCount = 0;
        
        Object.values(analysisData.analysis).forEach(section => {
            let sectionScore = 0;
            let qCount = 0;
            Object.values(section.questions || {}).forEach(q => {
                let weightedSum = 0;
                let totalResponses = 0;
                (q.options || []).forEach(o => {
                    const mapped = o.value === 1 ? 0 : o.value === 2 ? 1 : o.value === 3 ? 2 : o.value;
                    weightedSum += o.count * mapped;
                    totalResponses += o.count;
                });
                const maxScore = totalResponses * 2;
                const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
                sectionScore += qScore;
                qCount++;
                
                const positive = (q.options || []).find(o => o.value === 3);
                const posPct = positive && q.total_responses > 0
                    ? Math.round((positive.count / q.total_responses) * 100)
                    : (q.options && q.options.length > 0
                        ? Math.round(Math.max(...q.options.map(o => (o.count / (q.total_responses || 1)) * 100)))
                        : 0);
                perQuestion.push(posPct);
            });
            const avgSection = qCount > 0 ? sectionScore / qCount : 0;
            sectionSum += avgSection;
            sectionCount++;
            perSection.push(Math.round(avgSection));
        });
        const overall = sectionCount > 0 ? Math.round(sectionSum / sectionCount) : 0;
        return { overall, perQuestion, perSection };
    };

    // Track starting row for data (after headers)
    const dataStartRow = sheet.rowCount + 1;
    
    groupedData.forEach(course => {
        course.faculties.forEach(f => {
            const meta = [
                filters.dept || '',
                filters.degree || '',
                f.analysisData?.ug_or_pg || '',
                f.analysisData?.arts_or_engg || '',
                f.analysisData?.short_form || '',
                (f.analysisData?.course_code || course.course_code || ''),
                course.course_name || '',
                f.staff_id || '',
                f.faculty_name || '',
                f.faculty_name || ''
            ];
            const { overall, perQuestion, perSection } = computeOverall(f.analysisData);
            const row = [...meta];
            
            // Store column indices where scores start
            const questionScoreStartCol = meta.length + 1;
            const sectionScoreStartCol = questionScoreStartCol + questionHeaders.length;
            const overallScoreCol = sectionScoreStartCol + sectionHeaders.length;
            
            for (let i = 0; i < questionHeaders.length; i++) {
                row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
            }
            
            for (let i = 0; i < sectionHeaders.length; i++) {
                row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
            }
            row.push(overall + '%');
            
            const addedRow = sheet.addRow(row);
            
            // Apply color coding to question scores
            for (let i = 0; i < questionHeaders.length; i++) {
                const colIndex = questionScoreStartCol + i;
                const cell = addedRow.getCell(colIndex);
                const score = perQuestion[i];
                
                if (score !== undefined) {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    
                    if (score < 80) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF0000' } // Red background
                        };
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text
                    } else {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF90EE90' } // Light green
                        };
                    }
                }
            }
            
            // Apply color coding to section average scores
            for (let i = 0; i < sectionHeaders.length; i++) {
                const colIndex = sectionScoreStartCol + i;
                const cell = addedRow.getCell(colIndex);
                const score = perSection[i];
                
                if (score !== undefined) {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    
                    if (score < 80) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF0000' } // Red background
                        };
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text, bold
                    } else {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF90EE90' } // Light green
                        };
                    }
                }
            }
            
            // Apply color coding to overall score
            const overallCell = addedRow.getCell(overallScoreCol);
            if (overall !== undefined) {
                overallCell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (overall < 80) {
                    overallCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF0000' } // Red background
                    };
                    overallCell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text, bold
                } else {
                    overallCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF90EE90' } // Light green
                    };
                }
            }
            
            // Apply borders to metadata columns
            for (let i = 1; i <= meta.length; i++) {
                const cell = addedRow.getCell(i);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
        });
    });
    
    // Add legend at the bottom
    sheet.addRow(['']);
    sheet.addRow(['']);
    const legendRow1 = sheet.addRow(['Legend:']);
    legendRow1.font = { bold: true };
    
    const redLegend = sheet.addRow(['Score < 80%', 'Needs Improvement']);
    redLegend.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' }
    };
    redLegend.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    const greenLegend = sheet.addRow(['Score ≥ 80%', 'Good Performance']);
    greenLegend.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' }
    };

    return workbook;
}

module.exports = { generateReport, generateDepartmentReport };