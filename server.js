const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const dotenv = require('dotenv');
const { handleFileUpload } = require('./uplod_file_backend');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Test route
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Server is running and accessible' });
});

// Routes
app.post('/api/upload', async (req, res) => {
    try {
        console.log('Received upload request');
        
        if (!req.files || !req.files.file) {
            console.log('No file in request');
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log('File received:', req.files.file);
        const result = await handleFileUpload(req.files.file);
        
        console.log('Upload result:', result);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error processing file',
            error: error.message 
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});