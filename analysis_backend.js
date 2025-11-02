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

// Generic pagination fetcher
async function fetchAllRows(queryBuilder, chunkSize = 1000) {
    let from = 0;
    let allData = [];
    let moreData = true;

    while (moreData) {
        const { data, error } = await queryBuilder.range(from, from + chunkSize - 1);
        if (error) {
            console.error('Error fetching rows:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            moreData = false;
        } else {
            allData = allData.concat(data);
            from += chunkSize;
            if (from % 5000 === 0) {
                console.log(`Fetched rows: ${allData.length}`);
            }
        }
    }
    console.log(`Total rows fetched: ${allData.length}`);
    return allData;
}

// Helper function to clean and validate string values
function cleanString(value) {
    if (!value) return null;
    const cleaned = value.toString().trim();
    if (cleaned === '' || cleaned.toUpperCase() === 'NULL') return null;
    return cleaned;
}

// 1. Degrees
const getDistinctDegrees = async () => {
    try {
        console.log('Fetching all degrees with pagination...');
        const allData = await fetchAllRows(
            supabase.from('course_feedback').select('degree')
        );

        const uniqueDegrees = [...new Set(
            allData
                .map(item => cleanString(item.degree))
                .filter(degree => degree !== null)
        )].sort((a, b) => a.localeCompare(b));

        console.log('Processed unique degrees:', uniqueDegrees.length, 'degrees');
        return uniqueDegrees;
    } catch (error) {
        console.error('Error in getDistinctDegrees:', error);
        throw error;
    }
};

// 2. Departments
const getDistinctDepartments = async (degree) => {
    try {
        console.log(`Fetching departments for degree: ${degree}`);
        
        const allData = await fetchAllRows(
            supabase.from('course_feedback')
                .select('dept')
                .eq('degree', degree)
                .not('dept', 'is', null)
        );

        const uniqueDepts = [...new Set(
            allData
                .map(item => cleanString(item.dept))
                .filter(dept => dept !== null)
        )].sort((a, b) => a.localeCompare(b));

        console.log(`Processed unique departments: ${uniqueDepts.length} departments`);
        return uniqueDepts;
    } catch (error) {
        console.error('Error in getDistinctDepartments:', error);
        throw error;
    }
};

// 3. Batches
const getDistinctBatches = async (degree, department) => {
    try {
        console.log(`Fetching batches for degree: ${degree}, department: ${department}`);
        
        const allData = await fetchAllRows(
            supabase.from('course_feedback')
                .select('batch')
                .eq('degree', degree)
                .eq('dept', department)
                .not('batch', 'is', null)
        );

        const uniqueBatches = [...new Set(
            allData
                .map(item => cleanString(item.batch))
                .filter(batch => batch !== null)
        )].sort((a, b) => {
            // Numeric sort for batches
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.localeCompare(b);
        });

        console.log(`Processed unique batches: ${uniqueBatches.length} batches`);
        return uniqueBatches;
    } catch (error) {
        console.error('Error in getDistinctBatches:', error);
        throw error;
    }
};

// 4. Courses
const getDistinctCourses = async (degree, department, batch) => {
    try {
        console.log(`Fetching courses for degree: ${degree}, department: ${department}, batch: ${batch}`);
        
        const allData = await fetchAllRows(
            supabase.from('course_feedback')
                .select('course_code, course_name')
                .eq('degree', degree)
                .eq('dept', department)
                .eq('batch', batch)
                .not('course_code', 'is', null)
        );

        const courseMap = new Map();
        allData.forEach(item => {
            const code = cleanString(item.course_code);
            const name = cleanString(item.course_name);
            
            if (code && !courseMap.has(code)) {
                courseMap.set(code, {
                    code: code,
                    name: name || 'Unknown Course'
                });
            }
        });

        const uniqueCourses = Array.from(courseMap.values())
            .sort((a, b) => a.code.localeCompare(b.code));

        console.log(`Processed unique courses: ${uniqueCourses.length} courses`);
        return uniqueCourses;
    } catch (error) {
        console.error('Error in getDistinctCourses:', error);
        throw error;
    }
};

// 5. Faculty list for selected filters with optional staffId filter
const getFacultyByFilters = async (degree, department, batch, courseCode, staffIdFilter) => {
    try {
        console.log(`\n=== Fetching Faculty ===`);
        console.log(`Degree: ${degree}`);
        console.log(`Department: ${department}`);
        console.log(`Batch: ${batch}`);
        console.log(`Course: ${courseCode}`);
        console.log(`Staff ID Filter: ${staffIdFilter || 'N/A'}`);

        // Fetch all data with base filters (without exact course_code match)
        // We'll filter course_code manually to handle trailing spaces
        let query = supabase
            .from('course_feedback')
            .select('faculty_name, staff_id, staffid, course_code, course_name')
            .eq('degree', degree)
            .eq('dept', department)
            .eq('batch', batch)
            .not('faculty_name', 'is', null)
            .not('course_code', 'is', null);

        // Fetch all matching rows
        const allData = await fetchAllRows(query);
        console.log(`Raw data fetched: ${allData.length} rows`);

        if (allData.length === 0) {
            console.log('⚠️ No data found with the given base filters');
            return [];
        }

        // Filter by course_code manually (to handle trailing spaces)
        // Also apply staff ID filter if provided
        const cleanedCourseCode = courseCode.trim();
        const filteredData = allData.filter(item => {
            const itemCourseCode = cleanString(item.course_code);
            
            // Check if course code matches (trimmed comparison)
            if (itemCourseCode !== cleanedCourseCode) {
                return false;
            }

            // If staff ID filter is provided, check it
            if (staffIdFilter && staffIdFilter.trim() !== '') {
                const trimmedIdFilter = staffIdFilter.trim();
                const itemStaffId = cleanString(item.staff_id);
                const itemStaffid = cleanString(item.staffid);
                
                // Return true if either staff_id or staffid matches
                return itemStaffId === trimmedIdFilter || itemStaffid === trimmedIdFilter;
            }

            return true;
        });

        console.log(`Filtered data after course code match: ${filteredData.length} rows`);

        if (filteredData.length === 0) {
            console.log('⚠️ No data found after filtering');
            console.log('Debug - Sample course codes in database:');
            const sampleCodes = allData.slice(0, 5).map(item => ({
                course_code: item.course_code,
                trimmed: cleanString(item.course_code),
                length: item.course_code?.length,
                searching_for: cleanedCourseCode
            }));
            console.log(sampleCodes);
            return [];
        }

        // Deduplicate faculty by (staff_id||staffid, course_code)
        const uniqueMap = new Map();
        
        for (const item of filteredData) {
            // Get staff ID from either staff_id or staffid column
            const staffId = cleanString(item.staff_id) || cleanString(item.staffid);
            const facultyName = cleanString(item.faculty_name);
            const itemCourseCode = cleanString(item.course_code);
            const courseName = cleanString(item.course_name);

            // Skip if no valid staff ID
            if (!staffId) {
                continue;
            }

            // Create unique key combining staff ID and course code
            const key = `${staffId}::${itemCourseCode}`;

            // Only add if not already in map
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, {
                    faculty_name: facultyName || 'Unknown',
                    staff_id: item.staff_id ? cleanString(item.staff_id) : '',
                    staffid: item.staffid ? cleanString(item.staffid) : '',
                    course_code: itemCourseCode || '',
                    course_name: courseName || 'Unknown Course'
                });
            }
        }

        const uniqueFaculty = Array.from(uniqueMap.values());
        
        console.log(`✓ Processed faculty results: ${uniqueFaculty.length} unique faculty members`);
        
        if (uniqueFaculty.length > 0) {
            console.log('Sample faculty:', uniqueFaculty[0]);
        }

        return uniqueFaculty;
    } catch (error) {
        console.error('❌ Error in getFacultyByFilters:', error);
        console.error('Error details:', error.message);
        throw error;
    }
};

module.exports = {
    getDistinctDegrees,
    getDistinctDepartments,
    getDistinctBatches,
    getDistinctCourses,
    getFacultyByFilters
};