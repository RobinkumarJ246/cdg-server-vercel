const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const nodemailer = require('nodemailer');

const app = express();
const cors = require('cors');
const crypto = require('crypto');  // To generate random verification code

app.use(express.json()); // Parse JSON request bodies
app.use(cors());

// Generate random verification code
const generateVerificationCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();  // Generates a 6-character hex code
};

// MongoDB connection setup
const uri = "mongodb+srv://admin4321:iceberginflorida@cluster0.7nzmtv3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Register route
app.post('/api/register', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const auth = database.collection('auth');

    // Check if user with provided email already exists
    const existingUser = await auth.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists. Please login instead.' });
    }

    // Insert the user's registration data into the 'auth' collection
    const result = await auth.insertOne(req.body);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the verification code with the email and expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Expires in 10 minutes

    const emailvcodes = database.collection('emailvcodes');
    await emailvcodes.insertOne({
      email: req.body.email,
      code: verificationCode,
      expiresAt: expirationTime,
    });

    // Send the verification code via email
    const subject = 'Email Verification Code';
    const htmlContent = `
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif;">
        <header style="background-color: #f0f0f0; padding: 20px;">
          <h1 style="margin: 0; color: #333;">Email Verification Code</h1>
        </header>
        <section style="padding: 20px;">
          <p>Hello ${req.body.userName},</p>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>Please use this code to verify your email address within the next 10 minutes.</p>
        </section>
        <footer style="background-color: #f0f0f0; padding: 20px; text-align: center;">
          <p style="margin: 0;">Best regards,<br> Innovatexcel team</p>
        </footer>
      </body>
    `;

    sendCustomEmail(req.body.email, subject, htmlContent);

    res.status(200).json({ message: 'Registration successful', insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during registration' });
  } finally {
    await client.close();
  }
});

// Validate verification code
app.post('/api/validate-verification-code', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const emailvcodes = database.collection('emailvcodes');
    const auth = database.collection('auth');

    const { email, code } = req.body;

    // Find the verification code from the database
    const verification = await emailvcodes.findOne({ email, code });

    if (!verification || new Date() > new Date(verification.expiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Update the 'verifiedEmail' field to true in the 'auth' collection
    await auth.updateOne({ email }, { $set: { verifiedEmail: true } });

    res.status(200).json({ message: 'Email verification successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while validating the verification code' });
  } finally {
    await client.close();
  }
});

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'innovatexcel.team@gmail.com', // Your email address
    pass: 'bbyw zbva omrb tche', // Your email password or app-specific password if using Gmail
  },
});

// Function to send custom email
const sendCustomEmail = (toEmail, subject, htmlContent) => {
  // Email options
  const mailOptions = {
    from: 'innovatexcel.team@gmail.com', // Sender address
    to: toEmail, // Recipient address
    subject: subject, // Subject line
    html: htmlContent, // HTML content
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

// Define route for sending email
app.post('/api/welcome-mail', (req, res) => {
  try {
    const { toEmail, subject, htmlContent } = req.body;
    console.log('Request body:', req.body); // Log the request body

    // Send the email
    sendCustomEmail(toEmail, subject, htmlContent);

    // Respond with a success message
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending welcome email:', err);
    res.status(500).json({ error: 'An error occurred while sending the welcome email' });
  }
});

// Define route for PING
app.all('/api/ping', (req, res) => {
  try {
  res.status(200).json({ message: '200 OK' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred while pinging' });
  }
});

// Define route for HEAD PING
app.head('/api/ping', (req, res) => {
  try {
      res.status(200).end();  // End the response without sending any content
  } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while pinging' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const auth = database.collection('auth');

    // Find the user in the 'auth' collection
    const user = await auth.findOne({ email: req.body.email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if the provided password matches the stored password
    if (user.password !== req.body.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Authentication successful
    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during login' });
  } finally {
    await client.close();
  }
});

// Save room details route
app.post('/api/save-room', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const rooms = database.collection('rooms');

    // Insert the room details into the 'rooms' collection
    const result = await rooms.insertOne(req.body);

    res.status(200).json({ message: 'Room details saved successfully', insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while saving the room details' });
  } finally {
    await client.close();
  }
});

let onlineUsers = {};

// Join room route
app.post('/api/join-room', async (req, res) => {
  try {
    const { roomCode, userEmail } = req.body;
    await client.connect();
    const database = client.db('chatdatagen');
    const rooms = database.collection('rooms');

    // Find the room in the 'rooms' collection
    const room = await rooms.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update online users
    if (!onlineUsers[roomCode]) {
      onlineUsers[roomCode] = [];
    }
    onlineUsers[roomCode].push(userEmail);

    // Room validation successful
    res.status(200).json({ message: 'Room joined successfully', onlineUsers: onlineUsers[roomCode] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during room joining' });
  } finally {
    await client.close();
  }
});

// Leave room route
app.post('/api/leave-room', async (req, res) => {
  try {
    const { roomCode, userEmail } = req.body;

    // Remove user from online users
    if (onlineUsers[roomCode]) {
      onlineUsers[roomCode] = onlineUsers[roomCode].filter(user => user !== userEmail);
    }

    res.status(200).json({ message: 'Left the room successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while leaving the room' });
  }
});

// Check room authentication route
app.get('/api/check-auth/:roomCode', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const rooms = database.collection('rooms');

    // Find the room with the provided room code
    const room = await rooms.findOne({ roomCode: req.params.roomCode });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if the user is authenticated
    if (!req.headers.authorization || req.headers.authorization !== room.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Authentication successful
    res.status(200).json({ message: 'Authentication successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during authentication' });
  } finally {
    await client.close();
  }
});

// Get online users in a room route
app.get('/api/online-users/:code', (req, res) => {
  try {
    const code = req.params.code;
    
    if (!onlineUsers[code]) {
      onlineUsers[code] = [];
    }

    res.status(200).json({ onlineUsers: onlineUsers[code] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching online users' });
  }
});

let chatRooms = {};
/*
// Send message route
app.post('/api/send-message', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('chatdatagen');
    const rooms = database.collection('rooms');

    const { roomCode, sender, message } = req.body;

    // Check if room exists
    const room = await rooms.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Add message to the room
    if (!room.msgdata) {
      room.msgdata = [];
    }

    room.msgdata.push({ sender, content: message });

    // Update the room with the new message
    await rooms.updateOne({ roomCode }, { $set: { msgdata: room.msgdata } });

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while sending the message' });
  } finally {
    await client.close();
  }
});

// New route to fetch chat messages for a room
app.get('/api/get-messages/:code', async (req, res) => {
  try {
    const code = req.params.code;
    
    await client.connect();
    const database = client.db('chatdatagen');
    const rooms = database.collection('rooms');

    // Find the room with the provided room code
    const room = await rooms.findOne({ roomCode: code });

    if (!room || !room.msgdata) {
      return res.status(404).json({ error: 'No messages found for this room' });
    }

    res.status(200).json({ messages: room.msgdata });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching messages' });
  } finally {
    await client.close();
  }
}); */

// Generate and send verification code
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the verification code with the email and expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Expires in 10 minutes

    const emailvcodes = database.collection('emailvcodes');
    await emailvcodes.insertOne({
      email: email,
      code: verificationCode,
      expiresAt: expirationTime,
    });

    // Send the verification code via email
    const subject = 'Email Verification Code';
    const htmlContent = `
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif;">
        <header style="background-color: #f0f0f0; padding: 20px;">
          <h1 style="margin: 0; color: #333;">Email Verification Code</h1>
        </header>
        <section style="padding: 20px;">
          <p>Hello,</p>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>Please use this code to verify your email address within the next 10 minutes.</p>
        </section>
        <footer style="background-color: #f0f0f0; padding: 20px; text-align: center;">
          <p style="margin: 0;">Best regards,<br> Innovatexcel team</p>
        </footer>
      </body>
    `;

    sendCustomEmail(email, subject, htmlContent);

    res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (err) {
    console.error('Error sending verification code:', err);
    res.status(500).json({ error: 'An error occurred while sending the verification code' });
  }
});

const PORT = process.env.PORT || 3000; // Use environment variable or fallback to 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});