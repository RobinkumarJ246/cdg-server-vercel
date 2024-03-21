const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const nodemailer = require('nodemailer');

const app = express();
const cors = require('cors');

app.use(express.json()); // Parse JSON request bodies
app.use(cors());

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

    // Insert the user's registration data into the 'auth' collection
    const result = await auth.insertOne(req.body);

    res.status(200).json({ message: 'Registration successful', insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred during registration' });
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
const sendCustomEmail = (toEmail, subject, text) => {
  // Email options
  const mailOptions = {
    from: 'innovatexcel.team@gmail.com', // Sender address
    to: toEmail, // Recipient address
    subject: subject, // Subject line
    html:htmlContent, // Plain text body
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
  const { toEmail, subject, htmlContent } = req.body;

  // Send the email
  sendCustomEmail(toEmail, subject, htmlContent);

  // Respond with a success message
  res.status(200).json({ message: 'Email sent successfully' });
});

const PORT = process.env.PORT || 3000; // Use environment variable or fallback to 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});