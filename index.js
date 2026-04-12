const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. DATABASE CONNECTION (The 80,000,000 Vault)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. FLUTTERWAVE CONFIGURATION
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-56359664f919bfed0984bacfa280cd7c-X';

// 3. THE "RELEASE SMILE" ENGINE
async function releaseSmile(amount, account_number, bank_code) {
  try {
    const response = await axios.post('https://api.flutterwave.com/v3/transfers', {
      account_bank: bank_code,
      account_number: account_number,
      amount: amount,
      currency: "NGN",
      narration: "Project Dioscuri Relief Fund",
      reference: "PLP-" + Date.now(),
      callback_url: "https://dioscuri-relief.onrender.com/webhook"
    }, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Transfer Error:", error.response ? error.response.data : error.message);
    throw error;
  }
}

// 4. API ENDPOINT TO TRIGGER PAYOUT
app.post('/release-smile', async (req, res) => {
  const { amount, account_number, bank_code } = req.body;
  try {
    const result = await releaseSmile(amount, account_number, bank_code);
    res.json({ status: "Success", message: "Smile Released!", data: result });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 5. SERVER STARTUP
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 Engine Online');
  console.log(`Port: ${PORT}`);
});
