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
        if (error) throw error;

        if (!data || data.length === 0) {
            moreData = false;
        } else {
            allData = allData.concat(data);
            from += chunkSize;
            console.log(`Fetched rows: ${allData.length}`);
        }
    }
    return allData;
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
                .map(item => item.degree?.trim())
                .filter(degree => degree && degree.toUpperCase() !== 'NULL' && degree !== '')
        )].sort((a, b) => a.localeCompare(b));

        console.log('Processed unique degrees:', uniqueDegrees);
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
            allData.map(item => item.dept?.trim())
                   .filter(dept => dept && dept !== 'NULL' && dept !== '')
        )].sort((a, b) => a.localeCompare(b));

        console.log('Processed unique departments:', uniqueDepts);
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
            allData.map(item => item.batch?.toString().trim())
                   .filter(batch => batch && batch !== 'NULL' && batch !== '')
        )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        console.log('Processed unique batches:', uniqueBatches);
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
            if (item.course_code && item.course_code.trim() !== '' && item.course_code !== 'NULL') {
                courseMap.set(item.course_code.trim(), {
                    code: item.course_code.trim(),
                    name: item.course_name?.trim() || 'Unknown Course'
                });
            }
        });

        const uniqueCourses = Array.from(courseMap.values())
            .sort((a, b) => a.code.localeCompare(b.code));

        console.log('Processed unique courses:', uniqueCourses);
        return uniqueCourses;
    } catch (error) {
        console.error('Error in getDistinctCourses:', error);
        throw error;
    }
};

// 5. Faculty list for selected filters with optional staffId filter
const getFacultyByFilters = async (degree, department, batch, courseCode, staffIdFilter) => {
    try {
        console.log(`Fetching faculty for degree: ${degree}, department: ${department}, batch: ${batch}, course: ${courseCode}, staffId: ${staffIdFilter || 'N/A'}`);

        let query = supabase
            .from('course_feedback')
            .select('faculty_name, staff_id, staffid, course_code, course_name')
            .eq('degree', degree)
            .eq('dept', department)
            .eq('batch', batch)
            .eq('course_code', courseCode)
            .not('faculty_name', 'is', null);

        if (staffIdFilter && staffIdFilter.trim() !== '') {
            const like = `%${staffIdFilter.trim()}%`;
            query = query.or(`staff_id.ilike.${like},staffid.ilike.${like}`);
        }

        const allData = await fetchAllRows(query);

        // Deduplicate by (staff_id||staffid, course_code)
        const uniqueMap = new Map();
        for (const item of allData) {
            const keyId = (item.staff_id || item.staffid || '').toString().trim();
            const key = `${keyId}::${(item.course_code || '').toString().trim()}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, {
                    faculty_name: item.faculty_name?.trim() || 'Unknown',
                    staff_id: item.staff_id?.toString().trim() || '',
                    staffid: item.staffid?.toString().trim() || '',
                    course_code: item.course_code?.toString().trim() || '',
                    course_name: item.course_name?.toString().trim() || ''
                });
            }
        }

        const uniqueFaculty = Array.from(uniqueMap.values());
        console.log('Processed faculty results:', uniqueFaculty.length);
        return uniqueFaculty;
    } catch (error) {
        console.error('Error in getFacultyByFilters:', error);
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
