const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';
const DATA_FILE = path.join(DATA_DIR, 'schedule-data.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
}

// Serve static files
app.use(express.static(__dirname));

// API endpoint to save schedule data
app.post('/api/save', (req, res) => {
    try {
        const data = req.body;

        // Add metadata
        data.lastSaved = new Date().toISOString();

        // Write to file
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log(`Data saved successfully at ${new Date().toLocaleString()}`);
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to load schedule data
app.get('/api/load', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            console.log(`Data loaded successfully at ${new Date().toLocaleString()}`);
            res.json({ success: true, data: JSON.parse(data) });
        } else {
            console.log('No saved data found, returning empty state');
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to check if data exists
app.get('/api/status', (req, res) => {
    try {
        const exists = fs.existsSync(DATA_FILE);
        let lastModified = null;

        if (exists) {
            const stats = fs.statSync(DATA_FILE);
            lastModified = stats.mtime.toISOString();
        }

        res.json({
            success: true,
            dataExists: exists,
            lastModified: lastModified,
            dataFile: DATA_FILE
        });
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to export data as JSON file
app.get('/api/export', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=schedule-export-${new Date().toISOString().slice(0, 10)}.json`);
            res.send(data);
        } else {
            res.status(404).json({ success: false, error: 'No data to export' });
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('CSCI Class Scheduler Server');
    console.log('='.repeat(60));
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Data file: ${DATA_FILE}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
    console.log('='.repeat(60));
});
