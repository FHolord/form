require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const combineSheetsData = require('./combineMiddleware'); // Middleware to combine sheets
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
        await combineSheetsData(); // Call the combineSheetsData function
      }
    } catch (error) {
      console.error('Error checking for new records in peepee sheet:', error);
    }
}

// Route for submitting form data
app.post('/submit-form', async (req, res, next) => {
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

  // Step 2: Trigger the middleware to combine the sheets after form submission
  combineSheetsData(req, res, async () => {
    // Step 3: After combining, return the response with form ID
    console.log('Sheets combined successfully after form submission.');
    res.json({ success: true, formId });
  });
});

// Route to manually trigger combineSheetsData
app.get('/combine', combineSheetsData, (req, res) => {
    res.send('Combined data processed successfully');
});

// Check and combine sheets data every 30 seconds
setInterval(checkAndCombineSheetsData, 30000);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
