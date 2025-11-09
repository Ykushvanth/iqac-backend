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

// Helper function to clean and validate string values
function cleanString(value) {
    if (!value) return null;
    const cleaned = value.toString().trim();
    if (cleaned === '' || cleaned.toUpperCase() === 'NULL') return null;
    return cleaned;
}

// Get all distinct schools from profiles table
const getDistinctSchools = async () => {
    try {
        console.log('Fetching all schools from profiles table...');
        const { data, error } = await supabase
            .from('profiles')
            .select('school')
            .not('school', 'is', null);

        if (error) {
            console.error('Supabase error fetching schools:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Database error: ${error.message || 'Failed to fetch schools from profiles table'}`);
        }

        if (!data) {
            console.warn('No data returned from profiles table');
            return [];
        }

        console.log(`Raw data from profiles: ${data.length} rows`);

        const uniqueSchools = [...new Set(
            (data || [])
                .map(item => cleanString(item.school))
                .filter(school => school !== null)
        )].sort((a, b) => a.localeCompare(b));

        console.log('Processed unique schools:', uniqueSchools.length, 'schools');
        if (uniqueSchools.length > 0) {
            console.log('Sample schools:', uniqueSchools.slice(0, 5));
        } else {
            console.warn('⚠️ No schools found in profiles table. Make sure the profiles table has school data.');
        }
        return uniqueSchools;
    } catch (error) {
        console.error('Error in getDistinctSchools:', error);
        throw error;
    }
};

// Get all departments for a specific school from profiles table
const getDepartmentsBySchool = async (school) => {
    try {
        console.log(`Fetching departments for school: ${school}`);
        const { data, error } = await supabase
            .from('profiles')
            .select('department')
            .eq('school', school)
            .not('department', 'is', null);

        if (error) {
            console.error('Error fetching departments:', error);
            throw error;
        }

        const uniqueDepts = [...new Set(
            (data || [])
                .map(item => cleanString(item.department))
                .filter(dept => dept !== null)
        )].sort((a, b) => a.localeCompare(b));

        console.log(`Processed unique departments for ${school}: ${uniqueDepts.length} departments`);
        return uniqueDepts;
    } catch (error) {
        console.error('Error in getDepartmentsBySchool:', error);
        throw error;
    }
};

// Get school name and all departments for a school
const getSchoolWithDepartments = async (school) => {
    try {
        const departments = await getDepartmentsBySchool(school);
        return {
            school: school,
            departments: departments
        };
    } catch (error) {
        console.error('Error in getSchoolWithDepartments:', error);
        throw error;
    }
};

module.exports = {
    getDistinctSchools,
    getDepartmentsBySchool,
    getSchoolWithDepartments
};

