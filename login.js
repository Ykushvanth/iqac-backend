// const { createClient } = require('@supabase/supabase-js');
// const nodemailer = require('nodemailer');
// const dotenv = require('dotenv');

// dotenv.config();

// const supabase = createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_ANON_KEY,
//     {
//         auth: {
//             persistSession: false
//         }
//     }
// );

// // Store OTPs temporarily (in production, use Redis or similar)
// const otpStore = new Map();

// // Configure email transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD
//     }
// });

// // Generate 6-digit OTP
// function generateOTP() {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// }

// // Send OTP email
// async function sendOTPEmail(email, otp, name) {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: 'Your OTP for Faculty Feedback System',
//         html: `
//             <!DOCTYPE html>
//             <html>
//             <head>
//                 <style>
//                     body {
//                         font-family: Arial, sans-serif;
//                         line-height: 1.6;
//                         color: #333;
//                     }
//                     .container {
//                         max-width: 600px;
//                         margin: 0 auto;
//                         padding: 20px;
//                         background-color: #f9f9f9;
//                     }
//                     .header {
//                         text-align: center;
//                         padding: 20px;
//                         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                         color: white;
//                         border-radius: 10px 10px 0 0;
//                     }
//                     .content {
//                         background: white;
//                         padding: 30px;
//                         border-radius: 0 0 10px 10px;
//                     }
//                     .otp-box {
//                         background-color: #f0f4ff;
//                         border: 2px solid #667eea;
//                         border-radius: 10px;
//                         padding: 20px;
//                         text-align: center;
//                         margin: 20px 0;
//                     }
//                     .otp-code {
//                         font-size: 32px;
//                         font-weight: bold;
//                         color: #667eea;
//                         letter-spacing: 8px;
//                         margin: 10px 0;
//                     }
//                     .footer {
//                         text-align: center;
//                         margin-top: 20px;
//                         padding-top: 20px;
//                         border-top: 1px solid #ddd;
//                         color: #666;
//                         font-size: 12px;
//                     }
//                     .warning {
//                         background-color: #fff3cd;
//                         border-left: 4px solid #ffc107;
//                         padding: 12px;
//                         margin: 15px 0;
//                         border-radius: 4px;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="container">
//                     <div class="header">
//                         <h1>Faculty Feedback System</h1>
//                         <p>Kalasalingam Academy of Research and Education</p>
//                     </div>
//                     <div class="content">
//                         <h2>Hello ${name},</h2>
//                         <p>You have requested to login to the Faculty Feedback System. Please use the following One-Time Password (OTP) to complete your authentication:</p>
                        
//                         <div class="otp-box">
//                             <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
//                             <div class="otp-code">${otp}</div>
//                             <p style="margin: 0; font-size: 12px; color: #666;">Valid for 10 minutes</p>
//                         </div>
                        
//                         <div class="warning">
//                             <strong>⚠️ Security Notice:</strong>
//                             <ul style="margin: 10px 0; padding-left: 20px;">
//                                 <li>This OTP is valid for 10 minutes only</li>
//                                 <li>Do not share this code with anyone</li>
//                                 <li>If you did not request this OTP, please ignore this email</li>
//                             </ul>
//                         </div>
                        
//                         <p>If you have any questions or concerns, please contact the system administrator.</p>
                        
//                         <p>Best regards,<br>
//                         <strong>Faculty Feedback System Team</strong></p>
//                     </div>
//                     <div class="footer">
//                         <p>© 2024 Kalasalingam Academy of Research and Education<br>
//                         This is an automated email, please do not reply.</p>
//                     </div>
//                 </div>
//             </body>
//             </html>
//         `
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         return { success: true };
//     } catch (error) {
//         console.error('Error sending email:', error);
//         return { success: false, error: error.message };
//     }
// }

// // Send OTP to user
// async function sendOTP(name, role, email) {
//     try {
//         // Validate email format
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//             return {
//                 success: false,
//                 message: 'Invalid email format'
//             };
//         }

//         // Generate OTP
//         const otp = generateOTP();
//         const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

//         // Store OTP temporarily
//         otpStore.set(email, {
//             otp,
//             expiresAt,
//             name,
//             role,
//             attempts: 0
//         });

//         // Send OTP email
//         const emailResult = await sendOTPEmail(email, otp, name);

//         if (!emailResult.success) {
//             return {
//                 success: false,
//                 message: 'Failed to send OTP email. Please try again.'
//             };
//         }

//         console.log(`OTP sent to ${email}: ${otp}`); // For development - remove in production

//         return {
//             success: true,
//             message: 'OTP sent successfully to your email'
//         };

//     } catch (error) {
//         console.error('Error in sendOTP:', error);
//         return {
//             success: false,
//             message: 'Failed to send OTP. Please try again.',
//             error: error.message
//         };
//     }
// }

// // Verify OTP and create/update user profile
// async function verifyOTP(email, otp) {
//     try {
//         const storedData = otpStore.get(email);

//         if (!storedData) {
//             return {
//                 success: false,
//                 message: 'OTP not found or expired. Please request a new OTP.'
//             };
//         }

//         // Check if OTP has expired
//         if (Date.now() > storedData.expiresAt) {
//             otpStore.delete(email);
//             return {
//                 success: false,
//                 message: 'OTP has expired. Please request a new OTP.'
//             };
//         }

//         // Check attempts
//         if (storedData.attempts >= 3) {
//             otpStore.delete(email);
//             return {
//                 success: false,
//                 message: 'Too many failed attempts. Please request a new OTP.'
//             };
//         }

//         // Verify OTP
//         if (storedData.otp !== otp) {
//             storedData.attempts += 1;
//             otpStore.set(email, storedData);
//             return {
//                 success: false,
//                 message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
//             };
//         }

//         // OTP is valid, check if user exists
//         const { data: existingUser, error: fetchError } = await supabase
//             .from('profiles')
//             .select('*')
//             .eq('email', email)
//             .single();

//         let userData;

//         if (existingUser) {
//             // Update existing user
//             const { data: updatedUser, error: updateError } = await supabase
//                 .from('profiles')
//                 .update({
//                     name: storedData.name,
//                     role: storedData.role,
//                     last_seen_at: new Date().toISOString()
//                 })
//                 .eq('email', email)
//                 .select()
//                 .single();

//             if (updateError) {
//                 console.error('Error updating user:', updateError);
//                 return {
//                     success: false,
//                     message: 'Failed to update user profile'
//                 };
//             }

//             userData = updatedUser;
//         } else {
//             // Create new user
//             const { data: newUser, error: insertError } = await supabase
//                 .from('profiles')
//                 .insert([
//                     {
//                         name: storedData.name,
//                         role: storedData.role,
//                         email: email,
//                         last_seen_at: new Date().toISOString()
//                     }
//                 ])
//                 .select()
//                 .single();

//             if (insertError) {
//                 console.error('Error creating user:', insertError);
//                 return {
//                     success: false,
//                     message: 'Failed to create user profile'
//                 };
//             }

//             userData = newUser;
//         }

//         // Clear OTP from store
//         otpStore.delete(email);

//         return {
//             success: true,
//             message: 'Login successful',
//             user: {
//                 id: userData.id,
//                 name: userData.name,
//                 role: userData.role,
//                 email: userData.email
//             }
//         };

//     } catch (error) {
//         console.error('Error in verifyOTP:', error);
//         return {
//             success: false,
//             message: 'Verification failed. Please try again.',
//             error: error.message
//         };
//     }
// }

// // Clean up expired OTPs (run periodically)
// function cleanupExpiredOTPs() {
//     const now = Date.now();
//     for (const [email, data] of otpStore.entries()) {
//         if (now > data.expiresAt) {
//             otpStore.delete(email);
//         }
//     }
// }

// // Run cleanup every 5 minutes
// setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

// module.exports = {
//     sendOTP,
//     verifyOTP
// };

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
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

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Store rate limiting data
const rateLimitStore = new Map();

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting check
function checkRateLimit(email) {
    const now = Date.now();
    const rateData = rateLimitStore.get(email);

    if (!rateData) {
        rateLimitStore.set(email, {
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now
        });
        return { allowed: true };
    }

    // Reset if 1 hour has passed
    if (now - rateData.firstAttempt > 60 * 60 * 1000) {
        rateLimitStore.set(email, {
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now
        });
        return { allowed: true };
    }

    // Check if too many attempts
    if (rateData.attempts >= 5) {
        const timeRemaining = Math.ceil((rateData.firstAttempt + 60 * 60 * 1000 - now) / 60000);
        return {
            allowed: false,
            message: `Too many attempts. Please try again after ${timeRemaining} minutes.`
        };
    }

    // Check if attempting too quickly (must wait 30 seconds between attempts)
    if (now - rateData.lastAttempt < 30 * 1000) {
        const timeRemaining = Math.ceil((rateData.lastAttempt + 30 * 1000 - now) / 1000);
        return {
            allowed: false,
            message: `Please wait ${timeRemaining} seconds before requesting another OTP.`
        };
    }

    rateData.attempts += 1;
    rateData.lastAttempt = now;
    rateLimitStore.set(email, rateData);

    return { allowed: true };
}

// Send OTP email
async function sendOTPEmail(email, otp, name) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP for Faculty Feedback System',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        text-align: center;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .otp-box {
                        background-color: #f0f4ff;
                        border: 2px solid #667eea;
                        border-radius: 10px;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .otp-code {
                        font-size: 32px;
                        font-weight: bold;
                        color: #667eea;
                        letter-spacing: 8px;
                        margin: 10px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        color: #666;
                        font-size: 12px;
                    }
                    .warning {
                        background-color: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 12px;
                        margin: 15px 0;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Faculty Feedback System</h1>
                        <p>Kalasalingam Academy of Research and Education</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>You have requested to login to the Faculty Feedback System. Please use the following One-Time Password (OTP) to complete your authentication:</p>
                        
                        <div class="otp-box">
                            <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Valid for 10 minutes</p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>This OTP is valid for 10 minutes only</li>
                                <li>Do not share this code with anyone</li>
                                <li>If you did not request this OTP, please ignore this email</li>
                            </ul>
                        </div>
                        
                        <p>If you have any questions or concerns, please contact the system administrator.</p>
                        
                        <p>Best regards,<br>
                        <strong>Faculty Feedback System Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Kalasalingam Academy of Research and Education<br>
                        This is an automated email, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// Send OTP to user - Only if email exists in profiles table
async function sendOTP(email) {
    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                success: false,
                message: 'Invalid email format'
            };
        }

        // Check rate limiting
        const rateLimitCheck = checkRateLimit(email);
        if (!rateLimitCheck.allowed) {
            return {
                success: false,
                message: rateLimitCheck.message
            };
        }

        // Check if email exists in profiles table
        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, name, role')
            .eq('email', email)
            .single();

        if (profileError || !existingProfile) {
            console.log(`Access denied for email: ${email} - Not found in profiles`);
            return {
                success: false,
                message: 'Access denied. This email is not registered in the system. Please contact your administrator.'
            };
        }

        console.log(`Email ${email} verified in profiles. User: ${existingProfile.name}, Role: ${existingProfile.role}`);

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP with profile data from database
        otpStore.set(email, {
            otp,
            expiresAt,
            profileId: existingProfile.id,
            name: existingProfile.name,
            role: existingProfile.role,
            attempts: 0
        });

        // Send OTP email
        const emailResult = await sendOTPEmail(email, otp, existingProfile.name);

        if (!emailResult.success) {
            return {
                success: false,
                message: 'Failed to send OTP email. Please try again.'
            };
        }

        console.log(`OTP sent to ${email}: ${otp}`); // For development - remove in production

        return {
            success: true,
            message: `OTP sent successfully to ${email}`
        };

    } catch (error) {
        console.error('Error in sendOTP:', error);
        return {
            success: false,
            message: 'Failed to send OTP. Please try again.',
            error: error.message
        };
    }
}

// Verify OTP and authenticate user
async function verifyOTP(email, otp) {
    try {
        const storedData = otpStore.get(email);

        if (!storedData) {
            return {
                success: false,
                message: 'OTP not found or expired. Please request a new OTP.'
            };
        }

        // Check if OTP has expired
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return {
                success: false,
                message: 'OTP has expired. Please request a new OTP.'
            };
        }

        // Check attempts
        if (storedData.attempts >= 3) {
            otpStore.delete(email);
            return {
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            };
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            storedData.attempts += 1;
            otpStore.set(email, storedData);
            return {
                success: false,
                message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
            };
        }

        // OTP is valid - Update last_seen_at
        const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update({
                last_seen_at: new Date().toISOString()
            })
            .eq('id', storedData.profileId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating last_seen_at:', updateError);
            // Continue anyway - this is not critical
        }

        // Clear OTP from store
        otpStore.delete(email);

        // Clear rate limit for successful login
        rateLimitStore.delete(email);

        return {
            success: true,
            message: 'Login successful',
            user: {
                id: storedData.profileId,
                name: storedData.name,
                role: storedData.role,
                email: email
            }
        };

    } catch (error) {
        console.error('Error in verifyOTP:', error);
        return {
            success: false,
            message: 'Verification failed. Please try again.',
            error: error.message
        };
    }
}

// Clean up expired OTPs and rate limits (run periodically)
function cleanup() {
    const now = Date.now();
    
    // Clean up expired OTPs
    for (const [email, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(email);
            console.log(`Cleaned up expired OTP for: ${email}`);
        }
    }
    
    // Clean up old rate limit data (older than 1 hour)
    for (const [email, data] of rateLimitStore.entries()) {
        if (now - data.firstAttempt > 60 * 60 * 1000) {
            rateLimitStore.delete(email);
            console.log(`Cleaned up rate limit data for: ${email}`);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
    sendOTP,
    verifyOTP
};