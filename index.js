const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getOrder, storeOrder, updateOrderStatus } = require("./routes/Orders");

const rootRouter = require("./routes/index");
const Stripe = require("stripe");
const { authenticateToken } = require("./MiddleWares/authMiddleWare");
const { verifyToken } = require("./MiddleWares/authMiddleWare");

const { getVendorStats } = require("./routes/vendor");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", rootRouter);

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: "2020-08-27", // Specify the API version (optional)
});

app.get("/verify-token", authenticateToken, (req, res) => {
  const userName = req.user.username; // Assuming userId is included in the token payload
  const email = req.user.email;

  res.json({ userName, email });
});
app.get("/vendor/verify-token", verifyToken, (req, res) => {
  const vendorId = req.vendorId;
  // Perform actions with vendorId
  res.json({ vendorId });
});

// Endpoint to create a checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    // Extract product data and customer information from the request body
    const { userId, products } = req.body;

    // Store the order in the database and retrieve the order details
    const orderId = await storeOrder({ products, userId });
    console.log(orderId);
    const order = await getOrder(orderId);

    // Prepare line items for the checkout session
    const lineItems = order.itemsOrdered.map((product) => ({
      price_data: {
        currency: "inr", // Set the currency as INR
        product_data: {
          name: product.itemname, // Set the item name
        },
        unit_amount: Math.round(product.price * 100), // Convert price to smallest currency unit (e.g., cents)
      },
      quantity: product.quantity, // Set the quantity
    }));

    // Create a checkout session with Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "http://localhost:5173/success", // URL to redirect after successful payment
      cancel_url: "http://localhost:5173/failed", // URL to redirect after payment cancellation
      metadata: {
        orderId: orderId, // Include orderId in metadata
      },
    });

    // Return the session ID to the client
    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/webhook", async (req, res) => {
  try {
    // Extract the event data from the request body
    const event = req.body;
    // console.log(event.data.object.metadata.orderId);
    const orderId = event.data.object.metadata.orderId;
    console.log(event.data);

    // Handle different types of events
    switch (event.type) {
      case "customer.created":
        // Extract relevant data from the event
        console.log("HERE");
        console.log("OrderId: customer", orderId);

      case "payment_intent.succeeded":
        // Extract relevant data from the event

        console.log("OrderId: payment", orderId);
        // Update the corresponding order in the database
        await updateOrderStatus(orderId, "Recieved");

        res.status(200).json({ received: true });
        break;
      // Handle other event types as needed
      default:
        console.log("Unhandled event type:", event.type);
        res.status(200).json({ received: false });
    }
  } catch (error) {
    console.error("Error processing webhook event:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("vendor/stats/:vendorId", async (req, res) => {
  const { vendorId } = req.params;

  try {
    const stats = await getVendorStats(vendorId);
    res.json(stats);
  } catch (error) {
    console.error("Error getting vendor stats:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/getUploadUrl", async (req, res) => {
  try {
    // Call the getUploadURL function passing the request object
    const response = await getUploadURL(req);
    // Send the response back to the client
    res.status(200).json(response);
  } catch (error) {
    // If there's an error, send an error response
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/", async (req, res) => {
  res.status(200).json("Hello from server");
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
