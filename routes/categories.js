const express = require("express");
const categoriesRouter = express.Router();
const client = require("../config/index");
const z = require("zod");
const {authenticateToken} = require("../MiddleWares/authMiddleWare");
   
categoriesRouter.get("/", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM category");
    const categories = result.rows;
    
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Zod schema for input validation
const categorySchema = z.object({
  categoryName: z.string().min(3),
});

// Create a new category route
categoriesRouter.post("/", authenticateToken, async (req, res) => {
  try {
    // Validate input using Zod
    const { categoryName, img_url } = req.body;
    console.log({categoryName,img_url})

    // Check if the category already exists
    const existingCategory = await client.query(
      "SELECT * FROM category WHERE category_name = $1",
      [categoryName]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Generate a random category ID between 1 and 100
    const categoryId = Math.floor(Math.random() * 100) + 1;

    // Insert the new category into the category table
    const result = await client.query(
      "INSERT INTO category (id, category_name,img_url) VALUES ($1, $2,$3) RETURNING *",
      [categoryId, categoryName, img_url]
    );

    // Respond with the newly created category
    const newCategory = result.rows[0];
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error creating a new category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

categoriesRouter.get("/:categoryId/menuItems", async (req, res) => {
  const categoryId = req.params.categoryId;

  try {
    const result = await client.query(
      `SELECT menu_items.*, vendors.vendor_name,vendors.avg_time as avg_time, vendor_ratings.Overall_Rating as vendor_rating, item_ratings.Item_Rating as item_rating
      FROM menu_items 
      INNER JOIN vendors ON menu_items.vendor_id = vendors.vendor_id
      LEFT JOIN vendor_ratings ON vendors.vendor_id = vendor_ratings.vendor_id
      LEFT JOIN item_ratings ON menu_items.Item_ID = item_ratings.Item_ID
      WHERE menu_items.category_id = $1`,
      [categoryId]
    );

    const menuItems = result.rows;

    res.json(menuItems);
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = categoriesRouter;
