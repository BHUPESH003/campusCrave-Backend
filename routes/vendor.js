const express = require("express");
const vendorRouter = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const client = require("../config/index");
const { v4: uuidv4 } = require("uuid");
const {getUploadURL} =require('./uploadImage');

const { verifyToken } = require("../MiddleWares/authMiddleWare");

// const vendorSchema = z.object({
//   username: z.string().min(3),
//   vendorName: z.string().min(3),
//   vendorDesc: z.string(),
//   imagePath: z.string(),
// });
// vendorRouter.put("/details", async (req, res) => {
//   try {
//     // Validate input using Zod
//     const { username, vendorName, vendorDesc, imagePath } = vendorSchema.parse(
//       req.body
//     );

//     // Retrieve the User_ID from the users table based on the provided username
//     const userResult = await client.query(
//       "SELECT user_id FROM users WHERE username = $1",
//       [username]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const user_Id = userResult.rows[0].user_id;
//     // Insert the new vendor into the vendors table
//     const result = await client.query(
//       "INSERT INTO vendors (user_id, vendor_name, vendor_desc, image_path) VALUES ($1, $2, $3, $4) RETURNING *",
//       [user_Id, vendorName, vendorDesc, imagePath]
//     );

//     // Respond with the newly created vendor
//     const newVendor = result.rows[0];
//     const vendorId = result.rows[0].vendor_id;
//     const ratingResult = await client.query(
//       "INSERT INTO vendor_ratings (Vendor_ID, Overall_Rating, Comment) VALUES ($1, $2, $3) RETURNING *",
//       [vendorId, 0, "Initial Comment"]
//     );
//     res.status(201).json(newVendor);
//   } catch (error) {
//     console.error("Error creating a new vendor:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(5),
});

// Vendor login route
vendorRouter.post("/login", async (req, res) => {
  try {
    // Validate input using Zod
    const { username, password } = loginSchema.parse(req.body);

    // Retrieve vendor information from the vendors table
    const result = await client.query(
      "SELECT * FROM vendors v JOIN vendorLogin u ON v.user_id = u.user_id WHERE u.username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const vendor = result.rows[0];

    // Check if the provided password matches the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, vendor.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create a JWT token for the vendor
    const token = jwt.sign(
      { vendorId: vendor.vendor_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Respond with the JWT token
    res.json({ token });
  } catch (error) {
    console.error("Error during vendor login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

vendorRouter.post("/register", async (req, res) => {
  const {
    username,
    password,
    email,
    vendorName,
    vendorDesc,
    imagePath,
    avg_time,
  } = req.body;

  try {
    // Check if the username or email is already registered
    const existingUser = await client.query(
      "SELECT * FROM vendorLogin WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique User_ID and Vendor_ID
    const userId = Math.floor(Math.random() * 100) + 1;
    const vendorId = Math.floor(Math.random() * 100) + 1;

    // Start a transaction to insert user and vendor data
    await client.query("BEGIN");

    // Insert user data into the users table
    await client.query(
      "INSERT INTO vendorLogin (User_ID, Username, Password, Email) VALUES ($1, $2, $3, $4)",
      [userId, username, hashedPassword, email]
    );

    // Insert vendor data into the vendors table
    await client.query(
      "INSERT INTO vendors (Vendor_ID, User_ID, Vendor_Name, Vendor_Desc, Image_Path,avg_time) VALUES ($1, $2, $3, $4, $5,$6)",
      [vendorId, userId, vendorName, vendorDesc, imagePath, avg_time]
    );

    // Commit the transaction
    await client.query("COMMIT");

    res.status(201).json({ message: "Vendor registered successfully" });
  } catch (error) {
    // Rollback the transaction if any error occurs
    await client.query("ROLLBACK");
    console.error("Error registering vendor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

vendorRouter.get("/all", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT vendors.*, vendor_ratings.Overall_Rating
      FROM vendors
      LEFT JOIN vendor_ratings ON vendors.Vendor_ID = vendor_ratings.Vendor_ID;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching vendors with ratings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Get details of one specific vendor by ID

vendorRouter.get("/:vendorId/items", async (req, res) => {
  const vendorId = req.params.vendorId;

  try {
    const query = `
    SELECT menu_items.*, vendors.*, 
             AVG(vendor_ratings.overall_rating) as vendor_avg_rating, 
             AVG(item_ratings.item_rating) as item_avg_rating
      FROM menu_items
      INNER JOIN vendors ON menu_items.Vendor_ID = vendors.Vendor_ID
      LEFT JOIN vendor_ratings ON vendors.Vendor_ID = vendor_ratings.Vendor_ID
      LEFT JOIN item_ratings ON menu_items.Item_ID = item_ratings.Item_ID
      WHERE vendors.Vendor_ID = $1
      GROUP BY menu_items.Item_ID, vendors.Vendor_ID;
    `;
    const result = await client.query(query, [vendorId]);
    const menuItems = result.rows;
    res.json(menuItems);
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).send("Internal Server Error");
  }
});

vendorRouter.post("/:vendorId/item", async (req, res) => {
  const vendorId = req.params.vendorId;

  // Generate a random Item_ID between 1 and 100
  console.log(req.body);
  const itemId = Math.floor(Math.random() * 100) + 1;
  try {
    // Check if an item with the same name already exists
    const checkQuery = `
      SELECT COUNT(*) AS count
      FROM menu_items
      WHERE Item_Name = $1;
    `;
    const checkResult = await client.query(checkQuery, [req.body.itemName]);
    const itemExists = checkResult.rows[0].count > 0;

    if (itemExists) {
      // If the item already exists, return an error
      return res
        .status(400)
        .json({ error: "Item with the same name already exists" });
    } else {
      // If the item does not exist, insert the new item into the menu_items table
      const insertQuery = `
        INSERT INTO menu_items (Vendor_ID, Item_ID, Category_ID, Item_Name, Item_Description, Price, Image_URL)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const result = await client.query(insertQuery, [
        vendorId,
        itemId,
        req.body.category, // Assuming you have categoryId in the request body
        req.body.item_name,
        req.body.description,
        req.body.price,
        req.body.imageUrl,
      ]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).send("Internal Server Error");
  }
});
async function getVendorStats(vendorId) {
  try {
    const result = await client.query(
      `SELECT
        COUNT(DISTINCT po.id) AS total_orders,
        SUM(io.quantity) AS total_items_sold,
        SUM(po.price) AS total_amount
      FROM
        placed_order po
      INNER JOIN
        itemsordered io ON po.id = io.orderid
      WHERE
        po.vendor_id = $1`,
      [vendorId]
    );

    const { total_orders, total_items_sold, total_amount } = result.rows[0];

    return {
      total_orders,
      total_items_sold,
      total_amount,
    };
  } catch (error) {
    console.error("Error executing query", error);
    throw new Error("Error retrieving vendor stats");
  }
}

vendorRouter.put("/item/:itemId", verifyToken, async (req, res) => {
  const itemId = req.params.itemId;
  const { itemName, itemDesc, itemPrice, itemImage } = req.body;

  try {
    const query = `
      UPDATE menu_items
      SET Item_Name = $1, Item_Description = $2, Price = $3, Image_URL = $4
      WHERE Item_ID = $5
      RETURNING *;
    `;
    const result = await client.query(query, [
      itemName,
      itemDesc,
      itemPrice,
      itemImage,
      itemId,
    ]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).send("Internal Server Error");
  }
});
vendorRouter.post("/getUploadUrl", async (req, res) => {
  try {
    console.log("here");
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
vendorRouter.delete("/item/:itemId", verifyToken, async (req, res) => {
  const itemId = req.params.itemId;

  try {
    const query = `
      DELETE FROM menu_items
      WHERE Item_ID = $1
      RETURNING *;
    `;
    const result = await client.query(query, [itemId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).send("Internal Server Error");
  }
});

vendorRouter.get("/vendorOrders/:vendorId", async (req, res) => {
  try {
    // Extract username from request parameters
    const { vendorId } = req.params;

    // Query to fetch orders for the specified username
    const query = `
    SELECT 
        po.id,
        po.order_time,
        po.food_ready_time,
        po.price,
        po.comment,
        po.vendor_id,
        po.created_at,
        po.payment_id,
        po.payment_status,
        po.username,
        json_agg(json_build_object('item_id', oi.itemid, 'item_name', oi.itemname, 'item_price', oi.price, 'quantity', oi.quantity)) AS items
    FROM 
        placed_order po
    JOIN 
    itemsordered oi ON po.id = oi.orderid
    WHERE 
        po.vendor_id = $1
    GROUP BY 
        po.id,
        po.order_time,
        po.food_ready_time,
        po.price,
        po.comment,
        po.vendor_id,
        po.created_at,
        po.payment_id,
        po.payment_status,
        po.username;
  `;

    // Execute the query
    const { rows } = await client.query(query, [vendorId]);
    // Return fetched orders as response
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

vendorRouter.get("/vendorOrders/orderDetails/:orderId", async (req, res) => {
  try {
    // Extract orderId from request parameters
    console.log("here");
    const { orderId } = req.params;
    console.log(orderId);

    // Query to fetch data for the specified order ID
    const query = `
    SELECT 
        po.id,
        po.order_time,
        po.food_ready_time,
        po.price,
        po.comment,
        po.vendor_id,
        po.created_at,
        po.payment_id,
        po.payment_status,
        po.username,
        json_agg(json_build_object('item_id', oi.itemid, 'item_name', oi.itemname, 'item_price', oi.price, 'quantity', oi.quantity)) AS items
    FROM 
        placed_order po
    JOIN 
        itemsordered oi ON po.id = oi.orderid
    WHERE 
        po.id = $1
    GROUP BY 
        po.id,
        po.order_time,
        po.food_ready_time,
        po.price,
        po.comment,
        po.vendor_id,
        po.created_at,
        po.payment_id,
        po.payment_status,
        po.username;
  `;

    // Execute the query
    const { rows } = await client.query(query, [orderId]);

    // Check if any rows are returned
    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Return fetched order data as response
    res.json(rows[0]); // Assuming there's only one order with the given ID
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Get categories associated with a particular vendor
vendorRouter.get("/:vendorId/categories", async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const query = `SELECT category.id, category.category_name
                   FROM category
                   INNER JOIN VendorCategories ON category.id = VendorCategories.category_id
                   WHERE VendorCategories.vendor_id = $1`;
    // Execute the query
    const { rows } = await client.query(query, [vendorId]);
    // Return fetched orders as response
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update categories associated with a particular vendor
vendorRouter.put("/:vendorId/categories/:categoryId", async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const categoryId = req.params.categoryId;
    const query =
      "UPDATE VendorCategories SET id = $1 WHERE vendor_id = $2 AND id = $3";
    await client.query(query, [req.body.newCategoryId, vendorId, categoryId]);
    res.sendStatus(200); // OK
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a category associated with a particular vendor
vendorRouter.delete("/:vendorId/categories/:categoryId", async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const categoryId = req.params.categoryId;
    const query =
      "DELETE FROM VendorCategories WHERE vendor_id = $1 AND id = $2";
    await client.query(query, [vendorId, categoryId]);
    res.sendStatus(204); // No Content
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a category to a particular vendor
vendorRouter.post("/:vendorId/categories", async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const categoryName = req.body.category;
    const img_url = req.body.imageUrl;

    console.log(req.body)
    const checkQuery = "SELECT id FROM category WHERE category_name = $1";
    const { rows } = await client.query(checkQuery, [categoryName]);
    if (rows.length === 0) {
      // Category does not exist, insert new category
      const insertQuery =
        "INSERT INTO category (category_name,img_url) VALUES ($1,$2) RETURNING id";
      const insertedCategory = await client.query(insertQuery, [categoryName,img_url]);
      const categoryId = insertedCategory.rows[0].id;
      const vendorCategoryQuery =
        "INSERT INTO VendorCategories (vendor_id, category_id) VALUES ($1, $2)";
      await client.query(vendorCategoryQuery, [vendorId, categoryId]);
    } else {
      // Category exists, associate with the vendor
      const categoryId = rows[0].id;
      const vendorCategoryQuery =
        "INSERT INTO VendorCategories (vendor_id, category_id) VALUES ($1, $2)";
      await client.query(vendorCategoryQuery, [vendorId, categoryId]);
    }
    res.sendStatus(201); // Created
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

vendorRouter.get("/stats/:vendorId", async (req, res) => {
  const { vendorId } = req.params;

  try {
    const stats = await getVendorStats(vendorId);
    res.json(stats);
  } catch (error) {
    console.error("Error getting vendor stats:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = { vendorRouter, getVendorStats };
