CREATE TABLE users (
        User_ID SERIAL PRIMARY KEY,
        Username VARCHAR(255) NOT NULL,
        Password VARCHAR(255) NOT NULL,
        Email VARCHAR(255) NOT NULL,
        Phone_No VARCHAR(20),
        UserType VARCHAR(50) CHECK (UserType IN ('Student', 'Vendor')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE vendorLogin(
  User_Id SERIAL PRIMARY KEY,
  Username VARCHAR(255) NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

)
CREATE TABLE vendors (
    Vendor_ID SERIAL PRIMARY KEY,
    User_ID INTEGER REFERENCES vendorLogin(User_ID) UNIQUE,
    Vendor_Name VARCHAR(255) NOT NULL,
    Vendor_Desc TEXT,
    Image_Path VARCHAR(255)   
  );

CREATE TABLE vendor_ratings (
    Rating_ID SERIAL PRIMARY KEY,
    Vendor_ID INTEGER REFERENCES vendors(Vendor_ID),
    Overall_Rating INTEGER DEFAULT 0 CHECK (Overall_Rating BETWEEN 0 AND 5),
    Comment TEXT
  );

CREATE TABLE category (
   Id SERIAL PRIMARY KEY,
   Category_Name VARCHAR(255)
  );

CREATE TABLE menu_items (
    Item_ID SERIAL PRIMARY KEY,
    Vendor_ID INTEGER REFERENCES vendors(Vendor_ID),
    Category_ID INTEGER REFERENCES category(Id),
    Item_Name VARCHAR(255) NOT NULL,
    Item_Description TEXT,
    Price DECIMAL(10, 2),
    Image_URL VARCHAR(255)  
);

CREATE TABLE item_ratings (
    Rating_ID SERIAL PRIMARY KEY,
    Item_ID INTEGER REFERENCES menu_items(Item_ID),
    Item_Rating INTEGER CHECK (Item_Rating BETWEEN 1 AND 5),
    Comment TEXT
);
  
CREATE TABLE placed_order (
    ID SERIAL PRIMARY KEY,
    User_ID INTEGER REFERENCES users(User_ID),
    Order_Time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Food_Ready_Time TIMESTAMP,
    Price NUMERIC(10, 2) NOT NULL,
    Comment TEXT,
    Vendor_ID INTEGER REFERENCES vendors(Vendor_ID),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE placed_order
ADD COLUMN Payment_ID INTEGER REFERENCES payments(Payment_ID),
ADD COLUMN Payment_Status VARCHAR(50) CHECK (Payment_Status IN ('Pending', 'Received', 'Failed')) DEFAULT 'Pending';

CREATE TABLE in_order (
    ID SERIAL PRIMARY KEY,
    Placed_Order_ID INTEGER REFERENCES placed_order(ID),
    Menu_Item_ID INTEGER REFERENCES menu_items(Item_ID),
    Quantity INTEGER NOT NULL,
    Item_Price NUMERIC(10, 2) NOT NULL,
    Price NUMERIC(10, 2) NOT NULL,
    Comment TEXT
);

CREATE TABLE order_status (
    ID SERIAL PRIMARY KEY,
    Placed_Order_ID INTEGER REFERENCES placed_order(ID),
    Status_Catalog_ID INTEGER REFERENCES status_catalog(ID),
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE status_catalog (
    ID SERIAL PRIMARY KEY,
    Status_Name VARCHAR(255) NOT NULL
);

CREATE TABLE comment (
    ID SERIAL PRIMARY KEY,
    Placed_Order_ID INTEGER REFERENCES placed_order(ID),
    Customer_ID INTEGER REFERENCES users(User_ID),
    Comment_Text TEXT NOT NULL,
    TS TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Is_Complaint BOOLEAN,
    Is_Praise BOOLEAN
);

CREATE TABLE payments (
    Payment_ID SERIAL PRIMARY KEY,
    Placed_Order_ID INTEGER REFERENCES placed_order(ID),
    Amount NUMERIC(10, 2) NOT NULL,
    Payment_Status VARCHAR(50) CHECK (Payment_Status IN ('Pending', 'Received', 'Failed')),
    Payment_Method VARCHAR(255),
    Transaction_Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  
  /*
ALTER TABLE payments
ADD CONSTRAINT payments_placed_order_id_fkey
FOREIGN KEY (Placed_Order_ID)
REFERENCES placed_order(Placed_Order_ID) DEFERRABLE INITIALLY DEFERRED;
*/
/*
 INSERT INTO users (Username, Password, Email, Phone_No, UserType)
  VALUES ('john_doe', 'password123', 'john_doe@example.com', '1234567890', 'Student');
-- Insert sample vendor
  INSERT INTO vendors (User_ID, Vendor_Name, Vendor_Desc, Image_Path)
VALUES (4, 'Example Vendor', 'Description of Example Vendor', '/images/example.jpg');
 
  
  -- Insert sample category
 -- INSERT INTO category (Category_Name) VALUES ('Sample Category');
  
  -- Insert sample menu item
 -- INSERT INTO menu_items (Vendor_ID, Category_ID, Item_Name, Item_Description, Price, Image_URL)
 -- VALUES (1, 1, 'Sample Item', 'Item Description', 10.99, '/images/sample_item.jpg');
  
  -- Insert sample item rating
--  INSERT INTO item_ratings (Item_ID, Item_Rating, Comment)
 -- VALUES (1, 4, 'Great item!');
  
INSERT INTO placed_order (User_ID, Order_Time, Food_Ready_Time, Price, Comment, Vendor_ID, Payment_ID, Payment_Status)
VALUES (1, '2024-02-13 12:00:00', '2024-02-13 12:30:00', 10.99, 'No special requests', 1, 1, 'Received');

  
  -- Insert sample in order
  --INSERT INTO in_order (Placed_Order_ID, Menu_Item_ID, Quantity, Item_Price, Price, Comment)
  --VALUES (1, 1, 1, 10.99, 10.99, 'No modifications');
  
  -- Insert sample order status
  --INSERT INTO order_status (Placed_Order_ID, Status_Catalog_ID, Timestamp)
  --VALUES (1, 1, '2024-02-13 12:05:00');
  
  -- Insert sample status catalog
  --INSERT INTO status_catalog (Status_Name) VALUES ('Order Placed');
  
  -- Insert sample comment
  --INSERT INTO comment (Placed_Order_ID, Customer_ID, Comment_Text, Is_Complaint, Is_Praise)
  --VALUES (1, 1, 'Great service!', false, true);
  
  -- Insert sample payment
  --INSERT INTO payments (Placed_Order_ID, Amount, Payment_Status, Payment_Method)
  --VALUES (1, 10.99, 'Received', 'Credit Card');
  -- Drop the existing constraint
  ALTER TABLE placed_order DROP CONSTRAINT placed_order_payment_id_fkey;
  
  -- Add the modified constraint
  ALTER TABLE placed_order
  ADD CONSTRAINT placed_order_payment_id_fkey
  FOREIGN KEY (Payment_ID)
  REFERENCES payments(Payment_ID) DEFERRABLE INITIALLY DEFERRED;
  
  */

