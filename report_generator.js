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
//                     value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                 } else {
//                     value = option.label === 'C' ? 2 : option.label === 'B' ? 1 : 0;
//                 }
//                 weightedSum += option.count * value;
//                 totalResponses += option.count;
//             });
            
//             const maxPossibleScore = totalResponses * 2;
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
//                 const mappedValue = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                 weightedSum += option.count * mappedValue;
//             });
//             const questionScore = (weightedSum / (totalResponses * 2)) * 100;

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
//                     const mapped = o.value === 1 ? 0 : o.value === 2 ? 1 : o.value === 3 ? 2 : o.value;
//                     weightedSum += o.count * mapped;
//                     totalResponses += o.count;
//                 });
//                 const maxScore = totalResponses * 2;
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

//     // Track starting row for data (after headers)
//     const dataStartRow = sheet.rowCount + 1;
    
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
            
//             // Store column indices where scores start
//             const questionScoreStartCol = meta.length + 1;
//             const sectionScoreStartCol = questionScoreStartCol + questionHeaders.length;
//             const overallScoreCol = sectionScoreStartCol + sectionHeaders.length;
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
//             }
//             row.push(overall + '%');
            
//             const addedRow = sheet.addRow(row);
            
//             // Apply color coding to question scores
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 const colIndex = questionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perQuestion[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' } // Red background
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' } // Light green
//                         };
//                     }
//                 }
//             }
            
//             // Apply color coding to section average scores
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 const colIndex = sectionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perSection[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' } // Red background
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text, bold
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' } // Light green
//                         };
//                     }
//                 }
//             }
            
//             // Apply color coding to overall score
//             const overallCell = addedRow.getCell(overallScoreCol);
//             if (overall !== undefined) {
//                 overallCell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 if (overall < 80) {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFF0000' } // Red background
//                     };
//                     overallCell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White text, bold
//                 } else {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FF90EE90' } // Light green
//                     };
//                 }
//             }
            
//             // Apply borders to metadata columns
//             for (let i = 1; i <= meta.length; i++) {
//                 const cell = addedRow.getCell(i);
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
//                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
//             }
//         });
//     });
    
//     // Add legend at the bottom
//     sheet.addRow(['']);
//     sheet.addRow(['']);
//     const legendRow1 = sheet.addRow(['Legend:']);
//     legendRow1.font = { bold: true };
    
//     const redLegend = sheet.addRow(['Score < 80%', 'Needs Improvement']);
//     redLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFFF0000' }
//     };
//     redLegend.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
//     const greenLegend = sheet.addRow(['Score ≥ 80%', 'Good Performance']);
//     greenLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF90EE90' }
//     };

//     return workbook;
// }

// module.exports = { generateReport, generateDepartmentReport };


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

//     // Add CGPA Distribution Section
//     facultySheet.addRow(['CGPA Distribution Analysis']);
//     facultySheet.addRow(['']);
    
//     console.log('CGPA Data in report generator:', {
//         hasCgpaSummary: !!analysisData.cgpaSummary,
//         hasCategories: !!analysisData.cgpaSummary?.categories,
//         hasCgpaAnalysis: !!analysisData.cgpa_analysis,
//         rawData: analysisData.cgpaSummary
//     });
    
//     // Add CGPA headers with formatting
//     const cgpaHeaders = facultySheet.addRow(['CGPA Range', 'Count', 'Percentage', 'Negative Comments']);
//     cgpaHeaders.eachCell(cell => {
//         cell.font = { bold: true };
//         cell.fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FFE6E6FA' }
//         };
//         cell.border = {
//             top: { style: 'thin' },
//             left: { style: 'thin' },
//             bottom: { style: 'thin' },
//             right: { style: 'thin' }
//         };
//         cell.alignment = { horizontal: 'center' };
//     });

//     // Get CGPA data from analysis
//     const cgpaCategories = analysisData.cgpaSummary?.categories || [
//         { range: 'Below 6.0', count: 0, percentage: '0%', negativeComments: 0 },
//         { range: '6.1 - 8.0', count: 0, percentage: '0%', negativeComments: 0 },
//         { range: 'Above 8.0', count: 0, percentage: '0%', negativeComments: 0 }
//     ];

//     // Add CGPA data rows
//     cgpaCategories.forEach(category => {
//         const row = facultySheet.addRow([
//             category.range,
//             category.count,
//             category.percentage,
//             category.negativeComments
//         ]);

//         row.eachCell(cell => {
//             cell.border = {
//                 top: { style: 'thin' },
//                 left: { style: 'thin' },
//                 bottom: { style: 'thin' },
//                 right: { style: 'thin' }
//             };
//             cell.alignment = { horizontal: 'center' };
//         });
//         row.getCell(1).alignment = { horizontal: 'left' };
//     });

//     facultySheet.addRow(['']);

//     // Format Faculty Details
//     facultySheet.getCell('A1').font = { size: 16, bold: true };
//     facultySheet.getColumn('A').width = 20;
//     facultySheet.getColumn('B').width = 40;

//     // Add CGPA-wise Detailed Analysis Sheets
//     if (analysisData.cgpa_analysis) {
//         const cgpaLabels = {
//             '1': 'Below 6.0',
//             '2': '6.1 - 8.0',
//             '3': 'Above 8.0'
//         };

//         Object.entries(analysisData.cgpa_analysis).forEach(([cgpaKey, cgpaData]) => {
//             const cgpaLabel = cgpaLabels[cgpaKey] || `CGPA ${cgpaKey}`;
//             const cgpaSheet = workbook.addWorksheet(`CGPA ${cgpaLabel}`);

//             // Add header
//             cgpaSheet.addRow([`CGPA Range: ${cgpaLabel} - Detailed Analysis`]);
//             cgpaSheet.addRow(['']);
//             cgpaSheet.addRow(['Total Responses in this CGPA Range:', cgpaData.total_responses]);
//             cgpaSheet.addRow(['']);

//             cgpaSheet.getCell('A1').font = { size: 14, bold: true };
//             cgpaSheet.getColumn('A').width = 25;
//             cgpaSheet.getColumn('B').width = 50;

//             // Add section-wise analysis for this CGPA range
//             Object.entries(cgpaData.analysis || {}).forEach(([sectionKey, section]) => {
//                 cgpaSheet.addRow([section.section_name || sectionKey]);
//                 cgpaSheet.getRow(cgpaSheet.rowCount).font = { bold: true, size: 12 };
//                 cgpaSheet.addRow(['']);

//                 // Add question headers
//                 cgpaSheet.addRow(['Question', 'Option', 'Count', 'Percentage']);
//                 const headerRow = cgpaSheet.getRow(cgpaSheet.rowCount);
//                 headerRow.font = { bold: true };
//                 headerRow.fill = {
//                     type: 'pattern',
//                     pattern: 'solid',
//                     fgColor: { argb: 'FFE6E6FA' }
//                 };

//                 // Add questions
//                 Object.values(section.questions || {}).forEach(question => {
//                     let firstOption = true;
//                     question.options.sort((a, b) => b.count - a.count).forEach(option => {
//                         cgpaSheet.addRow([
//                             firstOption ? question.question : '',
//                             option.text,
//                             option.count,
//                             option.percentage + '%'
//                         ]);
//                         firstOption = false;
//                     });
//                     cgpaSheet.addRow(['']);
//                 });

//                 cgpaSheet.addRow(['']);
//             });

//             // Format columns
//             cgpaSheet.getColumn('C').width = 15;
//             cgpaSheet.getColumn('D').width = 15;
//         });
//     }

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

//     // Add CGPA Comparison Sheet
//     if (analysisData.cgpa_analysis) {
//         const comparisonSheet = workbook.addWorksheet('CGPA Comparison');
        
//         comparisonSheet.addRow(['CGPA-wise Performance Comparison']);
//         comparisonSheet.addRow(['']);
        
//         const cgpaLabels = {
//             '1': 'Below 6.0',
//             '2': '6.1 - 8.0',
//             '3': 'Above 8.0'
//         };

//         // Create comparison table
//         comparisonSheet.addRow(['Section', 'Below 6.0 (%)', '6.1 - 8.0 (%)', 'Above 8.0 (%)', 'Overall (%)']);
//         const headerRow = comparisonSheet.getRow(3);
//         headerRow.font = { bold: true };
//         headerRow.fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FF4F81BD' }
//         };
//         headerRow.font.color = { argb: 'FFFFFFFF' };

//         // Calculate scores for each CGPA range and section
//         const sectionScores = {};
        
//         Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
//             const sectionName = section.section_name || sectionKey;
//             sectionScores[sectionName] = { overall: 0 };
            
//             // Calculate overall score
//             let totalScore = 0;
//             let questionCount = 0;
//             Object.values(section.questions || {}).forEach(question => {
//                 let weightedSum = 0;
//                 let totalResponses = 0;
//                 question.options.forEach(option => {
//                     const value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                     weightedSum += option.count * value;
//                     totalResponses += option.count;
//                 });
//                 const maxScore = totalResponses * 2;
//                 const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
//                 totalScore += qScore;
//                 questionCount++;
//             });
//             sectionScores[sectionName].overall = questionCount > 0 ? Math.round(totalScore / questionCount) : 0;
//         });

//         // Calculate CGPA-specific scores
//         ['1', '2', '3'].forEach(cgpaKey => {
//             const cgpaData = analysisData.cgpa_analysis[cgpaKey];
//             if (cgpaData && cgpaData.analysis) {
//                 Object.entries(cgpaData.analysis).forEach(([sectionKey, section]) => {
//                     const sectionName = section.section_name || sectionKey;
//                     if (!sectionScores[sectionName]) {
//                         sectionScores[sectionName] = {};
//                     }
                    
//                     let totalScore = 0;
//                     let questionCount = 0;
//                     Object.values(section.questions || {}).forEach(question => {
//                         let weightedSum = 0;
//                         let totalResponses = 0;
//                         question.options.forEach(option => {
//                             const value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                             weightedSum += option.count * value;
//                             totalResponses += option.count;
//                         });
//                         const maxScore = totalResponses * 2;
//                         const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
//                         totalScore += qScore;
//                         questionCount++;
//                     });
//                     sectionScores[sectionName][cgpaKey] = questionCount > 0 ? Math.round(totalScore / questionCount) : 0;
//                 });
//             }
//         });

//         // Add rows for each section
//         Object.entries(sectionScores).forEach(([sectionName, scores]) => {
//             const row = comparisonSheet.addRow([
//                 sectionName,
//                 scores['1'] !== undefined ? scores['1'] : '-',
//                 scores['2'] !== undefined ? scores['2'] : '-',
//                 scores['3'] !== undefined ? scores['3'] : '-',
//                 scores.overall
//             ]);

//             // Apply color coding
//             for (let i = 2; i <= 5; i++) {
//                 const cell = row.getCell(i);
//                 const value = cell.value;
//                 const score = typeof value === 'number' ? value : 0;
                
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 if (score !== 0 && value !== '-') {
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' }
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' }
//                         };
//                     }
//                 }
//             }
//         });

//         comparisonSheet.getColumn('A').width = 30;
//         comparisonSheet.getColumn('B').width = 15;
//         comparisonSheet.getColumn('C').width = 15;
//         comparisonSheet.getColumn('D').width = 15;
//         comparisonSheet.getColumn('E').width = 15;
        
//         comparisonSheet.getCell('A1').font = { size: 14, bold: true };
//     }

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
//                     value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                 } else {
//                     value = option.label === 'C' ? 2 : option.label === 'B' ? 1 : 0;
//                 }
//                 weightedSum += option.count * value;
//                 totalResponses += option.count;
//             });
            
//             const maxPossibleScore = totalResponses * 2;
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
//                 const mappedValue = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
//                 weightedSum += option.count * mappedValue;
//             });
//             const questionScore = (weightedSum / (totalResponses * 2)) * 100;

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
//         Object.values(first.analysis).forEach(section => {
//             Object.values(section.questions || {}).forEach(q => {
//                 questionHeaders.push(q.question);
//             });
//         });

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
//                     const mapped = o.value === 1 ? 0 : o.value === 2 ? 1 : o.value === 3 ? 2 : o.value;
//                     weightedSum += o.count * mapped;
//                     totalResponses += o.count;
//                 });
//                 const maxScore = totalResponses * 2;
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

//     const dataStartRow = sheet.rowCount + 1;
    
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
            
//             const questionScoreStartCol = meta.length + 1;
//             const sectionScoreStartCol = questionScoreStartCol + questionHeaders.length;
//             const overallScoreCol = sectionScoreStartCol + sectionHeaders.length;
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
//             }
//             row.push(overall + '%');
            
//             const addedRow = sheet.addRow(row);
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 const colIndex = questionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perQuestion[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' }
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' }
//                         };
//                     }
//                 }
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 const colIndex = sectionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perSection[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' }
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' }
//                         };
//                     }
//                 }
//             }
            
//             const overallCell = addedRow.getCell(overallScoreCol);
//             if (overall !== undefined) {
//                 overallCell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 if (overall < 80) {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFF0000' }
//                     };
//                     overallCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                 } else {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FF90EE90' }
//                     };
//                 }
//             }
            
//             for (let i = 1; i <= meta.length; i++) {
//                 const cell = addedRow.getCell(i);
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
//                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
//             }
//         });
//     });
    
//     sheet.addRow(['']);
//     sheet.addRow(['']);
//     const legendRow1 = sheet.addRow(['Legend:']);
//     legendRow1.font = { bold: true };
    
//     const redLegend = sheet.addRow(['Score < 80%', 'Needs Improvement']);
//     redLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFFF0000' }
//     };
//     redLegend.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
//     const greenLegend = sheet.addRow(['Score ≥ 80%', 'Good Performance']);
//     greenLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF90EE90' }
//     };

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

    // Add CGPA Distribution Section
    facultySheet.addRow(['CGPA Distribution Analysis']);
    facultySheet.addRow(['']);
    
    console.log('CGPA Data in report generator:', {
        hasCgpaSummary: !!analysisData.cgpaSummary,
        hasCategories: !!analysisData.cgpaSummary?.categories,
        hasCgpaAnalysis: !!analysisData.cgpa_analysis,
        hasCgpaSummaryFromAnalysis: !!analysisData.cgpa_summary,
        rawData: analysisData.cgpaSummary || analysisData.cgpa_summary
    });
    
    // Add CGPA headers with formatting
    const cgpaHeaders = facultySheet.addRow(['CGPA Range', 'Count', 'Percentage', 'Negative Comments']);
    cgpaHeaders.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center' };
    });

    // Get CGPA data - try multiple possible sources
    let cgpaCategories;
    
    if (analysisData.cgpaSummary?.categories) {
        cgpaCategories = analysisData.cgpaSummary.categories;
    } else if (analysisData.cgpa_summary) {
        // Build categories from cgpa_summary object
        const summary = analysisData.cgpa_summary;
        cgpaCategories = [
            {
                range: summary.labels?.['1'] || 'Below 6.0',
                count: summary.counts?.['1'] || 0,
                percentage: summary.percentages?.['1'] ? `${summary.percentages['1']}%` : '0%',
                negativeComments: 0
            },
            {
                range: summary.labels?.['2'] || '6.1 - 8.0',
                count: summary.counts?.['2'] || 0,
                percentage: summary.percentages?.['2'] ? `${summary.percentages['2']}%` : '0%',
                negativeComments: 0
            },
            {
                range: summary.labels?.['3'] || 'Above 8.0',
                count: summary.counts?.['3'] || 0,
                percentage: summary.percentages?.['3'] ? `${summary.percentages['3']}%` : '0%',
                negativeComments: 0
            }
        ];
    } else if (analysisData.cgpa_analysis) {
        // Build from cgpa_analysis data
        cgpaCategories = [
            {
                range: 'Below 6.0',
                count: analysisData.cgpa_analysis['1']?.total_responses || 0,
                percentage: '0%',
                negativeComments: 0
            },
            {
                range: '6.1 - 8.0',
                count: analysisData.cgpa_analysis['2']?.total_responses || 0,
                percentage: '0%',
                negativeComments: 0
            },
            {
                range: 'Above 8.0',
                count: analysisData.cgpa_analysis['3']?.total_responses || 0,
                percentage: '0%',
                negativeComments: 0
            }
        ];
        
        // Calculate percentages
        const totalCount = cgpaCategories.reduce((sum, cat) => sum + cat.count, 0);
        if (totalCount > 0) {
            cgpaCategories.forEach(cat => {
                cat.percentage = `${Math.round((cat.count / totalCount) * 100)}%`;
            });
        }
    } else {
        // Default empty data
        cgpaCategories = [
            { range: 'Below 6.0', count: 0, percentage: '0%', negativeComments: 0 },
            { range: '6.1 - 8.0', count: 0, percentage: '0%', negativeComments: 0 },
            { range: 'Above 8.0', count: 0, percentage: '0%', negativeComments: 0 }
        ];
    }

    console.log('Final CGPA categories:', cgpaCategories);

    // Add CGPA data rows
    cgpaCategories.forEach(category => {
        const row = facultySheet.addRow([
            category.range,
            category.count,
            category.percentage,
            category.negativeComments
        ]);

        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center' };
        });
        row.getCell(1).alignment = { horizontal: 'left' };
    });

    facultySheet.addRow(['']);

    // Format Faculty Details
    facultySheet.getCell('A1').font = { size: 16, bold: true };
    facultySheet.getColumn('A').width = 20;
    facultySheet.getColumn('B').width = 40;

    // Add CGPA-wise Detailed Analysis Sheets
    if (analysisData.cgpa_analysis) {
        const cgpaLabels = {
            '1': 'Below 6.0',
            '2': '6.1 - 8.0',
            '3': 'Above 8.0'
        };

        Object.entries(analysisData.cgpa_analysis).forEach(([cgpaKey, cgpaData]) => {
            const cgpaLabel = cgpaLabels[cgpaKey] || `CGPA ${cgpaKey}`;
            const cgpaSheet = workbook.addWorksheet(`CGPA ${cgpaLabel}`);

            // Add header
            cgpaSheet.addRow([`CGPA Range: ${cgpaLabel} - Detailed Analysis`]);
            cgpaSheet.addRow(['']);
            cgpaSheet.addRow(['Total Responses in this CGPA Range:', cgpaData.total_responses]);
            cgpaSheet.addRow(['']);

            cgpaSheet.getCell('A1').font = { size: 14, bold: true };
            cgpaSheet.getColumn('A').width = 25;
            cgpaSheet.getColumn('B').width = 50;

            // Add section-wise analysis for this CGPA range
            Object.entries(cgpaData.analysis || {}).forEach(([sectionKey, section]) => {
                cgpaSheet.addRow([section.section_name || sectionKey]);
                cgpaSheet.getRow(cgpaSheet.rowCount).font = { bold: true, size: 12 };
                cgpaSheet.addRow(['']);

                // Add question headers
                cgpaSheet.addRow(['Question', 'Option', 'Count', 'Percentage']);
                const headerRow = cgpaSheet.getRow(cgpaSheet.rowCount);
                headerRow.font = { bold: true };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6E6FA' }
                };

                // Add questions
                Object.values(section.questions || {}).forEach(question => {
                    let firstOption = true;
                    question.options.sort((a, b) => b.count - a.count).forEach(option => {
                        cgpaSheet.addRow([
                            firstOption ? question.question : '',
                            option.text,
                            option.count,
                            option.percentage + '%'
                        ]);
                        firstOption = false;
                    });
                    cgpaSheet.addRow(['']);
                });

                cgpaSheet.addRow(['']);
            });

            // Format columns
            cgpaSheet.getColumn('C').width = 15;
            cgpaSheet.getColumn('D').width = 15;
        });
    }

    // Add section-wise sheets with detailed question analysis
    Object.entries(analysisData.analysis || {}).forEach(([sectionKey, section]) => {
        const shortSectionName = section.section_name?.length > 25 ? 
            section.section_name.substring(0, 25) : (section.section_name || sectionKey);
        const sectionSheet = workbook.addWorksheet(`${shortSectionName}`);

        sectionSheet.addRow([`${section.section_name || sectionKey} - Detailed Analysis`]);
        sectionSheet.addRow(['']);

        // Add headers
        sectionSheet.addRow([
            'Question No.',
            'Question',
            'Question Score (%)',
            'Option',
            'Response Count',
            'Option %',
            'Option Value'
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
                    firstOption ? questionNumber : '',                    // Question number
                    firstOption ? question.question : '',                 // Question text
                    firstOption ? question.score + '%' : '',             // Question score (0-1-2 based)
                    option.text,                                         // Option text
                    option.count,                                        // Response count
                    option.percentage || Math.round(percentage),         // Option percentage
                    option.value || option.label                        // Option value
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

    // Add CGPA Comparison Sheet
    if (analysisData.cgpa_analysis) {
        const comparisonSheet = workbook.addWorksheet('CGPA Comparison');
        
        comparisonSheet.addRow(['CGPA-wise Performance Comparison']);
        comparisonSheet.addRow(['']);
        
        const cgpaLabels = {
            '1': 'Below 6.0',
            '2': '6.1 - 8.0',
            '3': 'Above 8.0'
        };

        // Create comparison table
        comparisonSheet.addRow(['Section', 'Below 6.0 (%)', '6.1 - 8.0 (%)', 'Above 8.0 (%)', 'Overall (%)']);
        const headerRow = comparisonSheet.getRow(3);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F81BD' }
        };
        headerRow.font.color = { argb: 'FFFFFFFF' };

        // Calculate scores for each CGPA range and section
        const sectionScores = {};
        
        Object.entries(analysisData.analysis).forEach(([sectionKey, section]) => {
            const sectionName = section.section_name || sectionKey;
            sectionScores[sectionName] = { overall: 0 };
            
            // Calculate overall score
            let totalScore = 0;
            let questionCount = 0;
            Object.values(section.questions || {}).forEach(question => {
                let weightedSum = 0;
                let totalResponses = 0;
                question.options.forEach(option => {
                    const value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
                    weightedSum += option.count * value;
                    totalResponses += option.count;
                });
                const maxScore = totalResponses * 2;
                const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
                totalScore += qScore;
                questionCount++;
            });
            sectionScores[sectionName].overall = questionCount > 0 ? Math.round(totalScore / questionCount) : 0;
        });

        // Calculate CGPA-specific scores
        ['1', '2', '3'].forEach(cgpaKey => {
            const cgpaData = analysisData.cgpa_analysis[cgpaKey];
            if (cgpaData && cgpaData.analysis) {
                Object.entries(cgpaData.analysis).forEach(([sectionKey, section]) => {
                    const sectionName = section.section_name || sectionKey;
                    if (!sectionScores[sectionName]) {
                        sectionScores[sectionName] = {};
                    }
                    
                    let totalScore = 0;
                    let questionCount = 0;
                    Object.values(section.questions || {}).forEach(question => {
                        let weightedSum = 0;
                        let totalResponses = 0;
                        question.options.forEach(option => {
                            const value = option.value === 1 ? 0 : option.value === 2 ? 1 : option.value === 3 ? 2 : option.value;
                            weightedSum += option.count * value;
                            totalResponses += option.count;
                        });
                        const maxScore = totalResponses * 2;
                        const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
                        totalScore += qScore;
                        questionCount++;
                    });
                    sectionScores[sectionName][cgpaKey] = questionCount > 0 ? Math.round(totalScore / questionCount) : 0;
                });
            }
        });

        // Add rows for each section
        Object.entries(sectionScores).forEach(([sectionName, scores]) => {
            const row = comparisonSheet.addRow([
                sectionName,
                scores['1'] !== undefined ? scores['1'] : '-',
                scores['2'] !== undefined ? scores['2'] : '-',
                scores['3'] !== undefined ? scores['3'] : '-',
                scores.overall
            ]);

            // Apply color coding
            for (let i = 2; i <= 5; i++) {
                const cell = row.getCell(i);
                const value = cell.value;
                const score = typeof value === 'number' ? value : 0;
                
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (score !== 0 && value !== '-') {
                    if (score < 80) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF0000' }
                        };
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                    } else {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF90EE90' }
                        };
                    }
                }
            }
        });

        comparisonSheet.getColumn('A').width = 30;
        comparisonSheet.getColumn('B').width = 15;
        comparisonSheet.getColumn('C').width = 15;
        comparisonSheet.getColumn('D').width = 15;
        comparisonSheet.getColumn('E').width = 15;
        
        comparisonSheet.getCell('A1').font = { size: 14, bold: true };
    }

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
//         Object.values(first.analysis).forEach(section => {
//             Object.values(section.questions || {}).forEach(q => {
//                 questionHeaders.push(q.question);
//             });
//         });

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
//                     const mapped = o.value === 1 ? 0 : o.value === 2 ? 1 : o.value === 3 ? 2 : o.value;
//                     weightedSum += o.count * mapped;
//                     totalResponses += o.count;
//                 });
//                 const maxScore = totalResponses * 2;
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

//     const dataStartRow = sheet.rowCount + 1;
    
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
            
//             const questionScoreStartCol = meta.length + 1;
//             const sectionScoreStartCol = questionScoreStartCol + questionHeaders.length;
//             const overallScoreCol = sectionScoreStartCol + sectionHeaders.length;
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
//             }
//             row.push(overall + '%');
            
//             const addedRow = sheet.addRow(row);
            
//             for (let i = 0; i < questionHeaders.length; i++) {
//                 const colIndex = questionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perQuestion[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' }
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' }
//                         };
//                     }
//                 }
//             }
            
//             for (let i = 0; i < sectionHeaders.length; i++) {
//                 const colIndex = sectionScoreStartCol + i;
//                 const cell = addedRow.getCell(colIndex);
//                 const score = perSection[i];
                
//                 if (score !== undefined) {
//                     cell.border = {
//                         top: { style: 'thin' },
//                         left: { style: 'thin' },
//                         bottom: { style: 'thin' },
//                         right: { style: 'thin' }
//                     };
                    
//                     if (score < 80) {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FFFF0000' }
//                         };
//                         cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                     } else {
//                         cell.fill = {
//                             type: 'pattern',
//                             pattern: 'solid',
//                             fgColor: { argb: 'FF90EE90' }
//                         };
//                     }
//                 }
//             }
            
//             const overallCell = addedRow.getCell(overallScoreCol);
//             if (overall !== undefined) {
//                 overallCell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 if (overall < 80) {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFFF0000' }
//                     };
//                     overallCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
//                 } else {
//                     overallCell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FF90EE90' }
//                     };
//                 }
//             }
            
//             for (let i = 1; i <= meta.length; i++) {
//                 const cell = addedRow.getCell(i);
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
//                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
//             }
//         });
//     });
    
//     sheet.addRow(['']);
//     sheet.addRow(['']);
//     const legendRow1 = sheet.addRow(['Legend:']);
//     legendRow1.font = { bold: true };
    
//     const redLegend = sheet.addRow(['Score < 80%', 'Needs Improvement']);
//     redLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFFF0000' }
//     };
//     redLegend.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
//     const greenLegend = sheet.addRow(['Score ≥ 80%', 'Good Performance']);
//     greenLegend.getCell(1).fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF90EE90' }
//     };

//     return workbook;
// }

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
    'Course_Code', 'Course_Name', 'Batch', 'Staff_id', 'Faculty_Name'
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
        Object.values(first.analysis).forEach(section => {
            Object.values(section.questions || {}).forEach(q => {
                questionHeaders.push(q.question);
            });
        });

        Object.entries(first.analysis).forEach(([key, section]) => {
            sectionHeaders.push(`${section.section_name || key} Avg`);
        });
    }

    const scoreHeaders = ['Average'];

    sheet.addRow([...courseDetailHeaders, ...questionHeaders, ...sectionHeaders, ...scoreHeaders]);
    sheet.getRow(sheet.rowCount).font = { bold: true };

    const widths = [10, 12, 10, 12, 12, 14, 30, 10, 14, 22, 18];
    for (let i = 0; i < widths.length; i++) {
        sheet.getColumn(i + 1).width = widths[i];
    }

    // FIXED: Compute proper weighted scores for all three options
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
                
                // Calculate weighted score using 0-1-2 scale for all three options
                (q.options || []).forEach(o => {
                    // Map option values: 1->0, 2->1, 3->2
                    const mapped = o.value === 1 ? 0 : o.value === 2 ? 1 : o.value === 3 ? 2 : o.value;
                    weightedSum += o.count * mapped;
                    totalResponses += o.count;
                });
                
                // Calculate question score as percentage (0-100%)
                const maxScore = totalResponses * 2; // Maximum possible score (all responses = 2)
                const qScore = maxScore > 0 ? (weightedSum / maxScore) * 100 : 0;
                
                // Store rounded question score
                const questionScore = Math.round(qScore);
                perQuestion.push(questionScore);
                
                // Add to section total
                sectionScore += qScore;
                qCount++;
            });
            
            // Calculate section average
            const avgSection = qCount > 0 ? sectionScore / qCount : 0;
            sectionSum += avgSection;
            sectionCount++;
            perSection.push(Math.round(avgSection));
        });
        
        // Calculate overall average across all sections
        const overall = sectionCount > 0 ? Math.round(sectionSum / sectionCount) : 0;
        return { overall, perQuestion, perSection };
    };

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
                f.analysisData?.batch || '',
                f.staff_id || '',
                f.faculty_name || '',
                
            ];
            const { overall, perQuestion, perSection } = computeOverall(f.analysisData);
            const row = [...meta];
            
            const questionScoreStartCol = meta.length + 1;
            const sectionScoreStartCol = questionScoreStartCol + questionHeaders.length;
            const overallScoreCol = sectionScoreStartCol + sectionHeaders.length;
            
            // Add question scores (now properly calculated with all options)
            for (let i = 0; i < questionHeaders.length; i++) {
                row.push(perQuestion[i] !== undefined ? perQuestion[i] + '%' : '');
            }
            
            // Add section scores
            for (let i = 0; i < sectionHeaders.length; i++) {
                row.push(perSection[i] !== undefined ? perSection[i] + '%' : '');
            }
            
            // Add overall score
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