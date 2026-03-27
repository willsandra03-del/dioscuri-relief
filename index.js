const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

// --- 1. RAILWAY HEALTHCHECK (Fixes the "Failed" status) ---
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('Dioscuri Engine Live'));

// --- 2. DATABASE CONFIG ---
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- 3. MONNIFY AUTH ENGINE ---
async function getMonnifyToken() {
  const auth = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString('base64');
  const res = await axios.post('https://sandbox.monnify.com/api/v1/auth/login', {}, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.responseBody.accessToken;
}

// --- 4. THE MAIN MISSION: RELEASE SMILE ---
app.post('/release-smile', async (req, res) => {
  const { amountInNaira, destinationAccountNumber, destinationBankCode } = req.body;

  try {
    // TRIGGER MONNIFY DISBURSEMENT
    const token = await getMonnifyToken();
    const monnifyResponse = await axios.post(
      'https://sandbox.monnify.com/api/v1/disbursements/single',
      {
        amount: amountInNaira,
        reference: 'PLP-' + Date.now(),
        narration: "Project Dioscuri - Smile Released",
        destinationBankCode: destinationBankCode,
        destinationAccountNumber: destinationAccountNumber,
        currency: "NGN",
        sourceAccountNumber: "6986178814" 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // LOG TO YOUR LOCAL LEDGER
    await db.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = 1", 
      [amountInNaira]
    );

    res.status(200).json({ 
      status: "Target Hit", 
      message: "Funds Sent & Ledger Updated",
      data: monnifyResponse.data 
    });

  } catch (err) {
    console.error("Mission Failed:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Handshake Failed", detail: err.message });
  }
});

// --- 5. THE ENGINE START ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Engine Online');
  console.log(`Port: ${PORT}`);
});
