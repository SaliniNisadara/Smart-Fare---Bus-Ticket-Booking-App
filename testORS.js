import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const ORS_KEY = process.env.ORS_API_KEY;

async function testORS() {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?start=80.0250,9.6610&end=80.0150,9.6781`,
      { headers: { Authorization: ORS_KEY } }
    );
    const data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

testORS();
