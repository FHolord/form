const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const credentials = require('./vast-cogency-432503-i4-5d47cd667ca9.json');

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = '1fFo9UKr7IGE4Qscy35fo-lnNsYQj9o481uQjfF1ZPHM';

let isGeneratingId = false; // Lock to ensure atomic ID generation

async function updateGoogleSheet(formData) {
    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'Giselle!A2:A';

    try {
        // Wait until we can acquire the lock
        while (isGeneratingId) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait for 50 ms
        }
        
        isGeneratingId = true; // Acquire the lock

        // Fetch existing Form IDs to determine the next ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const formIds = response.data.values ? response.data.values.flat()
            .map(value => Number(value.replace(/^A/, ''))) // Remove 'A' for number conversion
            .filter(value => !isNaN(value)) : [];

        let nextFormId = 1;
        
        // Generate a unique Form ID
        while (formIds.includes(nextFormId)) {
            nextFormId++;
        }

        const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
        const newRow = [[`A${nextFormId}`, formData.coffeeType, timestamp]]; // Add timestamp to the new row
        const appendRange = 'Giselle!A:C'; // Update range to include the timestamp

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: appendRange,
            valueInputOption: 'RAW',
            requestBody: { values: newRow },
        });

        return `A${nextFormId}`; // Return formatted Form ID
    } catch (error) {
        console.error('Error updating Google Sheet:', error);
        return null;
    } finally {
        isGeneratingId = false; // Release the lock
    }
}

app.post('/submit-form', async (req, res) => {
  const coffeeType = req.body.coffeeType;
  console.log(`Received form data: ${JSON.stringify({ coffeeType })}`);

  if (!coffeeType) {
      console.error('Invalid form data received:', { coffeeType });
      return res.status(400).json({ success: false, message: 'Invalid form data.' });
  }

  const formId = await updateGoogleSheet({ coffeeType });

  if (formId === null) {
      console.error('Failed to generate Form ID');
      return res.status(500).json({ success: false, message: 'Failed to generate Form ID.' });
  }

  console.log('Form submitted successfully with ID:', formId);
  res.json({ success: true, formId });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
