import React, { useState } from "react";
import "../index.css";

export default function Checkout({ cart, totalAmount }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    payment: "gpay",
    transactionId: "", // ✅ ADDED
  });

  const [showBill, setShowBill] = useState(false);
  const [loading, setLoading] = useState(false);

  const orderId = `AURA-${Date.now().toString().slice(-6)}`;
  const today = new Date().toLocaleString("en-IN");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // 📞 Allow only digits & max 10 for phone
    if (name === "phone") {
      if (!/^\d{0,10}$/.test(value)) return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  // 📱 WhatsApp confirmation
  const sendWhatsApp = () => {
    const message = `
🛍️ AuraGift Atelier – Order Confirmed

Order ID: ${orderId}
Name: ${form.name}
Amount: ₹${totalAmount}
Payment: GPay
Transaction ID: ${form.transactionId}

Invoice has been sent to your email 📧
Thank you 💝
`;

    window.open(
      `https://wa.me/91${form.phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ❌ Validation
    if (!/^\d{10}$/.test(form.phone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    if (!form.email.endsWith("@gmail.com")) {
      alert("Only Gmail addresses are allowed");
      return;
    }

    // ✅ ADDED validation
    if (!form.transactionId.trim()) {
      alert("Please enter UPI Transaction ID after payment");
      return;
    }

    if (!cart.length) {
      alert("Cart is empty");
      return;
    }

    try {
      setLoading(true);

      await fetch("http://localhost:5001/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address1: form.address1,
          address2: form.address2,
          transactionId: form.transactionId, // ✅ ADDED
          amount: totalAmount,
          cart: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
          })),
        }),
      });

      sendWhatsApp();
      setShowBill(true);
    } catch (err) {
      alert("Something went wrong while sending email");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-with-header" style={{ maxWidth: 900 }}>
      <h1>Checkout</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <input
          className="input"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          className="input"
          name="email"
          placeholder="Gmail Address"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          className="input"
          name="phone"
          placeholder="10 Digit Phone Number"
          value={form.phone}
          onChange={handleChange}
          maxLength={10}
          required
        />

        <input
          className="input"
          name="address1"
          placeholder="Address Line 1"
          value={form.address1}
          onChange={handleChange}
          required
        />

        <input
          className="input"
          name="address2"
          placeholder="Address Line 2 (Optional)"
          value={form.address2}
          onChange={handleChange}
        />

        {/* 🔥 GPay QR Code Section (REAL BLOCK ADDED) */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p><strong>Scan & Pay using GPay</strong></p>

          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src="/gpay-qr-code.webp"
              alt="GPay QR Code"
              style={{
                width: 220,
                height: "auto",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                background: "#fff",
              }}
            />

            {/* 🚫 Overlay blocks scanning */}
            {!form.transactionId && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                  textAlign: "center",
                  padding: 10,
                }}
              >
                Enter UPI Transaction ID to unlock QR
              </div>
            )}
          </div>

          <p style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
            After payment, enter Transaction ID below
          </p>
        </div>

        {/* ✅ Transaction ID input (ADDED) */}
        <input
          className="input"
          name="transactionId"
          placeholder="UPI Transaction ID"
          value={form.transactionId}
          onChange={handleChange}
          required
        />

        <button className="btn" disabled={loading}>
          {loading ? "Processing..." : "Place Order & Send Invoice"}
        </button>
      </form>

      {showBill && (
        <div className="bill-card">
          <h3>Order Successful ✅</h3>
          <p>Order ID: {orderId}</p>
          <p>Date: {today}</p>
          <p>Total: ₹{totalAmount}</p>
          <p>Transaction ID: {form.transactionId}</p>
          <p>
            📧 Invoice sent to <strong>{form.email}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
