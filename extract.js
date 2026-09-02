

        /*
        ====================================================
        API CONFIGURATION
        ====================================================
        */

        const API_URL = "https://vavsea78k4.execute-api.us-east-1.amazonaws.com/prod/api";


        /*
        ====================================================
        APPLICATION STATE
        ====================================================
        */

        let products = [];

        let cart = [];

        let adminLoggedIn = false;

        let signedInAdminName = "";

        let cognitoTokens = null;

        let cognitoConfig = null;

        let selectedAdminProductId = null;

        let customerName = "";

        let momoReference = "";

        let visibleProductCount = 0;

        const PRODUCTS_PER_BATCH = 5;

        let productObserver;

        const productImages = {
            "Laptop": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
            "Smartphone": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
            "Tablet": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=85",
            "Smart Watch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
            "Headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
            "Bluetooth Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85",
            "Gaming Mouse": "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
            "Mechanical Keyboard": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85",
            "Monitor": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85",
            "Printer": "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=85",
            "Backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
            "Running Shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
            "T-Shirt": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
            "Jeans": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85",
            "Jacket": "https://images.unsplash.com/photo-1551028719-00167b16f34b?auto=format&fit=crop&w=900&q=85",
            "Coffee Maker": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85",
            "Microwave": "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=900&q=85",
            "Electric Kettle": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=85",
            "Vacuum Cleaner": "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=85",
            "Air Fryer": "https://images.unsplash.com/photo-1648132560669-8e2f8b6c8f6c?auto=format&fit=crop&w=900&q=85"
        };

        function readProductImage(file) {

            return new Promise((resolve, reject) => {

                if (!file) {
                    resolve("");
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);

            });

        }


        /*
        ====================================================
        MESSAGE
        ====================================================
        */

        function showMessage(message, success = true) {

            const messageBox =
                document.getElementById("message");

            messageBox.textContent = message;

            messageBox.style.background =
                success ? "#16a34a" : "#dc2626";

            messageBox.style.display = "block";

            setTimeout(() => {

                messageBox.style.display = "none";

            }, 3000);

        }


        /*
        ====================================================
        HIDE ALL SECTIONS
        ====================================================
        */

        function hideSections() {

            document
                .querySelectorAll("section")
                .forEach(section => {

                    section.classList.add("hidden");

                });

        }


        /*
        ====================================================
        HOME
        ====================================================
        */

        function showHome() {

            hideSections();

            document
                .getElementById("homeSection")
                .classList.remove("hidden");

        }

        function showCustomerEntry() {

            hideSections();

            document
                .getElementById("customerEntrySection")
                .classList.remove("hidden");

        }

        document
            .getElementById("customerEntryForm")
            .addEventListener("submit", function(event) {

                event.preventDefault();

                customerName = document
                    .getElementById("customerEntryName")
                    .value
                    .trim();

                document
                    .getElementById("customerName")
                    .value = customerName;

                showMessage(`Welcome, ${customerName}.`);
                showProducts();

            });


        /*
        ====================================================
        SHOW PRODUCTS
        ====================================================
        */

        async function showProducts() {

            hideSections();

            document
                .getElementById("productsSection")
                .classList.remove("hidden");

            await loadProducts();

        }


        /*
        ====================================================
        LOAD PRODUCTS FROM BACKEND
        ====================================================
        */

        async function loadProducts(includeOutOfStock = false) {

            try {

                const endpoint = includeOutOfStock
                    ? `${API_URL}/admin/products`
                    : `${API_URL}/products${includeOutOfStock ? "" : "?availableOnly=true"}`;
                const response = await fetch(endpoint, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {

                    throw new Error(
                        "Unable to load products"
                    );

                }

                products = await response.json();

                if (includeOutOfStock) {
                    await loadAdminSales();
                }

                displayProducts(products, true);

            } catch (error) {

                console.error(error);

                /*
                If your backend is not yet connected,
                this message will appear.
                */

                showMessage(
                    "Could not connect to backend.",
                    false
                );

            }

        }


        /*
        ====================================================
        DISPLAY PRODUCTS
        ====================================================
        */
function displayProducts(products, reset = false) {
    // 1. Parse stringified 'body' if received from an API Gateway proxy object
    let rawData = products;
    if (typeof products?.body === "string") {
        try {
            rawData = JSON.parse(products.body);
        } catch (e) {
            console.error("Failed to parse body JSON:", e);
        }
    }

    // 2. Extract array safely
    const productsArray = Array.isArray(rawData)
        ? rawData
        : (rawData?.products || rawData?.Items || []);

    const container = document.getElementById("productsContainer");
    if (!container) return; // Exit quietly if not on the products page

    if (!Array.isArray(productsArray) || productsArray.length === 0) {
        container.innerHTML = "";
        container.innerHTML = "<p>No products available.</p>";
        return;
    }

    if (reset) {
        visibleProductCount = 0;
        container.innerHTML = "";
    }

    // Render only the next batch, leaving earlier choices on screen.
    const nextProducts = productsArray.slice(
        visibleProductCount,
        visibleProductCount + PRODUCTS_PER_BATCH
    );

    nextProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        const id = product.productId || product.id || "";
        const stock = product.stock ?? 0;

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.imageUrl || productImages[product.name] || productImages["Laptop"]}"
                    alt="${product.name || "Product"}"
                    loading="lazy"
                    onerror="this.src='https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=85'">
            </div>
            <h3>${product.name || "Unnamed Product"}</h3>
            <p>${product.description || ""}</p>
            <p>Category: ${product.category || ""}</p>
            <p class="price">${Number(product.price).toLocaleString("fr-CM")} XAF</p>
            <p class="stock">Stock: ${stock}</p>
            <button onclick="addToCart('${id}')" ${stock <= 0 ? "disabled" : ""}>
                ${stock <= 0 ? "Out of Stock" : "Add to Cart"}
            </button>
        `;
        container.appendChild(card);
    });

    visibleProductCount += nextProducts.length;
    updateCatalogLoader(productsArray.length);
}

function updateCatalogLoader(totalProducts) {
    const loader = document.getElementById("catalogLoader");

    if (!loader) {
        return;
    }

    if (visibleProductCount < totalProducts) {
        loader.textContent = "Scroll to discover more products";
        loader.classList.remove("hidden");
    } else {
        loader.textContent = totalProducts === 0
            ? "No products available."
            : "You have reached the end of the catalog.";
    }
}

function loadNextProductBatch() {
    if (visibleProductCount < products.length) {
        displayProducts(products);
    }
}

productObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
        loadNextProductBatch();
    }
});

productObserver.observe(document.getElementById("catalogLoader"));


        /*
        ====================================================
        ADD TO CART
        ====================================================
        */

        function addToCart(productId) {

            const product =
                products.find(
                    p =>
                        String(p.productId || p.id) === String(productId)
                );

            if (!product) {

                showMessage(
                    "Product not found.",
                    false
                );

                return;
            }


            const existing =
                cart.find(
                    item =>
                        String(item.productId) === String(productId)
                );


            if (existing) {

                if (
                    existing.quantity + 1 >
                    product.stock
                ) {

                    showMessage(
                        "Not enough stock.",
                        false
                    );

                    return;
                }

                existing.quantity++;

            } else {

                cart.push({

                    productId:
                        product.productId || product.id,

                    name:
                        product.name,

                    price:
                        Number(product.price),

                    quantity: 1

                });

            }


            updateCartCount();

            showMessage(
                `${product.name} added to cart.`
            );

        }


        /*
        ====================================================
        UPDATE CART COUNT
        ====================================================
        */

        function updateCartCount() {

            const count =
                cart.reduce(
                    (total, item) =>
                        total + item.quantity,
                    0
                );

            document.getElementById(
                "cartCount"
            ).textContent = count;

        }


        /*
        ====================================================
        SHOW CART
        ====================================================
        */

        function showCart() {

            hideSections();

            document
                .getElementById("cartSection")
                .classList.remove("hidden");

            displayCart();

        }


        /*
        ====================================================
        DISPLAY CART
        ====================================================
        */

        function displayCart() {

            const container =
                document.getElementById(
                    "cartItems"
                );

            container.innerHTML = "";


            if (cart.length === 0) {

                container.innerHTML =
                    "<p>Your cart is empty.</p>";

                document.getElementById(
                    "cartTotal"
                ).textContent = "0";

                return;
            }


            let total = 0;


            cart.forEach(item => {

                const subtotal =
                    item.price *
                    item.quantity;

                total += subtotal;


                const div =
                    document.createElement("div");

                div.className = "cart-item";

                div.innerHTML = `

                    <div>

                        <strong>
                            ${item.name}
                        </strong>

                        <br>

                        Quantity:
                        ${item.quantity}

                        <br>

                        Subtotal:
                        ${subtotal.toLocaleString("fr-CM")} XAF

                    </div>

                    <button
                        class="remove-btn"
                        onclick="removeFromCart('${item.productId}')"
                    >
                        Remove
                    </button>

                `;

                container.appendChild(div);

            });


            document.getElementById(
                "cartTotal"
            ).textContent = total.toLocaleString("fr-CM");

        }


        /*
        ====================================================
        REMOVE FROM CART
        ====================================================
        */

        function removeFromCart(productId) {

            cart =
                cart.filter(
                    item =>
                        String(item.productId) !== String(productId)
                );

            updateCartCount();

            displayCart();

            showMessage(
                "Product removed from cart."
            );

        }


        /*
        ====================================================
        CHECKOUT
        ====================================================
        */

        function showCheckout() {

            if (cart.length === 0) {

                showMessage(
                    "Your cart is empty.",
                    false
                );

                return;
            }

            hideSections();

            document
                .getElementById("checkoutSection")
                .classList.remove("hidden");

            document
                .getElementById("customerName")
                .value = customerName;

        }

        document
            .getElementById("paymentMethod")
            .addEventListener("change", function() {

                const momoPhoneGroup = document
                    .getElementById("momoPhoneGroup");

                const momoPhone = document
                    .getElementById("momoPhone");

                const isMomo = this.value === "Mobile Money";

                momoPhoneGroup.classList.toggle("hidden", !isMomo);
                momoPhone.required = isMomo;

            });


        /*
        ====================================================
        CHECKOUT FORM
        ====================================================
        */

        document
            .getElementById("checkoutForm")
            .addEventListener(
                "submit",
                async function(event) {

                    event.preventDefault();


                    const name =
                        document.getElementById(
                            "customerName"
                        ).value;


                    const amount =
                        Number(
                            document.getElementById(
                                "paymentAmount"
                            ).value
                        );


                    const paymentMethod =
                        document.getElementById(
                            "paymentMethod"
                        ).value;


                    const total =
                        cart.reduce(
                            (sum, item) =>
                                sum +
                                item.price *
                                item.quantity,
                            0
                        );


                    if (amount !== total) {

                        showMessage(
                            `Incorrect amount. You must pay ${total.toLocaleString("fr-CM")} XAF.`,
                            false
                        );

                        return;
                    }


                    if (paymentMethod === "Mobile Money") {

                        const momoPhone = document
                            .getElementById("momoPhone")
                            .value
                            .trim();

                        try {

                            showMessage("Sending payment request to your phone...");

                            const paymentResponse = await fetch(
                                `${API_URL}/payments/momo`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        amount: total,
                                        phone: momoPhone
                                    })
                                }
                            );

                            const payment = await paymentResponse.json();

                            if (!paymentResponse.ok) {
                                throw new Error(payment.message);
                            }

                            momoReference = payment.reference;
                            showMessage("Approve the payment on your phone...");

                            let paymentStatus = "PENDING";

                            for (let attempt = 0; attempt < 12; attempt++) {

                                await new Promise(resolve =>
                                    setTimeout(resolve, 2500)
                                );

                                const statusResponse = await fetch(
                                    `${API_URL}/payments/momo/${momoReference}`
                                );

                                const status = await statusResponse.json();
                                paymentStatus = status.status;

                                if (paymentStatus === "SUCCESSFUL") {
                                    break;
                                }

                                if (["FAILED", "REJECTED", "TIMEOUT"].includes(paymentStatus)) {
                                    throw new Error("Mobile Money payment was not successful.");
                                }

                            }

                            if (paymentStatus !== "SUCCESSFUL") {
                                throw new Error("Payment timed out. Please try again.");
                            }

                        } catch (error) {

                            showMessage(error.message || "Mobile Money payment failed.", false);
                            return;

                        }

                    }

                    try {

                        const response =
                            await fetch(
                                `${API_URL}/orders`,
                                {

                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify({

                                            customerName:
                                                name,

                                            items:
                                                cart,

                                            total:
                                                total,

                                            paymentAmount:
                                                amount,

                                            paymentMethod:
                                                paymentMethod,

                                            momoReference:
                                                momoReference

                                        })

                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Checkout failed"
                            );

                        }


                        const order =
                            await response.json();


                        showMessage(
                            "Order placed successfully!"
                        );


                        cart = [];

                        updateCartCount();


                        document
                            .getElementById(
                                "checkoutForm"
                            )
                            .reset();


                        showProducts();


                    } catch (error) {

                        console.error(error);

                        showMessage(
                            "Checkout failed. Check your backend.",
                            false
                        );

                    }

                }
            );


        /*
        ====================================================
        ADMIN LOGIN
        ====================================================
        */

        function showAdminLogin() {

            hideSections();

            document
                .getElementById(
                    "adminLoginSection"
                )
                .classList.remove("hidden");

        }

        function adminLogout() {
            adminLoggedIn = false;
            signedInAdminName = "";
            cognitoTokens = null;
            localStorage.removeItem("cognitoTokens");
            localStorage.removeItem("adminUsername");
            showAdminLogin();
            showMessage("You have been logged out.");
        }

        let adminAuthMode = "signin";

        function showAdminAuthMode(mode) {
            adminAuthMode = mode;
            const registering = mode === "register";
            document.getElementById("adminEmailGroup").classList.toggle("hidden", !registering);
            document.getElementById("adminEmail").required = registering;
            document.getElementById("adminAuthTitle").textContent = registering ? "Create Admin Account" : "Admin Sign In";
            document.getElementById("adminSubmitText").textContent = registering ? "Create account" : "Sign in";
            document.getElementById("signInTab").classList.toggle("active", !registering);
            document.getElementById("registerTab").classList.toggle("active", registering);
        }

        async function loadCognitoConfig() {
            try {
                const response = await fetch(`${API_URL}/admin/config`);
                if (response.ok) {
                    cognitoConfig = await response.json();
                    console.log("Cognito config loaded:", cognitoConfig);
                }
            } catch (error) {
                console.error("Failed to load Cognito config:", error);
            }
        }

        function restoreAdminSession() {
            const stored = localStorage.getItem("cognitoTokens");
            const username = localStorage.getItem("adminUsername");
            if (stored && username) {
                try {
                    cognitoTokens = JSON.parse(stored);
                    signedInAdminName = username;
                    adminLoggedIn = true;
                } catch (error) {
                    console.error("Failed to restore session:", error);
                    localStorage.removeItem("cognitoTokens");
                    localStorage.removeItem("adminUsername");
                }
            }
        }

        function getAuthHeaders() {
            const headers = { "Content-Type": "application/json" };
            if (cognitoTokens?.accessToken) {
                headers["Authorization"] = `Bearer ${cognitoTokens.accessToken}`;
            }
            return headers;
        }


        /*
        ====================================================
        ADMIN LOGIN FORM
        ====================================================
        */

        document
            .getElementById("adminLoginForm")
            .addEventListener(
                "submit",
                async function(event) {

                    event.preventDefault();

                    const username =
                        document.getElementById(
                            "adminUsername"
                        ).value;

                    const email = document
                        .getElementById("adminEmail")
                        .value;

                    const password =
                        document.getElementById(
                            "adminPassword"
                        ).value;

                    try {
                        const endpoint = adminAuthMode === "register" ? "register" : "login";
                        const body = {
                            name: username,
                            password: password
                        };
                        if (adminAuthMode === "register") {
                            body.email = email;
                            body.displayName = username;
                        }

                        const response =
                            await fetch(
                                `${API_URL}/admin/${endpoint}`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },
                                    body: JSON.stringify(body)
                                }
                            );

                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || "Authentication failed");
                        }

                        if (adminAuthMode === "register") {
                            showAdminAuthMode("signin");
                            document.getElementById("adminPassword").value = "";
                            showMessage("Account created. Sign in with your new account.");
                            return;
                        }

                        const data = await response.json();
                        adminLoggedIn = true;
                        signedInAdminName = data.admin?.username || data.admin?.name || username;
                        cognitoTokens = data.tokens || null;
                        localStorage.setItem("cognitoTokens", JSON.stringify(cognitoTokens));
                        localStorage.setItem("adminUsername", signedInAdminName);

                        showAdminPanel();

                        showMessage(
                            "Admin login successful."
                        );


                    } catch (error) {

                        console.error(error);

                        showMessage(
                            error.message || "Invalid admin credentials.",
                            false
                        );

                    }

                }
            );


        /*
        ====================================================
        ADMIN PANEL
        ====================================================
        */

        function showAdminPanel() {

            if (!adminLoggedIn) {

                showAdminLogin();

                return;
            }


            hideSections();

            document
                .getElementById(
                    "adminSection"
                )
                .classList.remove("hidden");

            loadProducts(true).then(() => displayAdminProducts(products));

        }


        /*
        ====================================================
        ADMIN PRODUCTS
        ====================================================
        */

        function displayAdminProducts(products) {
    // 1. Safely extract products array from different response structures
    const productsArray = Array.isArray(products)
        ? products
        : (products?.products || products?.Items || []);

    // 2. Safely grab container element
    const container = document.getElementById("adminProducts");
    if (!container) {
        console.error("DOM element 'adminProducts' not found on this page.");
        return;
    }

    // 3. Clear previous contents
    container.innerHTML = "";

    // 4. Handle empty array or invalid payload cleanly
    if (!Array.isArray(productsArray) || productsArray.length === 0) {
        console.warn("No products array found or data is empty:", products);
        container.innerHTML = "<p>No products available.</p>";
        return;
    }

    // 5. Render product cards safely
    productsArray.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card admin-product-card";

        // Supports both 'productId' or 'id' from DynamoDB
        const id = product.productId || product.id || "N/A";
        const price = product.price ?? 0;
        const stock = product.stock ?? 0;

        if (String(selectedAdminProductId) === String(id)) {
            card.classList.add("selected");
        }

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.imageUrl || productImages[product.name] || productImages["Laptop"]}"
                    alt="${product.name || "Product"}"
                    loading="lazy"
                    onerror="this.src='https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=85'">
            </div>
            <h3>${product.name || "Unnamed Product"}</h3>
            <p>ID: ${id}</p>
            <p>Price: ${Number(price).toLocaleString("fr-CM")} XAF</p>
            <p>Stock: ${stock}</p>
            <p>Category: ${product.category || "Uncategorized"}</p>
            <p><span class="visibility-badge ${product.visibility === "PUBLIC" ? "badge-public" : "badge-private"}"
                style="padding:2px 10px;border-radius:12px;font-size:0.8em;font-weight:bold;
                ${product.visibility === "PUBLIC" ? "background:#16a34a;color:#fff" : "background:#f59e0b;color:#fff"}">
                ${product.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE"}</span></p>
        `;

        card.addEventListener("click", function() {

            selectedAdminProductId = id;
            displayAdminProducts(productsArray);

        });

        if (Number(selectedAdminProductId) === Number(id)) {

            const actions = document.createElement("div");
            actions.className = "product-actions";
            actions.innerHTML = `
                <button class="add-action" type="button">Add</button>
                <button class="update-action" type="button">Update</button>
                <button class="delete-action" type="button">Delete</button>
            `;

            actions.querySelector(".add-action").addEventListener("click", function(event) {
                event.stopPropagation();
                showAddProduct();
            });

            actions.querySelector(".update-action").addEventListener("click", function(event) {
                event.stopPropagation();
                showUpdateProduct();
            });

            actions.querySelector(".delete-action").addEventListener("click", function(event) {
                event.stopPropagation();
                showDeleteProduct();
            });

            card.appendChild(actions);
        }

        container.appendChild(card);
    });
}

        async function loadAdminSales() {

            try {
                const response = await fetch(`${API_URL}/orders`);
                if (!response.ok) throw new Error("Unable to load sales");

                const orders = await response.json();
                const soldByProduct = {};
                const buyersByProduct = {};

                orders.forEach(order => {
                    (order.items || []).forEach(item => {
                        const id = String(item.productId);
                        soldByProduct[id] = (soldByProduct[id] || 0) + Number(item.quantity || 0);
                        buyersByProduct[id] = buyersByProduct[id] || [];
                        if (order.customerName && !buyersByProduct[id].includes(order.customerName)) {
                            buyersByProduct[id].push(order.customerName);
                        }
                    });
                });

                const totalSold = Object.values(soldByProduct).reduce((sum, value) => sum + value, 0);
                const totalRemaining = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);

                document.getElementById("totalProductCount").textContent = products.length;
                document.getElementById("totalSoldCount").textContent = totalSold;
                document.getElementById("totalRemainingCount").textContent = totalRemaining;

                document.getElementById("salesTracking").innerHTML = `
                    <table class="sales-table">
                        <thead><tr><th>Product</th><th>Sold</th><th>Remaining</th><th>Buyers</th></tr></thead>
                        <tbody>${products.map(product => {
                            const pid = String(product.productId || product.id);
                            return `
                            <tr>
                                <td>${product.name}</td>
                                <td>${soldByProduct[pid] || 0}</td>
                                <td>${product.stock || 0}</td>
                                <td>${(buyersByProduct[pid] || []).join(", ") || "No sales yet"}</td>
                            </tr>`;
                        }).join("")}</tbody>
                    </table>`;
            } catch (error) {
                document.getElementById("salesTracking").innerHTML = '<p class="empty">Sales history is unavailable.</p>';
            }
        }

        /*
        ====================================================
        ADD PRODUCT MODAL
        ====================================================
        */

        function showAddProduct() {

            document.getElementById(
                "addProductModal"
            ).style.display = "flex";

        }


        /*
        ====================================================
        ADD PRODUCT FORM
        ====================================================
        */

        document
            .getElementById("addProductForm")
            .addEventListener(
                "submit",
                async function(event) {

                    event.preventDefault();


                    const imageUrl = await readProductImage(
                        document.getElementById("addImage").files[0]
                    );

                    const product = {

                        productId:
                            Number(
                                document.getElementById(
                                    "addId"
                                ).value
                            ),

                        name:
                            document.getElementById(
                                "addName"
                            ).value,

                        description:
                            document.getElementById(
                                "addDescription"
                            ).value,

                        price:
                            Number(
                                document.getElementById(
                                    "addPrice"
                                ).value
                            ),

                        stock:
                            Number(
                                document.getElementById(
                                    "addStock"
                                ).value
                            ),

                        category:
                            document.getElementById(
                                "addCategory"
                            ).value,

                        ownerName:
                            signedInAdminName,

                        visibility: document.getElementById("addVisibility").value,

                        imageUrl: imageUrl

                    };


                    try {

                        const response =
                            await fetch(
                                `${API_URL}/products`,
                                {

                                    method: "POST",

                                    headers: getAuthHeaders(),

                                    body:
                                        JSON.stringify(product)

                                }
                            );


                        if (!response.ok) {
                            const errorBody = await response.json().catch(() => ({}));
                            throw new Error(errorBody.message || "Product creation failed");
                        }


                        closeModal(
                            "addProductModal"
                        );


                        document
                            .getElementById(
                                "addProductForm"
                            )
                            .reset();


                        showMessage(
                            "Product added successfully."
                        );


                        await loadProducts(true);

                        displayAdminProducts(products);


                    } catch (error) {

                        console.error(error);

                        showMessage(
                            "Unable to add product.",
                            false
                        );

                    }

                }
            );


        /*
        ====================================================
        UPDATE PRODUCT MODAL
        ====================================================
        */

        function showUpdateProduct() {

            const product = products.find(item =>
                String(item.productId || item.id) === String(selectedAdminProductId)
            );

            if (!product) {
                showMessage("Select a product to update.", false);
                return;
            }

            document.getElementById("updateId").value = product.productId;
            document.getElementById("updateName").value = product.name;
            document.getElementById("updatePrice").value = product.price;
            document.getElementById("updateStock").value = product.stock;
            document.getElementById("updateCategory").value = product.category;

            document.getElementById(
                "updateProductModal"
            ).style.display = "flex";

        }


        /*
        ====================================================
        UPDATE PRODUCT
        ====================================================
        */

        document
            .getElementById("updateProductForm")
            .addEventListener(
                "submit",
                async function(event) {

                    event.preventDefault();


                    const id =
                        document.getElementById(
                            "updateId"
                        ).value;


                    const imageUrl = await readProductImage(
                        document.getElementById("updateImage").files[0]
                    );

                    const data = {

                        name:
                            document.getElementById(
                                "updateName"
                            ).value,

                        price:
                            Number(
                                document.getElementById(
                                    "updatePrice"
                                ).value
                            ),

                        stock:
                            Number(
                                document.getElementById(
                                    "updateStock"
                                ).value
                            ),

                        category:
                            document.getElementById(
                                "updateCategory"
                            ).value,

                        ...(imageUrl ? { imageUrl: imageUrl } : {})

                    };


                    try {

                        const response =
                            await fetch(
                                `${API_URL}/products/${id}`,
                                {

                                    method: "PUT",

                                    headers:
                                        getAuthHeaders(),

                                    body:
                                        JSON.stringify(data)

                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Update failed"
                            );

                        }


                        closeModal(
                            "updateProductModal"
                        );


                        document
                            .getElementById(
                                "updateProductForm"
                            )
                            .reset();


                        showMessage(
                            "Product updated successfully."
                        );


                        await loadProducts(true);

                        displayAdminProducts(products);


                    } catch (error) {

                        console.error(error);

                        showMessage(
                            "Unable to update product.",
                            false
                        );

                    }

                }
            );


        /*
        ====================================================
        DELETE PRODUCT MODAL
        ====================================================
        */

        function showDeleteProduct() {

            if (!selectedAdminProductId) {
                showMessage("Select a product to delete.", false);
                return;
            }

            document.getElementById("deleteId").value = selectedAdminProductId;

            document.getElementById(
                "deleteProductModal"
            ).style.display = "flex";

        }


        /*
        ====================================================
        DELETE PRODUCT
        ====================================================
        */

        document
            .getElementById("deleteProductForm")
            .addEventListener(
                "submit",
                async function(event) {

                    event.preventDefault();


                    const id =
                        document.getElementById(
                            "deleteId"
                        ).value;


                    const confirmed =
                        confirm(
                            "Are you sure you want to delete this product?"
                        );


                    if (!confirmed) {

                        return;
                    }


                    try {

                        const response =
                            await fetch(
                                `${API_URL}/products/${id}`,
                                {

                                    method: "DELETE",

                                    headers:
                                        getAuthHeaders()

                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Delete failed"
                            );

                        }


                        closeModal(
                            "deleteProductModal"
                        );


                        document
                            .getElementById(
                                "deleteProductForm"
                            )
                            .reset();


                        showMessage(
                            "Product deleted successfully."
                        );


                        await loadProducts(true);

                        displayAdminProducts(products);


                    } catch (error) {

                        console.error(error);

                        showMessage(
                            "Unable to delete product.",
                            false
                        );

                    }

                }
            );


        /*
        ====================================================
        CLOSE MODAL
        ====================================================
        */

        function closeModal(id) {

            document.getElementById(
                id
            ).style.display = "none";

        }
        /* FORGOT PASSWORD FLOW */
      let forgotEmailSaved = "";
      let forgotNameSaved = "";

      function showForgotPassword(event) {
        if (event) event.preventDefault();
        document.getElementById("forgotStep1").classList.remove("hidden");
        document.getElementById("forgotStep2").classList.add("hidden");
        document.getElementById("forgotPasswordModal").style.display = "flex";
      }

      async function requestForgotCode(name, email) {
        const response = await fetch(`${API_URL}/admin/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to send code.");
        return data;
      }

      document
        .getElementById("forgotForm")
        .addEventListener("submit", async function (event) {
          event.preventDefault();
          const name = document.getElementById("forgotName").value.trim();
          const email = document.getElementById("forgotEmail").value.trim();
          try {
            await requestForgotCode(name, email);
            forgotEmailSaved = email;
            forgotNameSaved = name;
            document.getElementById("forgotStep1").classList.add("hidden");
            document.getElementById("forgotStep2").classList.remove("hidden");
            showMessage("Confirmation code sent. Check your email (valid 2 hours).");
          } catch (error) {
            showMessage(error.message, false);
          }
        });

      async function resendForgotCode() {
        try {
          await requestForgotCode(forgotNameSaved, forgotEmailSaved);
          showMessage("A new confirmation code has been sent to your email.");
        } catch (error) {
          showMessage(error.message, false);
        }
      }

      document
        .getElementById("resetForm")
        .addEventListener("submit", async function (event) {
          event.preventDefault();
          const code = document.getElementById("resetCode").value.trim();
          const password = document.getElementById("resetPassword").value;
          try {
            const response = await fetch(`${API_URL}/admin/reset-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: forgotEmailSaved, code, password }),
            });
            const data = await response.json().catch(() => ({}));
            if (data.expired) {
              showMessage("Code expired - a new code has been sent.", false);
              await resendForgotCode();
              return;
            }
            if (!response.ok) throw new Error(data.message || "Reset failed.");
            closeModal("forgotPasswordModal");
            document.getElementById("resetForm").reset();
            document.getElementById("forgotForm").reset();
            showMessage("Password reset successful. You can now sign in.");
          } catch (error) {
            showMessage(error.message, false);
          }
        });

      /* GOOGLE SIGN-IN via the Cognito Hosted UI */
      function signInWithGoogle() {
        if (!cognitoConfig || !cognitoConfig.cognitoDomain) {
          showMessage("Google sign-in is not configured yet.", false);
          return;
        }
        const redirectUri = window.location.origin + window.location.pathname;
        const url =
          cognitoConfig.cognitoDomain +
          "/oauth2/authorize?identity_provider=Google&redirect_uri=" +
          encodeURIComponent(redirectUri) +
          "&response_type=token&client_id=" +
          encodeURIComponent(cognitoConfig.clientId) +
          "&scope=email+openid+profile";
        window.location.href = url;
      }

      /* Handle tokens returned by the Hosted UI redirect. */
      (function handleGoogleRedirect() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        if (!accessToken) return;
        const idToken = params.get("id_token");
        cognitoTokens = { accessToken, idToken };
        adminLoggedIn = true;
        signedInAdminName = "google-user";
        localStorage.setItem("cognitoTokens", JSON.stringify(cognitoTokens));
        localStorage.setItem("adminUsername", signedInAdminName);
        window.location.hash = "";
        showAdminPanel();
      })();

      /*
        ====================================================
        START APPLICATION
        ====================================================
        */

        showHome();

        // Initialize Cognito and restore session
        (async () => {
            await loadCognitoConfig();
            restoreAdminSession();
            if (adminLoggedIn) {
                showAdminPanel();
            }
        })();

    