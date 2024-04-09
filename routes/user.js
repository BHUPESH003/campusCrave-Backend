const express = require("express");

const userRouter = express.Router();
const client = require("../config/index");
const z = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {authenticateToken} = require("../MiddleWares/authMiddleWare");

const registrationSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
  phone_no: z.string().refine((data) => data.length === 10, {
    message: "Phone number should be exactly 10 digits.",
  }),
  userType: z.string().refine((type) => ["Student", "Vendor"].includes(type)),
});

// Register a new user
userRouter.post("/register", async (req, res) => {
 

  try {
    await client.query("BEGIN"); // Begin transaction

    // Validate input using Zod
    const { username, password, email, phone_no, userType } =
      registrationSchema.parse(req.body);

    // Check if the user already exists in the database
    const existingUser = await client.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "User with the same username or email already exists" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user data into the users table
    const result = await client.query(
      "INSERT INTO users (username, password, email, phone_no, userType) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [username, hashedPassword, email, phone_no, userType]
    );
    console.log(result.rows[0]);
    const userId = result.rows[0].user_id;

    // Insert mapping of username to user ID into the username_to_id table
    await client.query(
      "INSERT INTO username_to_user_id (username, user_id) VALUES ($1, $2)",
      [username, userId]
    );

    await client.query("COMMIT"); // Commit transaction

    const newUser = result.rows[0];
    res.status(201).json(newUser);
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback transaction
    console.error("Error registering user:", error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Invalid input. Please check the provided data." });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

userRouter.post("/login", async (req, res) => {
  try {
    // Validate input using Zod
    const { email, password } = loginSchema.parse(req.body);

    // Search for the user in the users table
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    // Check if the user exists
    if (result.rows.length === 1) {
      const user = result.rows[0];

      // Compare the hashed password with the provided password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        // Passwords match, generate JWT token
        const token = jwt.sign(
          { email: user.email, username: user.username },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h", // Token expiration time
          }
        );

        // Respond with the token
        res.json({ token, user });
      } else {
        // Passwords do not match
        res.status(401).json({ error: "Invalid email or password" });
      }
    } else {
      // User not found
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

userRouter.get("/orders", authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  try {
    const query = `
        SELECT * 
        FROM placed_order 
        WHERE User_ID = $1;
      `;
    const { rows } = await client.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

userRouter.get("/order/:orderId", authenticateToken, async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const query = `
      SELECT * 
      FROM placed_order 
      WHERE ID = $1;
    `;
    const { rows } = await client.query(query, [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

userRouter.post("/saveUserData", async (req, res) => {
  try {
    // Extract necessary user data from the request body
    const { userId, cartItems } = req.body;

    // Execute the SQL query to save user data (including cart information) to the database
    const query = `
      INSERT INTO user_cart (User_ID, Product_ID, Name, Cost_Per_Unit, Quantity_Ordered, Total_Amount, Image_URL)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const {
      productId,
      name,
      costPerUnit,
      quantityOrdered,
      totalAmount,
      imageUrl,
    } = cartItems;
    const values = [
      userId,
      productId,
      name,
      costPerUnit,
      quantityOrdered,
      totalAmount,
      imageUrl,
    ];

    const { rows } = await client.query(query, values);

    // Send success response with the saved user data
    res.status(200).json(rows[0]);
  } catch (error) {
    // Handle errors and send error response
    console.error("Error saving user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = userRouter;
