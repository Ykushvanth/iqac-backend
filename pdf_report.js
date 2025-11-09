const PDFDocument = require('pdfkit');
const https = require('https');

function fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Image fetch failed: ${res.statusCode}`));
            }
            const parts = [];
            res.on('data', (chunk) => parts.push(chunk));
            res.on('end', () => resolve(Buffer.concat(parts)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Generate a Department PDF matching the provided sample format
async function generateDepartmentPdf(data) {
    return new Promise(async (resolve, reject) => {
        let doc;
        try {
            doc = new PDFDocument({ 
                margin: 50, 
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });
            
            const chunks = [];
            
            doc.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            doc.on('end', () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    if (buffer.length === 0) {
                        reject(new Error('Generated PDF buffer is empty'));
                    } else {
                        console.log('PDF buffer created successfully, size:', buffer.length);
                        resolve(buffer);
                    }
                } catch (e) {
                    reject(new Error('Failed to create PDF buffer: ' + e.message));
                }
            });
            
            doc.on('error', (err) => {
                console.error('PDFDocument error:', err);
                reject(err);
            });

            let cursorY = 30;

            // Try to render the official logo banner at the top (optional)
            try {
                const logoUrl = 'https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png';
                const logoBuffer = await fetchImageBuffer(logoUrl);
                const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                const logoHeight = 110;
                doc.image(logoBuffer, doc.page.margins.left, cursorY, {
                    fit: [usableWidth, logoHeight],
                    align: 'center'
                });
                cursorY += logoHeight + 8;
            } catch (logoError) {
                console.warn('Logo fetch failed, continuing without header image:', logoError.message);
                cursorY += 10;
            }

            // Title block - "Office of IQAC"
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Office of IQAC', doc.page.margins.left, cursorY, { 
                   width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                   align: 'center' 
               });
            
            cursorY = doc.y + 10;
            
            // Main title with suffix
            const titleSuffix = data.titleSuffix || 'A 2024-25 (Odd Semester)';
            const title = `Students Feedback Analysis Report-${titleSuffix}`;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(title, doc.page.margins.left, cursorY, { 
                   width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                   align: 'center' 
               });
            
            cursorY = doc.y + 15;

            const xLeft = 50;
            const labelFont = 'Helvetica-Bold';
            const valueFont = 'Helvetica';

            // Department line
            doc.fontSize(11).font(labelFont);
            const deptText = 'Department: ';
            doc.text(deptText, xLeft, cursorY, { continued: true })
               .font(valueFont)
               .text(data.department || '');
            
            cursorY = doc.y + 8;

            // Academic Year and Semester on same line
            doc.font(labelFont);
            doc.text('Academic Year: ', xLeft, cursorY, { continued: true })
               .font(valueFont)
               .text(data.academicYear || '', { continued: false });
            
            const semX = 330;
            doc.font(labelFont)
               .text('Semester: ', semX, cursorY, { continued: true })
               .font(valueFont)
               .text(data.semester || '');

            cursorY = doc.y + 12;

            // Observations intro
            doc.font('Helvetica')
               .fontSize(11)
               .text(
                   'The feedback analysis on Teaching – Learning process has been conducted and the following observations are made:',
                   xLeft,
                   cursorY,
                   { width: 495 }
               );
            
            cursorY = doc.y + 6;
            
            const obs = Array.isArray(data.observations) ? data.observations : [];
            if (obs.length > 0) {
                const olX = xLeft + 15;
                obs.forEach((item, idx) => {
                    doc.text(`${idx + 1}. ${item}`, olX, cursorY, { width: 480 });
                    cursorY = doc.y + 4;
                });
            }

            // Table
            cursorY += 8;
            const tableX = doc.page.margins.left;
            const cellPadding = 6;
            const columns = [
                { key: 'sNo', title: 'S.No', width: 40, align: 'center' },
                { key: 'course', title: 'Course Name/Code', width: 230, align: 'left' },
                { key: 'faculty', title: 'Faculty Name', width: 190, align: 'left' },
                { key: 'percentage', title: 'Percentage', width: 65, align: 'center' }
            ];

            const tableStartY = cursorY;

            const getCellText = (row, col, rowIndex, isHeader) => {
                if (isHeader) return col.title;
                if (!row) return '';
                switch (col.key) {
                    case 'sNo':
                        return String(rowIndex + 1);
                    case 'course':
                        return row.course || '';
                    case 'faculty':
                        return row.faculty || '';
                    case 'percentage':
                        if (row.percentage === undefined || row.percentage === null || row.percentage === '') {
                            return '';
                        }
                        return /%$/.test(String(row.percentage))
                            ? String(row.percentage)
                            : `${row.percentage}%`;
                    default:
                        return '';
                }
            };

            const calculateRowHeight = (row, rowIndex, isHeader = false) => {
                const fontName = isHeader ? 'Helvetica-Bold' : 'Helvetica';
                const fontSize = isHeader ? 10 : 9;
                doc.font(fontName).fontSize(fontSize);
                const baseline = doc.currentLineHeight();
                const heights = columns.map(col => {
                    const text = getCellText(row, col, rowIndex, isHeader);
                    const textHeight = doc.heightOfString(text || '', {
                        width: col.width - cellPadding * 2,
                        align: isHeader ? 'center' : (col.align || 'left')
                    });
                    return Math.max(textHeight, baseline);
                });
                return Math.max(...heights) + cellPadding * 2;
            };

            const drawTableRow = (row, rowIndex, y, isHeader = false) => {
                const fontName = isHeader ? 'Helvetica-Bold' : 'Helvetica';
                const fontSize = isHeader ? 10 : 9;
                doc.font(fontName).fontSize(fontSize);
                const rowHeight = calculateRowHeight(row, rowIndex, isHeader);
                let x = tableX;
                columns.forEach(col => {
                    const text = getCellText(row, col, rowIndex, isHeader);
                    doc.rect(x, y, col.width, rowHeight).stroke();
                    const align = isHeader ? 'center' : (col.align || 'left');
                    const previousY = doc.y;
                    doc.text(text, x + cellPadding, y + cellPadding, {
                        width: col.width - cellPadding * 2,
                        align
                    });
                    doc.y = previousY;
                    x += col.width;
                });
                return rowHeight;
            };

            // Filter rows: include only percentage < 80
            const inputRows = Array.isArray(data.rows) ? data.rows : [];
            const rows = inputRows.filter((r) => {
                if (!r) return false;
                const v = r.percentage;
                if (v === undefined || v === null || v === '') return false;
                const n = typeof v === 'string' ? parseFloat(String(v).replace(/%/g, '').trim()) : Number(v);
                return Number.isFinite(n) && n < 80;
            });

            const pageBottom = doc.page.height - doc.page.margins.bottom;
            let currentY = tableStartY;

            const headerHeight = drawTableRow(null, -1, currentY, true);
            currentY += headerHeight;

            const rowData = rows.length > 0 ? rows : [{ course: 'NIL', faculty: '', percentage: '' }];

            rowData.forEach((row, rowIndex) => {
                const calculatedHeight = calculateRowHeight(row, rowIndex, false);
                if (currentY + calculatedHeight > pageBottom) {
                    doc.addPage();
                    currentY = doc.page.margins.top;
                    const newHeaderHeight = drawTableRow(null, -1, currentY, true);
                    currentY += newHeaderHeight;
                }
                const renderedHeight = drawTableRow(row, rowIndex, currentY, false);
                currentY += renderedHeight;
            });

            // Finalize the PDF
            console.log('Finalizing PDF document...');
            doc.end();
            
        } catch (err) {
            console.error('PDF Generation Error:', err);
            if (doc) {
                try {
                    doc.end();
                } catch (e) {
                    console.error('Error ending document:', e);
                }
            }
            reject(err);
        }
    });
}

// Generate school-wise PDF (multiple departments in one PDF)
async function generateSchoolPdf(data) {
    return new Promise(async (resolve, reject) => {
        let doc;
        try {
            doc = new PDFDocument({ 
                margin: 50, 
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });
            
            const chunks = [];
            
            doc.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            doc.on('end', () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    if (buffer.length === 0) {
                        reject(new Error('Generated PDF buffer is empty'));
                    } else {
                        console.log('PDF buffer created successfully, size:', buffer.length);
                        resolve(buffer);
                    }
                } catch (e) {
                    reject(new Error('Failed to create PDF buffer: ' + e.message));
                }
            });
            
            doc.on('error', (err) => {
                console.error('PDFDocument error:', err);
                reject(err);
            });

            // data.departments should be an array of { department, rows, observations, ... }
            const departments = Array.isArray(data.departments) ? data.departments : [];
            
            for (let deptIndex = 0; deptIndex < departments.length; deptIndex++) {
                const deptData = departments[deptIndex];
                
                // Add new page for each department (except first)
                if (deptIndex > 0) {
                    doc.addPage();
                }
                
                let cursorY = 30;

                // Try to render the official logo banner at the top (optional)
                try {
                    const logoUrl = 'https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png';
                    const logoBuffer = await fetchImageBuffer(logoUrl);
                    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                    const logoHeight = 110;
                    doc.image(logoBuffer, doc.page.margins.left, cursorY, {
                        fit: [usableWidth, logoHeight],
                        align: 'center'
                    });
                    cursorY += logoHeight + 8;
                } catch (logoError) {
                    console.warn('Logo fetch failed, continuing without header image:', logoError.message);
                    cursorY += 10;
                }

                // Title block - "Office of IQAC"
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .text('Office of IQAC', doc.page.margins.left, cursorY, { 
                       width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                       align: 'center' 
                   });
                
                cursorY = doc.y + 10;
                
                // Main title with suffix
                const titleSuffix = deptData.titleSuffix || data.titleSuffix || 'A 2024-25 (Odd Semester)';
                const title = `Students Feedback Analysis Report-${titleSuffix}`;
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text(title, doc.page.margins.left, cursorY, { 
                       width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                       align: 'center' 
                   });
                
                cursorY = doc.y + 15;

                const xLeft = 50;
                const labelFont = 'Helvetica-Bold';
                const valueFont = 'Helvetica';

                // School line
                doc.fontSize(11).font(labelFont);
                doc.text('School: ', xLeft, cursorY, { continued: true })
                   .font(valueFont)
                   .text(data.school || '');
                
                cursorY = doc.y + 8;

                // Department line
                doc.font(labelFont);
                const deptText = 'Department: ';
                doc.text(deptText, xLeft, cursorY, { continued: true })
                   .font(valueFont)
                   .text(deptData.department || '');
                
                cursorY = doc.y + 8;

                // Academic Year and Semester on same line
                doc.font(labelFont);
                doc.text('Academic Year: ', xLeft, cursorY, { continued: true })
                   .font(valueFont)
                   .text(deptData.academicYear || data.academicYear || '', { continued: false });
                
                const semX = 330;
                doc.font(labelFont)
                   .text('Semester: ', semX, cursorY, { continued: true })
                   .font(valueFont)
                   .text(deptData.semester || data.semester || '');

                cursorY = doc.y + 12;

                // Observations intro
                doc.font('Helvetica')
                   .fontSize(11)
                   .text(
                       'The feedback analysis on Teaching – Learning process has been conducted and the following observations are made:',
                       xLeft,
                       cursorY,
                       { width: 495 }
                   );
                
                cursorY = doc.y + 6;
                
                const obs = Array.isArray(deptData.observations) ? deptData.observations : [];
                if (obs.length > 0) {
                    const olX = xLeft + 15;
                    obs.forEach((item, idx) => {
                        doc.text(`${idx + 1}. ${item}`, olX, cursorY, { width: 480 });
                        cursorY = doc.y + 4;
                    });
                }

                // Table
                cursorY += 8;
                const tableX = doc.page.margins.left;
                const cellPadding = 6;
                const columns = [
                    { key: 'sNo', title: 'S.No', width: 40, align: 'center' },
                    { key: 'course', title: 'Course Name/Code', width: 230, align: 'left' },
                    { key: 'faculty', title: 'Faculty Name', width: 190, align: 'left' },
                    { key: 'percentage', title: 'Percentage', width: 65, align: 'center' }
                ];

                const tableStartY = cursorY;

                const getCellText = (row, col, rowIndex, isHeader) => {
                    if (isHeader) return col.title;
                    if (!row) return '';
                    switch (col.key) {
                        case 'sNo':
                            return String(rowIndex + 1);
                        case 'course':
                            return row.course || '';
                        case 'faculty':
                            return row.faculty || '';
                        case 'percentage':
                            if (row.percentage === undefined || row.percentage === null || row.percentage === '') {
                                return '';
                            }
                            return /%$/.test(String(row.percentage))
                                ? String(row.percentage)
                                : `${row.percentage}%`;
                        default:
                            return '';
                    }
                };

                const calculateRowHeight = (row, rowIndex, isHeader = false) => {
                    const fontName = isHeader ? 'Helvetica-Bold' : 'Helvetica';
                    const fontSize = isHeader ? 10 : 9;
                    doc.font(fontName).fontSize(fontSize);
                    const baseline = doc.currentLineHeight();
                    const heights = columns.map(col => {
                        const text = getCellText(row, col, rowIndex, isHeader);
                        const textHeight = doc.heightOfString(text || '', {
                            width: col.width - cellPadding * 2,
                            align: isHeader ? 'center' : (col.align || 'left')
                        });
                        return Math.max(textHeight, baseline);
                    });
                    return Math.max(...heights) + cellPadding * 2;
                };

                const drawTableRow = (row, rowIndex, y, isHeader = false) => {
                    const fontName = isHeader ? 'Helvetica-Bold' : 'Helvetica';
                    const fontSize = isHeader ? 10 : 9;
                    doc.font(fontName).fontSize(fontSize);
                    const rowHeight = calculateRowHeight(row, rowIndex, isHeader);
                    let x = tableX;
                    columns.forEach(col => {
                        const text = getCellText(row, col, rowIndex, isHeader);
                        doc.rect(x, y, col.width, rowHeight).stroke();
                        const align = isHeader ? 'center' : (col.align || 'left');
                        const previousY = doc.y;
                        doc.text(text, x + cellPadding, y + cellPadding, {
                            width: col.width - cellPadding * 2,
                            align
                        });
                        doc.y = previousY;
                        x += col.width;
                    });
                    return rowHeight;
                };

                // Filter rows: include only percentage < 80
                const inputRows = Array.isArray(deptData.rows) ? deptData.rows : [];
                const rows = inputRows.filter((r) => {
                    if (!r) return false;
                    const v = r.percentage;
                    if (v === undefined || v === null || v === '') return false;
                    const n = typeof v === 'string' ? parseFloat(String(v).replace(/%/g, '').trim()) : Number(v);
                    return Number.isFinite(n) && n < 80;
                });

                const pageBottom = doc.page.height - doc.page.margins.bottom;
                let currentY = tableStartY;

                const headerHeight = drawTableRow(null, -1, currentY, true);
                currentY += headerHeight;

                const rowData = rows.length > 0 ? rows : [{ course: 'NIL', faculty: '', percentage: '' }];

                rowData.forEach((row, rowIndex) => {
                    const calculatedHeight = calculateRowHeight(row, rowIndex, false);
                    if (currentY + calculatedHeight > pageBottom) {
                        doc.addPage();
                        currentY = doc.page.margins.top;
                        const newHeaderHeight = drawTableRow(null, -1, currentY, true);
                        currentY += newHeaderHeight;
                    }
                    const renderedHeight = drawTableRow(row, rowIndex, currentY, false);
                    currentY += renderedHeight;
                });
            }

            // Finalize the PDF
            console.log('Finalizing PDF document...');
            doc.end();
            
        } catch (err) {
            console.error('PDF Generation Error:', err);
            if (doc) {
                try {
                    doc.end();
                } catch (e) {
                    console.error('Error ending document:', e);
                }
            }
            reject(err);
        }
    });
}

module.exports = { generateDepartmentPdf, generateSchoolPdf };