import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// Ticket schema
const ticketSchema = new mongoose.Schema({
  passenger_id: String,
  start_lat: Number,
  start_lng: Number,
  end_lat: Number,
  end_lng: Number,
  distance_km: Number,
  fare: Number
});

const Ticket = mongoose.model("Ticket", ticketSchema);

// Serve static HTML
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// GET all tickets
app.get("/api/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find({});
    const totalFare = tickets.reduce((sum, t) => sum + t.fare, 0);
    res.json({ tickets, totalFare });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new ticket and calculate fare safely
app.post("/api/tickets", async (req, res) => {
  const { passenger_id, start_lat, start_lng, end_lat, end_lng } = req.body;

  if (!passenger_id || !start_lat || !start_lng || !end_lat || !end_lng) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Call ORS API to get distance
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?start=${start_lng},${start_lat}&end=${end_lng},${end_lat}`,
      { headers: { Authorization: process.env.ORS_API_KEY } }
    );

    const data = await response.json();
    console.log("ORS Response:", data);

    // Check if ORS returned a valid route
    if (!data.features || data.features.length === 0) {
      return res.status(400).json({ error: "ORS API returned no route. Check coordinates or API key." });
    }

    const distance_km = data.features[0].properties.summary.distance / 1000;
    const fare = distance_km * 50; // Rs 50 per km

    // Save ticket to MongoDB
    const ticket = new Ticket({ passenger_id, start_lat, start_lng, end_lat, end_lng, distance_km, fare });
    await ticket.save();

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate fare. " + err.message });
  }
});

// Test route
app.get("/", (req, res) => res.send("Smart Fare Backend Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
