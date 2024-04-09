const express = require("express");
const orders = express.Router();

const client = require("../config/index");

const {authenticateToken} = require("../MiddleWares/authMiddleWare");

// Function to calculate the average rating from an array of item ratings
function calculateAverageRating(ratings) {
  if (ratings.length === 0) return 0;

  const totalRating = ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return totalRating / ratings.length;
}
orders.get("/:username", async (req, res) => {
  try {
    // Extract username from request parameters
    const { username } = req.params;

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
        po.username = $1
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
    const { rows } = await client.query(query, [username]);

    // Return fetched orders as response
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
orders.get("/vendorOrders/:vendorId", async (req, res) => {
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
// orders.post("/:orderId/review", authenticateToken, async (req, res) => {
//   const orderId = req.params.orderId;

//   const { ratings, comment } = req.body; // ratings should be an array containing item ratings [{ itemId: 1, rating: 4, comment: "Comment for item 1" }, { itemId: 2, rating: 3, comment: "Comment for item 2" }, ...]

//   try {
//     await client.query("BEGIN");

//     // Get vendor ID and user ID from the placed_order table
//     const orderDetailsQuery = `
//         SELECT vendor_id, user_id FROM placed_order WHERE ID = $1;
//       `;
//     const orderDetailsResult = await client.query(orderDetailsQuery, [orderId]);
//     const { vendor_id: vendorId, user_id: userId } = orderDetailsResult.rows[0];

//     // Calculate average rating
//     const averageRating = calculateAverageRating(ratings); // You need to implement this function

//     // Insert review into the vendor_ratings table with the average rating
//     const reviewQuery = `
//         INSERT INTO vendor_ratings (order_id, vendor_id, overall_rating, comment)
//         VALUES ($1, $2, $3, $4)
//         RETURNING *;
//       `;
//     const reviewResult = await client.query(reviewQuery, [
//       orderId,
//       vendorId,
//       averageRating,
//       comment,
//     ]);

//     // Get items ordered from the placed_order table
//     const orderItemsQuery = `
//         SELECT items_ordered
//         FROM placed_order
//         WHERE ID = $1;
//       `;
//     const orderItemsResult = await client.query(orderItemsQuery, [orderId]);
//     const items = orderItemsResult.rows[0].items_ordered;

//     // Insert item ratings into the item_ratings table
//     for (const itemRating of ratings) {
//       const itemId = itemRating.itemId;
//       const { rating, comment } = itemRating;

//       // Check if the item ID exists in the order's items
//       const itemExists = items.find((item) => item.itemId === itemId);
//       if (!itemExists) {
//         await client.query("ROLLBACK");
//         return res.status(400).json({
//           error: `Item with ID ${itemId} does not exist in the order`,
//         });
//       }

//       const itemRatingQuery = `
//           INSERT INTO item_ratings (placed_order_id, item_id, item_rating, comment)
//           VALUES ($1, $2, $3, $4);
//         `;
//       await client.query(itemRatingQuery, [orderId, itemId, rating, comment]);
//     }

//     await client.query("COMMIT");

//     res.status(201).json(reviewResult.rows[0]); // Respond with the newly created review
//   } catch (error) {
//     console.error("Error posting review:", error);
//     await client.query("ROLLBACK");
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

orders.post("/:orderId/review", authenticateToken, async (req, res) => {
  const orderId = req.params.orderId;

  const { rating, comment } = req.body; // rating should be a single value representing the overall order rating

  try {
    await client.query("BEGIN");

    // Get vendor ID and user ID from the placed_order table
    const orderDetailsQuery = `
        SELECT vendor_id, userName FROM placed_order WHERE id = $1;
      `;
    const orderDetailsResult = await client.query(orderDetailsQuery, [orderId]);
    const { vendor_id: vendorId, userName: userId } = orderDetailsResult.rows[0];

    // Insert review into the vendor_ratings table
    const reviewQuery = `
        INSERT INTO vendor_ratings (order_id, vendor_id, overall_rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
    const reviewResult = await client.query(reviewQuery, [
      orderId,
      vendorId,
      rating,
      comment,
    ]);

    await client.query("COMMIT");

    res.status(201).json(reviewResult.rows[0]); // Respond with the newly created review
  } catch (error) {
    console.error("Error posting review:", error);
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function storeOrder({ userId, products }) {
  // Check if an identical order already exists
  const existingOrderQuery = `
    SELECT id FROM placed_order 
    WHERE username = $1
    AND order_time = $2
    AND food_ready_time = $3
    AND price = $4
    AND comment = $5
    AND vendor_id = $6
    AND created_at = $7
    AND payment_id = $8
    AND payment_status = $9;
  `;
  const existingOrderValues = [
    userId,
    products.products.orderTime,
    products.products.foodReadyTime,
    products.products.price,
    products.products.comment,
    products.products.vendorId,
    products.products.createdAt,
    products.products.paymentId,
    products.products.paymentStatus,
  ];
  const existingOrderResult = await client.query(
    existingOrderQuery,
    existingOrderValues
  );

  // If an identical order already exists, return its ID
  if (existingOrderResult.rows.length > 0) {
    return existingOrderResult.rows[0].id;
  }

  // If the order is not found, insert it into the database
  const query = `
    INSERT INTO placed_order (username, order_time, food_ready_time, price, comment, vendor_id, created_at, payment_id, payment_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id;
  `;
  const values = [
    userId,
    products.products.orderTime,
    products.products.foodReadyTime,
    products.products.price,
    products.products.comment,
    products.products.vendorId,
    products.products.createdAt,
    products.products.paymentId,
    products.products.paymentStatus,
  ];
  const result = await client.query(query, values);
  const orderId = result.rows[0].id;

  // Insert itemsOrdered into the database
  for (const item of products.products.itemsOrdered) {
    await client.query(
      `
      INSERT INTO itemsOrdered (orderId, itemId, itemName, price, quantity)
      VALUES ($1, $2, $3, $4, $5);
    `,
      [orderId, item.itemId, item.itemName, item.price, item.quantity]
    );
  }

  return orderId;
}

// Function to get order details from the database
async function getOrder(orderId) {
  const orderQuery = `
    SELECT * FROM placed_order WHERE id = $1;
  `;
  const itemsQuery = `
    SELECT * FROM itemsOrdered WHERE orderId = $1;
  `;

  const orderResult = await client.query(orderQuery, [orderId]);
  const itemsResult = await client.query(itemsQuery, [orderId]);

  const order = orderResult.rows[0];
  const itemsOrdered = itemsResult.rows;

  // Combine order details with itemsOrdered
  order.itemsOrdered = itemsOrdered;

  return order;
}

async function updateOrderStatus(orderId, status) {
  try {
    // Execute the SQL query to update the order status
    const query = `
      UPDATE placed_order
      SET payment_status = $1
      WHERE id = $2
      RETURNING id, payment_status;
    `;
    console.log("OrderId in update func:", orderId);
    const values = [status, orderId];
    const result = await client.query(query, values);

    // Return the orderId and status
    // return {
    //   orderId: result.rows[0].id,
    //   status: result.rows[0].payment_status
    // };
    // console.log(result)
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

module.exports = { orders, storeOrder, getOrder, updateOrderStatus };
