const { getDistinctCourses, getFacultyByFilters } = require('./analysis_backend');
const { getFeedbackAnalysis } = require('./performance_analysis');

// Get visualization data for department report
// Similar to report generation but returns data for visualization instead of Excel/PDF
const getDepartmentVisualizationData = async (degree, dept) => {
    try {
        console.log(`\n=== Generating Department Visualization Data ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Staff Dept: ${dept}`);

        if (!degree || !dept) {
            return {
                success: false,
                error: 'Missing required fields: degree, dept'
            };
        }

        // Get all courses from course_allocation for the filters (degree + staff_dept)
        const courses = await getDistinctCourses(degree, dept);
        if (!courses || courses.length === 0) {
            return {
                success: false,
                error: 'No courses found for selected filters'
            };
        }

        console.log(`Found ${courses.length} courses for degree: ${degree}, staff_dept: ${dept}`);

        // Aggregate analyses per course per faculty
        const groupedData = [];
        
        for (const course of courses) {
            const code = course.code ? course.code : course;
            const name = course.name || '';
            
            console.log(`\nProcessing course: ${code}`);
            
            // Get faculty from course_feedback table (same as faculty cards)
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
                    const analysis = await getFeedbackAnalysis('', dept || '', '', code, staffId);

                    if (analysis && analysis.success) {
                        // Calculate overall score
                        const overallScore = calculateOverallScore(analysis.analysis);
                        
                        return {
                            // Faculty identification
                            faculty_name: f.faculty_name || analysis.faculty_name || '',
                            staffid: staffId,
                            staff_id: f.staff_id || analysis.staff_id || '',
                            
                            // Course information
                            course_code: code,
                            course_name: name || analysis.course_name || '',
                            
                            // Additional faculty details from analysis
                            ug_or_pg: analysis.ug_or_pg || '',
                            arts_or_engg: analysis.arts_or_engg || '',
                            short_form: analysis.short_form || '',
                            sec: analysis.sec || '',
                            
                            // Performance metrics
                            total_responses: analysis.total_responses,
                            overall_score: overallScore,
                            section_scores: calculateSectionScores(analysis.analysis),
                            cgpa_breakdown: analysis.cgpa_summary || null
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
                    course_name: name,
                    faculties: facultyAnalyses
                });
                console.log(`✓ Added ${facultyAnalyses.length} faculty analyses for course: ${code}`);
            }
        }

        if (groupedData.length === 0) {
            return {
                success: false,
                error: 'No analysis data available for selected filters'
            };
        }

        console.log(`\n=== Visualization Data Summary ===`);
        console.log(`Total courses with data: ${groupedData.length}`);
        console.log(`Total faculty analyzed: ${groupedData.reduce((sum, c) => sum + c.faculties.length, 0)}`);

        return {
            success: true,
            degree,
            department: dept,
            courses: groupedData,
            summary: {
                total_courses: groupedData.length,
                total_faculty: groupedData.reduce((sum, c) => sum + c.faculties.length, 0),
                total_responses: groupedData.reduce((sum, c) => 
                    sum + c.faculties.reduce((s, f) => s + (f.total_responses || 0), 0), 0
                )
            }
        };
    } catch (error) {
        console.error('Error generating visualization data:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Calculate overall score from analysis
const calculateOverallScore = (analysis) => {
    if (!analysis) return 0;
    
    const EXCLUDED_SECTIONS = new Set([
        'COURSE CONTENT AND STRUCTURE',
        'STUDENT-CENTRIC FACTORS'
    ]);

    let sectionSum = 0;
    let sectionCount = 0;
    
    Object.entries(analysis).forEach(([sectionKey, section]) => {
        const sectionName = (section?.section_name || sectionKey || '').toString().trim().toUpperCase();
        if (EXCLUDED_SECTIONS.has(sectionName)) {
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

// Calculate section-wise scores
const calculateSectionScores = (analysis) => {
    if (!analysis) return {};
    
    const EXCLUDED_SECTIONS = new Set([
        'COURSE CONTENT AND STRUCTURE',
        'STUDENT-CENTRIC FACTORS'
    ]);

    const sectionScores = {};
    
    Object.entries(analysis).forEach(([sectionKey, section]) => {
        const sectionName = (section?.section_name || sectionKey || '').toString().trim().toUpperCase();
        if (EXCLUDED_SECTIONS.has(sectionName)) {
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
            const avgScore = sectionScore / questionCount;
            sectionScores[section.section_name || sectionKey] = Math.round(avgScore);
        }
    });
    
    return sectionScores;
};

module.exports = {
    getDepartmentVisualizationData
};

