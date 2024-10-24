// form.js
require('dotenv').config();
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

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
  const range = 'Online!A2:A';

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
    const appendRange = 'Online!A:C';

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

// Route handler for form submission
async function handleFormSubmission(req, res, combineSheetsData) {
  const coffeeType = req.body.coffeeType;
  console.log(`Received form data: ${JSON.stringify({ coffeeType })}`);

  if (!coffeeType) {
    console.error('Invalid form data received:', { coffeeType });
    return res.status(400).json({ success: false, message: 'Invalid form data.' });
  }

  // Step 1: Update the "Online" sheet with form data
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
}

// Export the handleFormSubmission function
module.exports = handleFormSubmission;
