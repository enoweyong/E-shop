const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const Product = require("./Product");
const Customer = require("./Customer");
const Admin = require("./Admin");
const Order = require("./Order");
const Payment = require("./Payment");
const ECommerceSystem = require("./ECommerceSystem");

// ======================================================
// CREATE EXPRESS APPLICATION
// ======================================================

const app = express();

const PORT = 5000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());

// ======================================================
// CREATE E-COMMERCE SYSTEM
// ======================================================

const system = new ECommerceSystem();

// ======================================================
// CREATE PRODUCTS
// ======================================================

const initialProducts = [

    new Product(
        1,
        "Laptop",
        "Dell Core i7",
        800,
        10,
        "Electronics"
    ),

    new Product(
        2,
        "Smartphone",
        "Samsung Galaxy S24",
        700,
        20,
        "Electronics"
    ),

    new Product(
        3,
        "Tablet",
        "Apple iPad Air",
        650,
        15,
        "Electronics"
    ),

    new Product(
        4,
        "Smart Watch",
        "Apple Watch Series 10",
        500,
        12,
        "Electronics"
    ),

    new Product(
        5,
        "Headphones",
        "Sony WH-1000XM5",
        250,
        30,
        "Electronics"
    ),

    new Product(
        6,
        "Bluetooth Speaker",
        "JBL Charge 5",
        180,
        18,
        "Electronics"
    ),

    new Product(
        7,
        "Gaming Mouse",
        "Logitech G502",
        80,
        25,
        "Accessories"
    ),

    new Product(
        8,
        "Mechanical Keyboard",
        "Redragon K552",
        90,
        20,
        "Accessories"
    ),

    new Product(
        9,
        "Monitor",
        "24-inch HP Full HD",
        220,
        10,
        "Electronics"
    ),

    new Product(
        10,
        "Printer",
        "HP LaserJet",
        350,
        8,
        "Office"
    ),

    new Product(
        11,
        "Backpack",
        "Laptop Backpack",
        45,
        40,
        "Fashion"
    ),

    new Product(
        12,
        "Running Shoes",
        "Nike Air Zoom",
        120,
        25,
        "Fashion"
    ),

    new Product(
        13,
        "T-Shirt",
        "Polo T-Shirt",
        25,
        60,
        "Fashion"
    ),

    new Product(
        14,
        "Jeans",
        "Blue Denim Jeans",
        50,
        35,
        "Fashion"
    ),

    new Product(
        15,
        "Jacket",
        "Leather Jacket",
        150,
        10,
        "Fashion"
    ),

    new Product(
        16,
        "Coffee Maker",
        "Philips Coffee Machine",
        130,
        15,
        "Home"
    ),

    new Product(
        17,
        "Microwave",
        "LG Microwave Oven",
        200,
        10,
        "Home"
    ),

    new Product(
        18,
        "Electric Kettle",
        "Silver Crest Kettle",
        40,
        30,
        "Home"
    ),

    new Product(
        19,
        "Vacuum Cleaner",
        "Panasonic Vacuum",
        180,
        12,
        "Home"
    ),

    new Product(
        20,
        "Air Fryer",
        "Ninja Air Fryer",
        170,
        15,
        "Home"
    )

];

// ======================================================
// ADD PRODUCTS TO CATALOG
// ======================================================

initialProducts.forEach(product => {

    system.catalog.addProduct(product);

});

// ======================================================
// ADMIN STORE & PASSWORD HASHING
// ======================================================

const SCRYPT_KEYLEN = 64;

const passwordHash = (password) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
    return `scrypt:${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
    if (typeof stored !== "string") return false;
    if (stored === password) return true;
    const [scheme, salt, hash] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !hash) {
        return stored === crypto.createHash("sha256").update(String(password)).digest("hex");
    }
    const candidate = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
};

const defaultAdmin = new Admin(
    1,
    "Administrator",
    "admin@gmail.com"
);
defaultAdmin.passwordHash = passwordHash("1234");

const eyongAdmin = new Admin(
    2,
    "eyong",
    "eyong@gmail.com"
);
eyongAdmin.passwordHash = passwordHash("1234");

system.admins = [defaultAdmin, eyongAdmin];

// ======================================================
// CUSTOMER
// ======================================================

const customer = new Customer(
    101,
    "John Doe",
    "john@gmail.com",
    "Buea, Cameroon"
);

system.registerCustomer(customer);

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {

    res.json({
        message: "E-Commerce API is running successfully"
    });

});

// ======================================================
// GET ALL PRODUCTS
// ======================================================

app.get("/api/products", (req, res) => {

    try {

        const catalog = req.query.availableOnly === "true"
            ? system.catalog.products.filter(product => product.stock > 0)
            : system.catalog.products;

        res.json(catalog);

    } catch (error) {

        res.status(500).json({
            message: "Unable to retrieve products"
        });

    }

});

// ======================================================
// FORGOT & RESET PASSWORD
// ======================================================

app.post("/api/admin/forgot-password", (req, res) => {

    try {

        const { name, email } = req.body;

        const identifier = String(name || email || "").trim().toLowerCase();

        const adminUser = system.admins.find(a =>
            a.name.toLowerCase() === identifier ||
            (a.email && a.email.toLowerCase() === identifier)
        );

        if (!adminUser) {

            return res.status(404).json({

                success: false,

                message: "Admin account not found"

            });

        }

        adminUser.resetCode = "123456";

        adminUser.resetCodeExpires = Date.now() + 2 * 60 * 60 * 1000;

        res.json({

            success: true,

            message: "Confirmation code sent to your email."

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Unable to send confirmation code"

        });

    }

});

app.post("/api/admin/reset-password", (req, res) => {

    try {

        const { email, code, password } = req.body;

        const identifier = String(email || "").trim().toLowerCase();

        const adminUser = system.admins.find(a =>
            (a.email && a.email.toLowerCase() === identifier) ||
            a.name.toLowerCase() === identifier
        );

        if (!adminUser) {

            return res.status(404).json({

                success: false,

                message: "Admin account not found"

            });

        }

        if (adminUser.resetCode && adminUser.resetCodeExpires < Date.now()) {

            return res.status(410).json({

                success: false,

                expired: true,

                message: "Confirmation code expired"

            });

        }

        adminUser.passwordHash = passwordHash(password);

        delete adminUser.resetCode;

        delete adminUser.resetCodeExpires;

        res.json({

            success: true,

            message: "Password reset successful",

            admin: {

                id: adminUser.userId,

                name: adminUser.name,

                email: adminUser.email

            },

            tokens: {

                accessToken: `admin-token-${adminUser.name.toLowerCase()}`

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Password reset failed"

        });

    }

});

// ======================================================
// GET ONE PRODUCT
// ======================================================

app.get("/api/products/:id", (req, res) => {

    const id = Number(req.params.id);

    const product =
        system.catalog.products.find(
            product =>
                product.productId === id
        );

    if (!product) {

        return res.status(404).json({
            message: "Product not found"
        });

    }

    res.json(product);

});

// ======================================================
// ADMIN REGISTER
// ======================================================

app.post("/api/admin/register", (req, res) => {

    try {

        const {
            name,
            username,
            email,
            password
        } = req.body;

        const adminName = String(name || username || "").trim();
        let adminEmail = String(email || "").trim().toLowerCase();
        if (!adminEmail && adminName) {
            adminEmail = `${adminName.toLowerCase()}@example.com`;
        }

        if (
            !adminName ||
            !password ||
            String(password).length < 4
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name and password of at least 4 characters are required"

            });

        }

        const existing = system.admins.find(a =>
            a.name.toLowerCase() === adminName.toLowerCase() ||
            (a.email && a.email.toLowerCase() === adminEmail)
        );

        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "An admin with that name or email already exists"

            });

        }

        const newAdmin = new Admin(
            Date.now(),
            adminName,
            adminEmail
        );
        newAdmin.passwordHash = passwordHash(password);

        system.admins.push(newAdmin);

        res.status(201).json({

            success: true,

            message:
                "Admin account created",

            admin: {

                id: newAdmin.userId,

                name: newAdmin.name,

                email: newAdmin.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Unable to create admin account"

        });

    }

});

// ======================================================
// ADMIN LOGIN
// ======================================================

app.post("/api/admin/login", (req, res) => {

    try {

        const {
            name,
            username,
            email,
            password
        } = req.body;

        const identifier = String(name || username || email || "").trim().toLowerCase();

        if (!identifier || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Username and password are required"

            });

        }

        const adminUser = system.admins.find(a =>
            a.name.toLowerCase() === identifier ||
            (a.email && a.email.toLowerCase() === identifier)
        );

        if (!adminUser || !verifyPassword(password, adminUser.passwordHash)) {

            return res.status(401).json({

                success: false,

                message:
                    "Admin name or password is incorrect"

            });

        }

        return res.json({

            success: true,

            message:
                "Admin login successful",

            admin: {

                id: adminUser.userId,

                name: adminUser.name,

                email: adminUser.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Login failed"

        });

    }

});

// ======================================================
// ADD PRODUCT
// ======================================================

app.post("/api/products", (req, res) => {

    try {

        const {
            productId,
            name,
            description,
            price,
            stock,
            category
            , imageUrl
        } = req.body;

        // Check duplicate ID

        const existingProduct =
            system.catalog.products.find(
                product =>
                    product.productId ===
                    Number(productId)
            );

        if (existingProduct) {

            return res.status(400).json({

                message:
                    "Product ID already exists"

            });

        }

        // Validate

        if (
            !productId ||
            !name ||
            price === undefined ||
            stock === undefined ||
            !category
        ) {

            return res.status(400).json({

                message:
                    "All required fields must be provided"

            });

        }

        const product =
            new Product(

                Number(productId),

                name,

                description || "",

                Number(price),

                Number(stock),

                category

            );

            product.imageUrl = imageUrl || "";

        system.catalog.addProduct(product);

        res.status(201).json({

            message:
                "Product added successfully",

            product: product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to add product"

        });

    }

});

// ======================================================
// UPDATE PRODUCT
// ======================================================

app.put("/api/products/:id", (req, res) => {

    try {

        const id =
            Number(req.params.id);

        const product =
            system.catalog.products.find(
                product =>
                    product.productId === id
            );

        if (!product) {

            return res.status(404).json({

                message:
                    "Product not found"

            });

        }

        const {
            name,
            price,
            stock,
            category,
            imageUrl
        } = req.body;

        if (name !== undefined) {

            product.name = name;

        }

        if (price !== undefined) {

            product.price =
                Number(price);

        }

        if (stock !== undefined) {

            product.stock =
                Number(stock);

        }

        if (category !== undefined) {

            product.category =
                category;

        }

        if (imageUrl !== undefined) {
            product.imageUrl = imageUrl;
        }

        res.json({

            message:
                "Product updated successfully",

            product: product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to update product"

        });

    }

});

// ======================================================
// DELETE PRODUCT
// ======================================================

app.delete("/api/products/:id", (req, res) => {

    try {

        const id =
            Number(req.params.id);

        const index =
            system.catalog.products.findIndex(
                product =>
                    product.productId === id
            );

        if (index === -1) {

            return res.status(404).json({

                message:
                    "Product not found"

            });

        }

        const deletedProduct =
            system.catalog.products[index];

        system.catalog.products.splice(
            index,
            1
        );

        res.json({

            message:
                "Product deleted successfully",

            product:
                deletedProduct

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to delete product"

        });

    }

});

// ======================================================
// CREATE ORDER / CHECKOUT
// ======================================================

app.post("/api/orders", (req, res) => {

    try {

        const {
            customerName,
            items,
            total,
            paymentAmount,
            paymentMethod
        } = req.body;

        // Validate customer name

        if (!customerName) {

            return res.status(400).json({

                message:
                    "Customer name is required"

            });

        }

        // Validate cart

        if (
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({

                message:
                    "Shopping cart is empty"

            });

        }

        // Validate payment

        if (
            Number(paymentAmount) !==
            Number(total)
        ) {

            return res.status(400).json({

                message:
                    "Incorrect payment amount",

                required:
                    Number(total),

                received:
                    Number(paymentAmount)

            });

        }

        // Check stock

        for (const item of items) {

            const product =
                system.catalog.products.find(
                    product =>
                        product.productId ===
                        Number(item.productId)
                );

            if (!product) {

                return res.status(404).json({

                    message:
                        `Product ${item.productId} not found`

                });

            }

            if (
                product.stock <
                Number(item.quantity)
            ) {

                return res.status(400).json({

                    message:
                        `Not enough stock for ${product.name}`

                });

            }

        }

        // Reduce stock

        items.forEach(item => {

            const product =
                system.catalog.products.find(
                    product =>
                        product.productId ===
                        Number(item.productId)
                );

            product.stock -=
                Number(item.quantity);

        });

        // Create order ID

        const orderId =
            Date.now();

        /*
        Create a simple order object.

        This keeps the API compatible with
        the frontend even if your current
        Order constructor has different parameters.
        */

        const order = {

            orderId,

            customerName,

            items,

            total:
                Number(total),

            status:
                "Confirmed",

            paymentMethod,

            paymentAmount:
                Number(paymentAmount),

            date:
                new Date().toISOString()

        };

        system.orders.push(order);

        res.status(201).json({

            success: true,

            message:
                "Order placed successfully",

            order: order

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Checkout failed"

        });

    }

});

// ======================================================
// GET ALL ORDERS
// ======================================================

app.get("/api/orders", (req, res) => {

    res.json(
        system.orders
    );

});

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            "=========================================="
        );

        console.log(
            "       E-COMMERCE BACKEND SERVER"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Server running on: http://localhost:${PORT}`
        );

        console.log(
            `Products API: http://localhost:${PORT}/api/products`
        );

        console.log(
            "=========================================="
        );

    }
);