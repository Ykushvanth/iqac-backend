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

// Get feedback data based on filters
const getFeedbackAnalysis = async (degree, department, batch, courseCode, staffId) => {
    try {
        console.log(`Fetching feedback analysis for degree: ${degree}, department: ${department}, batch: ${batch}, course: ${courseCode}, staffId: ${staffId || 'N/A'}`);

        // Get the feedback data
        let query = supabase
            .from('course_feedback')
            .select('*')
            .eq('degree', degree)
            .eq('dept', department)
            .eq('batch', batch)
            .eq('course_code', courseCode);
            
        // Add staff ID filter if provided
        if (staffId && staffId.trim() !== '') {
            const like = `%${staffId.trim()}%`;
            query = query.or(`staff_id.ilike.${like},staffid.ilike.${like}`);
        }

        const { data: feedbackData, error: feedbackError } = await query;

        if (feedbackError) throw feedbackError;
        
        if (!feedbackData || feedbackData.length === 0) {
            return { success: false, message: 'No feedback data found for the selected filters' };
        }

        // Get all questions with their column names
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*');

        if (questionsError) throw questionsError;

        // Get all question options
        const { data: options, error: optionsError } = await supabase
            .from('question_options')
            .select('*');

        if (optionsError) throw optionsError;

        // Group questions by section type
        const questionsBySection = questions.reduce((acc, question) => {
            if (!acc[question.section_type]) {
                acc[question.section_type] = [];
            }
            acc[question.section_type].push(question);
            return acc;
        }, {});

        // Map options by question ID
        const optionsByQuestionId = options.reduce((acc, option) => {
            if (!acc[option.question_id]) {
                acc[option.question_id] = [];
            }
            acc[option.question_id].push(option);
            return acc;
        }, {});

        // Create a mapping between option labels (A, B, C) and feedback values (1, 2, 3)
        const optionValueMap = {};
        options.forEach(option => {
            const questionId = option.question_id;
            const label = option.option_label;
            
            if (!optionValueMap[questionId]) {
                optionValueMap[questionId] = {};
            }
            
            // Map A->1, B->2, etc. (assuming this is the mapping)
            const value = label.charCodeAt(0) - 64; // A=1, B=2, etc.
            optionValueMap[questionId][value] = {
                label: option.option_label,
                text: option.option_text
            };
        });

        // Analyze the feedback data
        const analysisResults = {};
        
        // Process each section
        Object.keys(questionsBySection).forEach(sectionType => {
            const sectionQuestions = questionsBySection[sectionType];
            const sectionResults = {};
            
            // Process each question in the section
            sectionQuestions.forEach(question => {
                const columnName = question.column_name;
                const questionId = question.id;
                
                // Skip if column doesn't exist in feedback data
                if (!feedbackData[0].hasOwnProperty(columnName)) {
                    return;
                }
                
                // Count responses for each option
                const responses = {};
                let totalResponses = 0;
                
                feedbackData.forEach(feedback => {
                    const value = feedback[columnName];
                    if (value !== null && value !== undefined) {
                        if (!responses[value]) {
                            responses[value] = 0;
                        }
                        responses[value]++;
                        totalResponses++;
                    }
                });
                
                // Calculate percentages and prepare result
                const optionResults = [];
                Object.keys(responses).forEach(value => {
                    const numValue = parseInt(value);
                    const count = responses[value];
                    const percentage = (count / totalResponses) * 100;
                    
                    // Get option text if available
                    let optionText = 'Unknown';
                    let optionLabel = 'Unknown';
                    
                    if (optionValueMap[questionId] && optionValueMap[questionId][numValue]) {
                        optionLabel = optionValueMap[questionId][numValue].label;
                        optionText = optionValueMap[questionId][numValue].text;
                    }
                    
                    optionResults.push({
                        value: numValue,
                        label: optionLabel,
                        text: optionText,
                        count,
                        percentage: parseFloat(percentage.toFixed(2))
                    });
                });
                
                // Sort by value
                optionResults.sort((a, b) => a.value - b.value);
                
                sectionResults[questionId] = {
                    question: question.question,
                    column_name: columnName,
                    total_responses: totalResponses,
                    options: optionResults
                };
            });
            
            analysisResults[sectionType] = {
                section_name: sectionType,
                questions: sectionResults
            };
        });
        
        return {
            success: true,
            course_code: courseCode,
            course_name: feedbackData[0].course_name || '',
            faculty_name: feedbackData[0].faculty_name || '',
            staff_id: feedbackData[0].staff_id || feedbackData[0].staffid || '',
            total_responses: feedbackData.length,
            analysis: analysisResults
        };
    } catch (error) {
        console.error('Error in getFeedbackAnalysis:', error);
        return { success: false, message: error.message };
    }
};

module.exports = {
    getFeedbackAnalysis
};
