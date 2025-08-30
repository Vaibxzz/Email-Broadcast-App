// server.js - FULL UPDATED CODE
// Saturday, August 23, 2025

// 1. Get all our helper tools ready
const express = require('express');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const cors = require('cors');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const app = express(); // This is our main helper, the "Express" app
app.use(cors()); // This lets our frontend talk to our backend
app.use(express.json()); // This helps our app understand JSON data

// 2. Settings for our big list box (database)
const dbConfig = {
    host: 'localhost',
    user: 'root', // Default user for XAMPP
    password: '', // Default password for XAMPP is empty
    database: 'email_broadcaster'
};

// 3. --- UPDATED SECTION ---
// Settings for our PRACTICE post office (Ethereal) using your new account
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'zelma.mertz@ethereal.email', // Your Ethereal username
        pass: 'GG7e3G4G2Vtu2ZhRBk'             // Your Ethereal password
    }
});

// 4. Create the first rule: "How to send emails"
app.post('/api/broadcast', async (req, res) => {
    console.log('Received a request to send an email!');
    const { subject, body, recipients } = req.body;

    // Check if we got everything we need
    if (!subject || !body || !recipients || recipients.length === 0) {
        return res.status(400).send('Oops! We are missing the subject, body, or recipients.');
    }

    const connection = await mysql.createConnection(dbConfig);

    // Let's go through the list of people to email
    for (const recipient of recipients) {
        try {
            // Try to send the email
            

            await transporter.sendMail({
                // --- UPDATED LINE ---
                from: '"Your App" <vern.parisian0@ethereal.email>', // Using your Ethereal "from" address
                
                to: recipient,
                subject: subject,
                html: body
            });

            // If it worked, write "Sent" in our list box
            await connection.execute(
                'INSERT INTO email_logs (subject, body, recipient_email, delivery_status) VALUES (?, ?, ?, ?)',
                [subject, body, recipient, 'Sent']
            );
            console.log(`Email sent to ${recipient} and logged!`);

        } catch (error) {
            // If it failed, write "Failed" in our list box
            console.error(`Failed to send email to ${recipient}:`, error);
            await connection.execute(
                'INSERT INTO email_logs (subject, body, recipient_email, delivery_status) VALUES (?, ?, ?, ?)',
                [subject, body, recipient, 'Failed']
            );
        }
    }

    await connection.end();
    res.status(200).send('Email broadcast finished!');
});


// 5. Create the second rule: "How to show the logs"
app.get('/api/logs', async (req, res) => {
    console.log('Received a request to view logs!');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const connection = await mysql.createConnection(dbConfig);

    // Get the logs for the page we want
    const [logs] = await connection.execute(
        'SELECT *, LEFT(body, 50) as body FROM email_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );

    // Count how many logs there are in total
    const [[{ totalItems }]] = await connection.execute('SELECT COUNT(*) as totalItems FROM email_logs');

    await connection.end();

    res.json({
        logs: logs,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
    });
});


// 6. Create the third rule: "How to download the logs"
app.get('/api/logs/export', async (req, res) => {
    console.log('Received a request to export logs!');
    const connection = await mysql.createConnection(dbConfig);
    const [records] = await connection.execute('SELECT * FROM email_logs ORDER BY created_at DESC');
    await connection.end();

    // Set the file headers so the browser knows it's a download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="email-logs.csv"');

    // Create a new CSV writer helper
    const writer = csvWriter({
        path: null, // This tells it to write to memory, not a file on the server
        header: [
            { id: 'id', title: 'ID' },
            { id: 'subject', title: 'Subject' },
            { id: 'recipient_email', title: 'Recipient' },
            { id: 'delivery_status', title: 'Status' },
            { id: 'created_at', title: 'Timestamp' },
            { id: 'body', title: 'Body' } // Adding body to the export
        ]
    });
    
    // The writer needs a special format, so we have to prepare the records
    const recordsForCsv = records.map(rec => ({
      id: rec.id,
      subject: rec.subject,
      recipient_email: rec.recipient_email,
      delivery_status: rec.delivery_status,
      // Format the date to be more readable in a spreadsheet
      created_at: new Date(rec.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      body: rec.body
    }));

    // Generate the CSV string from our records
    const csvString = await writer.generateHeader() + await writer.stringifyRecords(recordsForCsv);

    // Send the final CSV string as the response
    res.send(csvString);
});

// 7. Finally, let's turn the engine on!
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Hooray! The engine is running at http://localhost:${PORT}`);
});