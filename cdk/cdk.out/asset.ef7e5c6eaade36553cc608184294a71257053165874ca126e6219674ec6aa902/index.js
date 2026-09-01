const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  TransactWriteCommand
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const crypto = require("crypto");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const ADMIN_TABLE_NAME = process.env.ADMIN_TABLE_NAME || TABLE_NAME;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

const bodyOf = event => {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch { return null; }
};

const productKey = productId => ({ entityType: "PRODUCT", entityId: String(productId) });
const orderKey = orderId => ({ entityType: "ORDER", entityId: String(orderId) });
const adminKey = name => ({ entityType: "ADMIN", entityId: String(name).trim().toLowerCase() });
const passwordHash = password => crypto.createHash("sha256").update(String(password)).digest("hex");

async function products() {
  const result = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "entityType = :type",
    ExpressionAttributeValues: { ":type": "PRODUCT" }
  }));
  return (result.Items || []).sort((a, b) => Number(a.productId) - Number(b.productId));
}

exports.getProducts = async event => {
  try {
    const catalog = await products();
    return response(200, event?.queryStringParameters?.availableOnly === "true" ? catalog.filter(product => Number(product.stock) > 0) : catalog);
  }
  catch (error) { console.error(error); return response(500, { message: "Unable to retrieve products" }); }
};

exports.getProduct = async event => {
  try {
    const result = await client.send(new GetCommand({ TableName: TABLE_NAME, Key: productKey(event.pathParameters.id) }));
    return result.Item ? response(200, result.Item) : response(404, { message: "Product not found" });
  } catch (error) { console.error(error); return response(500, { message: "Unable to retrieve product" }); }
};

exports.createProduct = async event => {
  const input = bodyOf(event);
  if (!input || !input.productId || !input.name || input.price === undefined || input.stock === undefined || !input.category) {
    return response(400, { message: "All required fields must be provided" });
  }
  const product = {
    ...productKey(input.productId), productId: Number(input.productId), name: String(input.name),
    description: String(input.description || ""), price: Number(input.price), stock: Number(input.stock), category: String(input.category), imageUrl: String(input.imageUrl || "")
  };
  if (!Number.isFinite(product.price) || product.price < 0 || !Number.isInteger(product.stock) || product.stock < 0) {
    return response(400, { message: "Price and stock must be valid non-negative values" });
  }
  try {
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: product, ConditionExpression: "attribute_not_exists(entityType)" }));
    return response(201, { message: "Product added successfully", product });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return response(400, { message: "Product ID already exists" });
    console.error(error); return response(500, { message: "Unable to add product" });
  }
};

exports.updateProduct = async event => {
  const input = bodyOf(event);
  if (!input) return response(400, { message: "Request body must be valid JSON" });
  const id = event.pathParameters.id;
  const names = {}, values = {}, updates = [];
  for (const field of ["name", "description", "price", "stock", "category", "imageUrl"]) {
    if (input[field] !== undefined) {
      names[`#${field}`] = field; values[`:${field}`] = field === "price" ? Number(input[field]) : field === "stock" ? Number(input[field]) : String(input[field]);
      updates.push(`#${field} = :${field}`);
    }
  }
  if (!updates.length) return response(400, { message: "At least one product field is required" });
  try {
    const result = await client.send(new UpdateCommand({ TableName: TABLE_NAME, Key: productKey(id), UpdateExpression: `SET ${updates.join(", ")}`, ExpressionAttributeNames: names, ExpressionAttributeValues: values, ConditionExpression: "attribute_exists(entityType)", ReturnValues: "ALL_NEW" }));
    return response(200, { message: "Product updated successfully", product: result.Attributes });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return response(404, { message: "Product not found" });
    console.error(error); return response(500, { message: "Unable to update product" });
  }
};

exports.deleteProduct = async event => {
  try {
    const result = await client.send(new DeleteCommand({ TableName: TABLE_NAME, Key: productKey(event.pathParameters.id), ConditionExpression: "attribute_exists(entityType)", ReturnValues: "ALL_OLD" }));
    return response(200, { message: "Product deleted successfully", product: result.Attributes });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return response(404, { message: "Product not found" });
    console.error(error); return response(500, { message: "Unable to delete product" });
  }
};

exports.login = async event => {
  const input = bodyOf(event) || {};
  if (!input.name || !input.password) return response(400, { success: false, message: "Name and password are required" });
  const result = await client.send(new GetCommand({ TableName: ADMIN_TABLE_NAME, Key: adminKey(input.name) }));
  if (!result.Item || result.Item.passwordHash !== passwordHash(input.password)) return response(401, { success: false, message: "Admin name or password is incorrect" });
  return response(200, { success: true, message: "Admin login successful", admin: { name: result.Item.name, email: result.Item.email } });
};

exports.registerAdmin = async event => {
  const input = bodyOf(event) || {};
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  if (!name || !email || !input.password || !/^\S+@\S+\.\S+$/.test(email) || String(input.password).length < 4) return response(400, { success: false, message: "Name, valid email, and a password of at least 4 characters are required" });
  const admin = { ...adminKey(name), name, email, passwordHash: passwordHash(input.password), role: "admin", createdAt: new Date().toISOString() };
  try {
    await client.send(new PutCommand({ TableName: ADMIN_TABLE_NAME, Item: admin, ConditionExpression: "attribute_not_exists(entityType)" }));
    return response(201, { success: true, message: "Admin account created", admin: { name, email } });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return response(409, { success: false, message: "An admin with that name already exists" });
    console.error(error); return response(500, { success: false, message: "Unable to create admin account" });
  }
};

exports.authRouter = async event => {
  if (event.httpMethod === "POST" && event.path?.endsWith("/register")) return exports.registerAdmin(event);
  return exports.login(event);
};

async function momoToken() {
  const credentials = Buffer.from(`${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`).toString("base64");
  const result = await fetch(`${process.env.MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  if (!result.ok) throw new Error(`MoMo token request failed: ${result.status}`);
  return (await result.json()).access_token;
}

exports.initiateMomoPayment = async event => {
  const input = bodyOf(event) || {};
  const amount = Number(input.amount);
  const phone = String(input.phone || "");
  if (!Number.isInteger(amount) || amount <= 0 || !/^2376\d{8}$/.test(phone)) {
    return response(400, { message: "A valid XAF amount and Cameroon MoMo number are required" });
  }
  if (!process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY || !process.env.MOMO_API_USER || !process.env.MOMO_API_KEY) {
    return response(503, { message: "Mobile Money is not configured yet" });
  }
  const reference = crypto.randomUUID();
  try {
    const token = await momoToken();
    const result = await fetch(`${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": reference,
        "X-Target-Environment": process.env.MOMO_TARGET_ENVIRONMENT || "sandbox",
        "Ocp-Apim-Subscription-Key": process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: String(amount), currency: "XAF", externalId: `northstar-${Date.now()}`, payer: { partyIdType: "MSISDN", partyId: phone }, payerMessage: "Northstar Market purchase", payeeNote: "Northstar Market purchase" })
    });
    if (!result.ok && result.status !== 202) throw new Error(`MoMo request failed: ${result.status}`);
    return response(202, { success: true, reference, message: "Payment request sent. Approve it on your phone." });
  } catch (error) { console.error(error); return response(502, { message: "Could not start Mobile Money payment" }); }
};

exports.momoPaymentStatus = async event => {
  if (!process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY || !process.env.MOMO_API_USER || !process.env.MOMO_API_KEY) return response(503, { message: "Mobile Money is not configured yet" });
  try {
    const token = await momoToken();
    const result = await fetch(`${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay/${event.pathParameters.reference}`, { headers: { Authorization: `Bearer ${token}`, "X-Target-Environment": process.env.MOMO_TARGET_ENVIRONMENT || "sandbox", "Ocp-Apim-Subscription-Key": process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY } });
    return response(result.status, await result.json());
  } catch (error) { console.error(error); return response(502, { message: "Could not check Mobile Money payment" }); }
};

exports.createOrder = async event => {
  const input = bodyOf(event) || {};
  if (!input.customerName) return response(400, { message: "Customer name is required" });
  if (!Array.isArray(input.items) || !input.items.length) return response(400, { message: "Shopping cart is empty" });
  const items = input.items.map(item => ({ productId: Number(item.productId), quantity: Number(item.quantity) }));
  if (items.some(item => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) return response(400, { message: "Each item needs a valid quantity" });
  try {
    if (input.paymentMethod === "Mobile Money") {
      if (!input.momoReference) return response(400, { message: "Complete the Mobile Money payment first" });
      const token = await momoToken();
      const paymentResponse = await fetch(`${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay/${input.momoReference}`, { headers: { Authorization: `Bearer ${token}`, "X-Target-Environment": process.env.MOMO_TARGET_ENVIRONMENT || "sandbox", "Ocp-Apim-Subscription-Key": process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY } });
      const payment = await paymentResponse.json();
      if (payment.status !== "SUCCESSFUL") return response(402, { message: "Mobile Money payment has not been completed", paymentStatus: payment.status || "PENDING" });
    }
    const fetched = await Promise.all(items.map(item => client.send(new GetCommand({ TableName: TABLE_NAME, Key: productKey(item.productId) }))));
    const productsById = new Map(fetched.map(result => [Number(result.Item?.productId), result.Item]));
    let total = 0;
    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) return response(404, { message: `Product ${item.productId} not found` });
      if (Number(product.stock) < item.quantity) return response(400, { message: `Not enough stock for ${product.name}` });
      total += Math.round(Number(product.price) * 100) * item.quantity;
    }
    if (Math.round(Number(input.paymentAmount) * 100) !== total) return response(400, { message: "Incorrect payment amount", required: total / 100 });
    const order = { ...orderKey(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), orderId: Date.now(), customerName: String(input.customerName), items, total: total / 100, status: "Confirmed", paymentMethod: String(input.paymentMethod || "Card"), paymentAmount: Number(input.paymentAmount), date: new Date().toISOString() };
    await client.send(new TransactWriteCommand({ TableName: TABLE_NAME, TransactItems: [
      ...items.map(item => ({ Update: { Key: productKey(item.productId), UpdateExpression: "SET stock = stock - :quantity", ConditionExpression: "stock >= :quantity", ExpressionAttributeValues: { ":quantity": item.quantity } } })),
      { Put: { Item: order } }
    ] }));
    return response(201, { success: true, message: "Order placed successfully", order });
  } catch (error) {
    if (error.name === "TransactionCanceledException") return response(409, { message: "Stock changed while checking out. Please refresh and try again." });
    console.error(error); return response(500, { message: "Checkout failed" });
  }
};

exports.listOrders = async () => {
  try {
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "entityType = :type",
      ExpressionAttributeValues: { ":type": "ORDER" }
    }));
    return response(200, result.Items || []);
  } catch (error) { console.error(error); return response(500, { message: "Unable to retrieve orders" }); }
};

exports.catalogRouter = async event => {
  if (event.httpMethod === "GET" && event.pathParameters?.id) return exports.getProduct(event);
  if (event.httpMethod === "GET") return exports.getProducts(event);
  if (event.httpMethod === "POST") return exports.createProduct(event);
  if (event.httpMethod === "PUT") return exports.updateProduct(event);
  if (event.httpMethod === "DELETE") return exports.deleteProduct(event);
  return response(405, { message: "Method not allowed" });
};

exports.ordersRouter = async event => {
  if (event.httpMethod === "GET") return exports.listOrders(event);
  if (event.httpMethod === "POST") return exports.createOrder(event);
  return response(405, { message: "Method not allowed" });
};

exports.momoRouter = async event => {
  if (event.httpMethod === "POST") return exports.initiateMomoPayment(event);
  if (event.httpMethod === "GET") return exports.momoPaymentStatus(event);
  return response(405, { message: "Method not allowed" });
};
