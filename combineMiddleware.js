const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = '1fFo9UKr7IGE4Qscy35fo-lnNsYQj9o481uQjfF1ZPHM';

// Function to parse date strings in 'DD/MM/YYYY, HH:mm:ss a' format
function parseDateString(dateString) {
  const [datePart, timePart] = dateString.split(', ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [time, modifier] = timePart.split(' ');

  const [hours, minutes, seconds] = time.split(':').map(Number);
  const adjustedHours = modifier.toLowerCase() === 'pm' && hours < 12 ? hours + 12 : hours;
  const finalDate = new Date(year, month - 1, day, adjustedHours, minutes, seconds);
  
  return finalDate;
}

// Middleware function to combine and sort data from Giselle and peepee sheets
async function combineSheetsData(req, res, next) {
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Fetch data from "Giselle" sheet
    const giselleData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Giselle!A2:C', // Adjust range if necessary
    });
    const giselleRows = giselleData.data.values || [];

    // Fetch data from "peepee" sheet
    const peepeeData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'peepee!A2:C', // Adjust range if necessary
    });
    const peepeeRows = peepeeData.data.values || [];

    // Combine the data from both sheets
    const combinedRows = [...giselleRows, ...peepeeRows];

    // Sort the combined data based on the timestamp (column C, index 2)
    const sortedRows = combinedRows.sort((a, b) => {
      const dateA = parseDateString(a[2]); // Assuming timestamp is in column C (index 2)
      const dateB = parseDateString(b[2]);
      return dateA - dateB; // Sort in ascending order (earliest first)
    });

    // Clear the "Combined sheet" before inserting new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Combined sheet!A2:C', // Adjust range as necessary
    });

    // Append the sorted data to the "Combined sheet"
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Combined sheet!A2', // Start inserting at the top (or adjust range as needed)
      valueInputOption: 'RAW',
      requestBody: { values: sortedRows },
    });

    console.log('Data combined and inserted into the Combined sheet successfully.');
    
    // Call next middleware if in an express route
    if (next) next(); // Call next middleware if available
    else return { success: true }; // Return success if called directly

  } catch (error) {
    console.error('Error combining sheets:', error);
    if (res) {
      res.status(500).json({ success: false, message: 'Failed to combine sheets.' });
    } else {
      throw error; // Rethrow error if not in express context
    }
  }
}

// Export the middleware function
module.exports = combineSheetsData;
