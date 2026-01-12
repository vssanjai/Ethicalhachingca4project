import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import { fileURLToPath } from "url";

import "./db.js";
import User from "./models/User.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import OrderItem from "./models/OrderItem.js";

dotenv.config();

/* ---------- PATH SETUP ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- APP SETUP ---------- */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- SESSION SETUP ---------- */
app.use(
  session({
    secret: "seller-session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

const SELLER_PASSWORD = "seller123";

/* ======================================================
   CUSTOMER ROUTE
   ====================================================== */
app.post("/send-invoice", async (req, res) => {
  try {
    const {
      orderId,
      name,
      email,
      phone,
      address1,
      address2,
      amount,
      cart,
      transactionId,
    } = req.body;

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    if (!email.endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only Gmail allowed" });
    }

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const fullAddress = `${address1}${address2 ? ", " + address2 : ""}`;

    const user = await User.create({
      name,
      email,
      phone,
      address: fullAddress,
    });

    const order = await Order.create({
      userId: user._id,
      totalAmount: amount,
      status: "Placed",
      transactionId,
    });

    for (const item of cart) {
      const product = await Product.create({
        productId: item.id,
        name: item.name,
        price: item.price,
      });

      await OrderItem.create({
        orderId: order._id,
        productId: product._id,
        qty: item.qty,
        price: item.price,
      });
    }

    /* ---------- PDF ---------- */
    const invoicePath = path.join(__dirname, `invoice-${orderId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(invoicePath));

    doc.fontSize(22).text("AuraGift Atelier", 200, 50);
    doc.moveDown();
    doc.text(`Invoice No: ${orderId}`);
    doc.text(`Transaction ID: ${transactionId}`);
    doc.text(`Total: ₹${amount}`);
    doc.end();

    await new Promise((r) => setTimeout(r, 500));

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Invoice ${orderId}`,
      attachments: [{ filename: "invoice.pdf", path: invoicePath }],
    });

    fs.unlinkSync(invoicePath);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Invoice failed" });
  }
});

/* ======================================================
   SELLER LOGIN
   ====================================================== */
app.get("/seller/login", (req, res) => {
  res.send(`
    <h3>Seller Login</h3>
    <form method="POST" action="/seller/login">
      <input type="password" name="password" />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/seller/login", (req, res) => {
  if (req.body.password === SELLER_PASSWORD) {
    req.session.isSeller = true;
    res.redirect("/seller/orders?key=authorized");
  } else {
    res.send("Wrong password");
  }
});

/* ======================================================
   SELLER ORDERS
   ====================================================== */
app.get("/seller/orders", async (req, res) => {
  if (!req.session.isSeller || req.query.key !== "authorized") {
    return res.redirect("/seller/login");
  }

  const orders = await Order.find().populate("userId");

  let html = `<h2>Seller Orders</h2>`;

  for (const order of orders) {
    html += `
      <div>
        <b>${order.userId.name}</b><br>
        Phone: ${order.userId.phone}<br>
        Total: ₹${order.totalAmount}<br>
        Transaction ID: ${order.transactionId}
      </div><hr/>
    `;
  }

  res.send(html);
});

/* ======================================================
   🔥 NOSQL INJECTION DEMO (INTENTIONALLY VULNERABLE)
   ====================================================== */
app.get("/demo/users", async (req, res) => {
  try {
    // ❌ UNSAFE: NoSQL Injection possible
    const users = await User.find(req.query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   SERVER (MUST BE LAST)
   ====================================================== */
app.listen(5001, () => {
  console.log("Backend running on http://localhost:5001");
});
