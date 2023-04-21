const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");

process.env.NODE_ENV != "production" ? require("dotenv").config() : "";
let botActivo = false;
const app = express();
app.use(express.json())
app.use(cors({origin: true}));
const port = process.env.PORT || 3000
const server = require('http').Server(app)

// NodeMailer
app.post("/email/", (req, res) => {
  const {to, subject, html, from} = req.body;
  console.log(to, subject, html, from)
  const isValidMessage = to && subject && html;

  if (!isValidMessage) {
    return res.status(400).send({message: "invalid request"});
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE, // upgrade later with STARTTLS
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
    tls: {rejectUnauthorized: false}
  });

  const mailOptions = {
    from: `${from} <${process.env.EMAIL}>`,
    to,
    subject,
    html,
  };

  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      return res.status(500).send({message: "error:" + err.message});
    }

    return res.send({message: "Email sent"});
  });
});

// Whatsapp-web.js
app.post("/whatsapp/", async (req, res) => {
  const {number, message, media} = req.body;
  console.log(number, message, media);
  if (botActivo) {
    await client.sendMessage(`${number}@c.us`, message.replace(/--/g, "\n"));
    if (media){
      const mediaToSend = MessageMedia.fromFilePath(media);
      await client.sendMessage(`${number}@c.us`, mediaToSend);
    }
    return res.send({message: "Mensaje enviado"});
  } else {
    return res.status(500).send({message: "El backend aun no está listo"});
  }
});

app.get("/", (req, res) => {
  if (botActivo) {
    return res.status(200).send({message: "Backend listo :)"});
  } else {
    return res.status(500).send({message: "El backend aun no está listo"});
  }
});


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
      headless: false,
      executablePath: process.env.CHROME_PATH,
     }
});

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
    botActivo = true;
});


client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_state', state => {
    console.log('CHANGE STATE', state );
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

server.listen(port, () => {
  console.log(`El server esta listo por el puerto ${port}`);
})