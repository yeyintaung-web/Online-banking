const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const connectionString = 'postgresql://postgres.iekhwfojwqurruryzydm:Yeyint2005%40%23@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: connectionString,
});

async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('[DB] Connecting to Supabase...');
    await client.query('CREATE SCHEMA IF NOT EXISTS "OnlineBanking"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "OnlineBanking"."Auth" (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password TEXT NOT NULL,
        national_id TEXT UNIQUE CHECK (length(national_id) = 6),
        date_of_birth DATE,
        user_type TEXT DEFAULT 'User',
        status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined', 'Suspended')),
        account_number TEXT UNIQUE,
        balance NUMERIC DEFAULT 0,
        phone_number TEXT,
        address_line1 TEXT,
        city TEXT,
        state_province TEXT,
        zip_postal_code TEXT,
        country TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);


    // Create Transactions Table: inside OnlineBanking schema

    await client.query(`
      CREATE TABLE IF NOT EXISTS "OnlineBanking"."Transactions" (
        id TEXT PRIMARY KEY,
        sender_id INT REFERENCES "OnlineBanking"."Auth"(id),
        receiver_id INT REFERENCES "OnlineBanking"."Auth"(id),
        amount NUMERIC NOT NULL,
        type TEXT CHECK (type IN ('Transfer', 'Deposit')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Ensure columns exist if table was already created
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS phone_number TEXT');
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS address_line1 TEXT');
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS city TEXT');
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS state_province TEXT');
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS zip_postal_code TEXT');
    await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD COLUMN IF NOT EXISTS country TEXT');

    // Add unique constraint to national_id if not already present
    try {
      await client.query('ALTER TABLE "OnlineBanking"."Auth" ADD CONSTRAINT unique_national_id UNIQUE (national_id)');
    } catch (e) { /* ignore if already exists */ }

    // One-time Sync: Force reset all existing accounts to $0.00 for the new zero-balance policy
    await client.query('UPDATE "OnlineBanking"."Auth" SET balance = COALESCE(balance, 0) WHERE balance = 1000 OR balance IS NULL');

    client.release();
    console.log('[DB] Schema ready and balances synchronized.');
  } catch (err) {
    console.error('[DB] Init Failed:', err.stack);
  }
}

// Helper: Generate Unique Transaction ID (LY + 10 digits)
function generateTxId() {
  return 'LY' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

app.post('/api/register', async (req, res) => {
  const { 
    email, full_name, password, national_id, date_of_birth,
    phone_number, address_line1, city, state_province, zip_postal_code, country 
  } = req.body;
  try {
    // 1. Check if National ID already exists
    const checkId = await pool.query('SELECT id FROM "OnlineBanking"."Auth" WHERE national_id = $1', [national_id]);
    if (checkId.rows.length > 0) {
      return res.status(400).json({ error: 'National ID is already registered. Please use your own ID.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique 10-digit account number (starting with 100...)
    const accountNumber = '100' + Math.floor(1000000 + Math.random() * 9000000).toString();

    const result = await pool.query(
      `INSERT INTO "OnlineBanking"."Auth" (
        email, full_name, password, national_id, date_of_birth, 
        phone_number, address_line1, city, state_province, zip_postal_code, country,
        status, account_number, balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending', $12, 0.00) 
      RETURNING id, email, full_name, user_type, status, account_number`,
      [
        email, full_name, hashedPassword, national_id, date_of_birth, 
        phone_number, address_line1, city, state_province, zip_postal_code, country,
        accountNumber
      ]
    );
    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval.',
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'User already exists' });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "OnlineBanking"."Auth" WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User does not exist' });
    const user = result.rows[0];

    // Check account status
    if (user.status === 'Declined') return res.status(403).json({ error: 'Account has been declined' });
    if (user.status === 'Suspended') return res.status(403).json({ error: 'Account has been suspended/paused. Please contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect email or password' });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        status: user.status,
        account_number: user.account_number,
        balance: user.balance,
        date_of_birth: user.date_of_birth,
        phone_number: user.phone_number,
        address_line1: user.address_line1,
        city: user.city,
        state_province: user.state_province,
        zip_postal_code: user.zip_postal_code,
        country: user.country,
        national_id: user.national_id
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin: Fetch Pending Users
app.get('/api/admin/pending-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "OnlineBanking"."Auth" WHERE status = \'Pending\' AND user_type = \'User\'');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Admin: Update User Status (Approve/Decline/Suspend)
app.post('/api/admin/update-status', async (req, res) => {
  let { userId, newStatus } = req.body;

  try {
    // Normalize status to PascalCase
    if (typeof newStatus === 'string') {
      newStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();
    }

    if (!['Approved', 'Declined', 'Suspended'].includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query('UPDATE "OnlineBanking"."Auth" SET status = $1 WHERE id = $2', [newStatus, userId]);
    res.json({ success: true, message: `User account has been ${newStatus.toLowerCase()} successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Admin: Fetch All Users (for Management)
app.get('/api/admin/all-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "OnlineBanking"."Auth" WHERE user_type = \'User\' ORDER BY full_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Delete User Permanently
app.post('/api/admin/delete-user', async (req, res) => {
  const { userId, adminId, adminPassword } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete related transactions first to satisfy foreign key constraints
    await client.query('DELETE FROM "OnlineBanking"."Transactions" WHERE sender_id = $1 OR receiver_id = $1', [userId]);
    // Delete user
    const resAuth = await client.query('DELETE FROM "OnlineBanking"."Auth" WHERE id = $1', [userId]);

    if (resAuth.rowCount === 0) throw new Error('User not found');

    await client.query('COMMIT');
    res.json({ success: true, message: 'User account and history deleted permanently.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Deletion failed' });
  } finally {
    client.release();
  }
});

// Admin: Fetch Global Bank Stats (Total Assets, Total Users, Status Breakdown)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT count(*) FROM "OnlineBanking"."Auth" WHERE user_type = \'User\'');
    const balanceSum = await pool.query('SELECT sum(balance) FROM "OnlineBanking"."Auth"');
    const approvedCount = await pool.query('SELECT count(*) FROM "OnlineBanking"."Auth" WHERE LOWER(status) = \'approved\' AND user_type = \'User\'');
    const pendingCount = await pool.query('SELECT count(*) FROM "OnlineBanking"."Auth" WHERE LOWER(status) = \'pending\' AND user_type = \'User\'');
    const suspendedCount = await pool.query('SELECT count(*) FROM "OnlineBanking"."Auth" WHERE LOWER(status) = \'suspended\' AND user_type = \'User\'');

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalBalance: parseFloat(balanceSum.rows[0].sum || 0).toFixed(2),
      approvedCount: parseInt(approvedCount.rows[0].count),
      pendingCount: parseInt(pendingCount.rows[0].count),
      suspendedCount: parseInt(suspendedCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bank statistics' });
  }
});

// Admin: Fetch Global Transaction History
app.get('/api/admin/all-transactions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*, 
        s.full_name as sender_name, 
        s.account_number as sender_account,
        r.full_name as receiver_name,
        r.account_number as receiver_account
      FROM "OnlineBanking"."Transactions" t
      LEFT JOIN "OnlineBanking"."Auth" s ON t.sender_id = s.id
      LEFT JOIN "OnlineBanking"."Auth" r ON t.receiver_id = r.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Admin: Save/Update Private Notes for a User
app.post('/api/admin/update-notes', async (req, res) => {
  const { userId, notes } = req.body;
  try {
    await pool.query('UPDATE "OnlineBanking"."Auth" SET admin_notes = $1 WHERE id = $2', [notes, userId]);
    res.json({ success: true, message: 'Notes saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

app.post('/api/admin/deposit', async (req, res) => {
  const { userId, amount, adminId, adminPassword } = req.body;
  const numAmount = parseFloat(amount);

  try {
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid positive amount' });
    }

    // 1. Check user status first - Only 'Approved' accounts can receive money
    const userResult = await pool.query('SELECT status FROM "OnlineBanking"."Auth" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (userResult.rows[0].status?.toLowerCase() !== 'approved') {
      return res.status(400).json({ error: 'Cannot deposit into an inactive or suspended account. Please activate the account first.' });
    }

    await pool.query('UPDATE "OnlineBanking"."Auth" SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [numAmount, userId]);
    
    const txId = generateTxId();

    // Recording as a special 'Deposit' transaction (sender_id 0 or null represents Admin/Bank)
    await pool.query(
      'INSERT INTO "OnlineBanking"."Transactions" (id, sender_id, receiver_id, amount, type) VALUES ($1, $2, $3, $4, \'Deposit\')',
      [txId, null, userId, numAmount]
    );

    res.json({ success: true, message: `Successfully deposited $${numAmount.toFixed(2)} into user account.` });
  } catch (err) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// User: Verify Account Number (Look up name before transfer)
app.get('/api/user/verify-account/:accountNumber', async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const result = await pool.query('SELECT full_name FROM "OnlineBanking"."Auth" WHERE account_number = $1', [accountNumber]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient account number not found' });
    }
    res.json({ success: true, fullName: result.rows[0].full_name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify account' });
  }
});

// User: Transfer Money
app.post('/api/user/transfer', async (req, res) => {
  const { senderId, recipientAccountNumber, amount, password } = req.body;
  const numAmount = parseFloat(amount);

  if (numAmount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Verify Password
    const authResult = await client.query('SELECT password FROM "OnlineBanking"."Auth" WHERE id = $1', [senderId]);
    const isMatch = await bcrypt.compare(password, authResult.rows[0].password);
    if (!isMatch) throw new Error('Incorrect password');

    // 1. Check Sender Status and Balance
    const senderResult = await client.query('SELECT balance, status FROM "OnlineBanking"."Auth" WHERE id = $1 FOR UPDATE', [senderId]);

    if (senderResult.rows[0].status !== 'Approved') {
      throw new Error('Account must be approved by admin before transferring');
    }

    if (parseFloat(senderResult.rows[0].balance) < numAmount) {
      throw new Error('Insufficient balance');
    }

    // 2. Find Recipient
    const recipientResult = await client.query('SELECT id, status FROM "OnlineBanking"."Auth" WHERE account_number = $1 FOR UPDATE', [recipientAccountNumber]);
    if (recipientResult.rows.length === 0) {
      throw new Error('Recipient account number not found');
    }
    const recipientId = recipientResult.rows[0].id;
    const recipientStatus = (recipientResult.rows[0].status || '').toLowerCase();

    if (recipientStatus !== 'approved') {
      throw new Error('Recipient account is not active (Pending or Suspended). Transfer failed.');
    }

    if (senderId === recipientId) throw new Error('Cannot transfer to yourself');

    // 3. Deduct from Sender
    await client.query('UPDATE "OnlineBanking"."Auth" SET balance = balance - $1 WHERE id = $2', [numAmount, senderId]);

    // 4. Add to Recipient
    await client.query('UPDATE "OnlineBanking"."Auth" SET balance = balance + $1 WHERE id = $2', [numAmount, recipientId]);

    const txId = generateTxId();

    // 5. Record Transaction
    await client.query(
      'INSERT INTO "OnlineBanking"."Transactions" (id, sender_id, receiver_id, amount, type) VALUES ($1, $2, $3, $4, \'Transfer\')',
      [txId, senderId, recipientId, numAmount]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Transfer successful!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// User: Fetch Dashboard Details (Latest Balance + Transactions + Status)
app.get('/api/user/details/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await pool.query('SELECT * FROM "OnlineBanking"."Auth" WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const transRes = await pool.query(`
      SELECT t.*, s.full_name as sender_name, r.full_name as receiver_name 
      FROM "OnlineBanking"."Transactions" t
      LEFT JOIN "OnlineBanking"."Auth" s ON t.sender_id = s.id
      LEFT JOIN "OnlineBanking"."Auth" r ON t.receiver_id = r.id
      WHERE t.sender_id = $1 OR t.receiver_id = $1
      ORDER BY t.created_at DESC LIMIT 10
    `, [userId]);

    res.json({
      ...userRes.rows[0],
      transactions: transRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

app.listen(port, () => {
  console.log(`[SERVER] listening on Port ${port}`);
  initializeDatabase();
});

// Explicitly keep alive
setInterval(() => { }, 1000 * 60 * 60);
