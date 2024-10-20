require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const combineSheetsData = require('./combineMiddleware'); // Middleware to combine sheets
const path = require('path');
const session = require('express-session'); // Import express-session

const app = express();
const PORT = process.env.PORT || 3000;

// Configure express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'A1FECEB7BB12E,', // Use a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure to true if using HTTPS
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Google Sheets Authentication
const auth = new GoogleAuth({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = '1fFo9UKr7IGE4Qscy35fo-lnNsYQj9o481uQjfF1ZPHM';

// Global mutex lock to prevent concurrent submissions from causing issues
let isLocked = false;

async function updateGoogleSheet(formData) {
  const sheets = google.sheets({ version: 'v4', auth });
  const range = 'Giselle!A2:A';

  // Wait until the lock is released
  while (isLocked) {
    console.log('Waiting for lock to be released...');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retrying
  }

  // Acquire the lock
  isLocked = true;

  try {
    // Fetch existing form IDs
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const formIds = response.data.values ? response.data.values.flat() : [];
    const numericIds = formIds
      .filter(value => value.startsWith('O'))
      .map(value => Number(value.replace('O', '')))
      .filter(value => !isNaN(value));

    let nextFormId = numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;

    // Create the new row with a unique Form ID
    const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
    const newRow = [[`O${nextFormId}`, formData.coffeeType, timestamp]];
    const appendRange = 'Giselle!A:C';

    // Append the new row to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: appendRange,
      valueInputOption: 'RAW',
      requestBody: { values: newRow },
    });

    // Release the lock after completion
    isLocked = false;

    return `O${nextFormId}`;
  } catch (error) {
    // Release the lock in case of an error
    isLocked = false;
    console.error('Error updating Google Sheet:', error);
    return null;
  }
}

// Route for submitting form data
app.post('/submit-form', async (req, res) => {
  const coffeeType = req.body.coffeeType;
  console.log(`Received form data: ${JSON.stringify({ coffeeType })}`);

  if (!coffeeType) {
    console.error('Invalid form data received:', { coffeeType });
    return res.status(400).json({ success: false, message: 'Invalid form data.' });
  }

  // Step 1: Update the "Giselle" sheet with form data
  const formId = await updateGoogleSheet({ coffeeType });

  if (formId === null) {
    console.error('Failed to generate Form ID');
    return res.status(500).json({ success: false, message: 'Failed to generate Form ID.' });
  }

  console.log('Form submitted successfully with ID:', formId);

  // Step 2: Store formId and coffeeType in session
  req.session.formId = formId;
  req.session.coffeeType = coffeeType;

  // Step 3: Trigger combineSheetsData middleware to combine data
  await combineSheetsData(req, res, async () => {
    console.log('Sheets combined successfully after form submission.');

    // Step 4: Return success response
    res.json({ success: true });
  });
});

// Function to check if there are new records in the "peepee" sheet and trigger combineSheetsData
async function checkAndCombineSheetsData() {
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Fetch data from "peepee" sheet
    const peepeeData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'peepee!A2:C', // Adjust range if necessary
    });
    const peepeeRows = peepeeData.data.values || [];

    // Logic to determine if there are new records
    if (peepeeRows.length > 0) {
      console.log("New records found in peepee sheet, combining data...");
      await combineSheetsData(); // Call the combineSheetsData function
    }
  } catch (error) {
    console.error('Error checking for new records in peepee sheet:', error);
  }
}

// Automatically check and combine data from "peepee" sheet every 30 seconds
setInterval(() => {
  console.log('Checking for new records in the peepee sheet...');
  checkAndCombineSheetsData();
}, 30000); // 30000ms = 30 seconds

// Route for the success page
app.get('/form-success', (req, res) => {
  const formId = req.session.formId;
  const coffeeType = req.session.coffeeType;

  // Check if session data exists
  if (!formId || !coffeeType) {
    return res.redirect('/'); // Redirect if no data is found
  }

  // Clear session data after use
  delete req.session.formId;
  delete req.session.coffeeType;

  // Render the success page with the session data
  res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
    <title>Form Success</title>
    <style>
    body {
      background-color: #005952;
    }

    .receipt-container {
        position: relative;
        display: inline-block;
        max-width: 100%;
    }

    .receipt-container img {
        width: 100%; /* Ensure image is responsive */
        height: auto;
    }

    .overlay {
        width: 100%;
        position: absolute;
        color: black;
        padding: 2% 4%; /* Use percentages for padding */
        border-radius: 5px;
        font-weight: bold;
        left: 50%; /* Horizontally center */
        top: 69%; /* Vertically center */
        transform: translate(-50%, -50%); /* Center based on top/left */
        text-align: center;
    }

    .queue-number, .coffee {
        margin-top: 2em; /* Spacing between the order and queue number */
        font-size: 7vw; /* Relative to the viewport width */
    }
</style
</head>
<body>
    <div class="container-submit">
        <div class="receipt-container">
            <img id="receiptImg" src="./receipt.png" alt="Receipt" />
            <div id="orderText" class="overlay">
                <div class="coffee">${coffeeType}</div>
                <div class="queue-number">${formId}</div>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});
// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
