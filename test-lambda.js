const assert = require("assert");
const { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, TransactWriteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Set environment variables before requiring lambda/index.js
process.env.TABLE_NAME = "EcommerceTable";
process.env.ADMIN_TABLE_NAME = "AdminTable";
process.env.IMAGES_BUCKET = "product-images-bucket";
process.env.AWS_REGION = "us-east-1";

// In-memory table mock database
const store = new Map();

const keyStr = (table, key) => `${table}:${key.entityType}:${key.entityId}`;

// Intercept DynamoDB calls
DynamoDBDocumentClient.prototype.send = async function(command) {
  const table = command.input?.TableName;

  if (command instanceof QueryCommand) {
    const items = [];
    for (const [k, v] of store.entries()) {
      if (k.startsWith(`${table}:${command.input.ExpressionAttributeValues[":type"]}:`)) {
        items.push(v);
      }
    }
    return { Items: items };
  }

  if (command instanceof ScanCommand) {
    const items = [];
    for (const [k, v] of store.entries()) {
      if (v.entityType === command.input.ExpressionAttributeValues[":type"]) {
        items.push(v);
      }
    }
    return { Items: items };
  }

  if (command instanceof GetCommand) {
    const k = keyStr(table, command.input.Key);
    return { Item: store.get(k) || undefined };
  }

  if (command instanceof PutCommand) {
    const item = command.input.Item;
    const k = keyStr(table, { entityType: item.entityType, entityId: item.entityId });
    if (command.input.ConditionExpression?.includes("attribute_not_exists") && store.has(k)) {
      const err = new Error("The conditional request failed");
      err.name = "ConditionalCheckFailedException";
      throw err;
    }
    store.set(k, { ...item });
    return {};
  }

  if (command instanceof UpdateCommand) {
    const k = keyStr(table, command.input.Key);
    let item = store.get(k);
    if (!item) {
      if (command.input.ConditionExpression?.includes("attribute_exists")) {
        const err = new Error("The conditional request failed");
        err.name = "ConditionalCheckFailedException";
        throw err;
      }
      item = { ...command.input.Key };
    }
    const names = command.input.ExpressionAttributeNames || {};
    const values = command.input.ExpressionAttributeValues || {};
    // Basic parser for SET #name = :name
    for (const [alias, realName] of Object.entries(names)) {
      const valKey = `:${realName}`;
      if (values[valKey] !== undefined) {
        item[realName] = values[valKey];
      }
    }
    store.set(k, item);
    return { Attributes: item };
  }

  if (command instanceof DeleteCommand) {
    const k = keyStr(table, command.input.Key);
    const item = store.get(k);
    if (!item && command.input.ConditionExpression?.includes("attribute_exists")) {
      const err = new Error("The conditional request failed");
      err.name = "ConditionalCheckFailedException";
      throw err;
    }
    store.delete(k);
    return { Attributes: item };
  }

  if (command instanceof TransactWriteCommand) {
    for (const txItem of command.input.TransactItems) {
      if (txItem.Update) {
        const u = txItem.Update;
        const k = keyStr(u.TableName, u.Key);
        const item = store.get(k);
        if (!item) throw new Error("Item not found");
        const qty = u.ExpressionAttributeValues[":quantity"];
        if (item.stock < qty) {
          const err = new Error("Transaction cancelled");
          err.name = "TransactionCanceledException";
          throw err;
        }
        item.stock -= qty;
        store.set(k, item);
      }
      if (txItem.Put) {
        const p = txItem.Put;
        const k = keyStr(p.TableName, { entityType: p.Item.entityType, entityId: p.Item.entityId });
        store.set(k, { ...p.Item });
      }
    }
    return {};
  }

  throw new Error(`Unhandled command: ${command.constructor.name}`);
};

// Intercept S3 calls
S3Client.prototype.send = async function(command) {
  if (command instanceof PutObjectCommand) {
    return { ETag: '"mock-etag"' };
  }
  throw new Error(`Unhandled S3 command: ${command.constructor.name}`);
};

// Intercept Cognito calls
CognitoIdentityProvider.prototype.getUser = async function(params) {
  if (params.AccessToken === "valid-token") {
    return {
      Username: "adminuser",
      UserAttributes: [
        { Name: "email", Value: "admin@example.com" },
        { Name: "name", Value: "adminuser" }
      ]
    };
  }
  const err = new Error("Invalid token");
  err.name = "NotAuthorizedException";
  throw err;
};

CognitoIdentityProvider.prototype.signUp = async function(params) {
  if (params.Username === "existinguser") {
    const err = new Error("User exists");
    err.name = "UsernameExistsException";
    throw err;
  }
  return { UserSub: "sub-123" };
};

CognitoIdentityProvider.prototype.initiateAuth = async function(params) {
  if (params.AuthParameters.USERNAME === "adminuser" && params.AuthParameters.PASSWORD === "Password123") {
    return {
      AuthenticationResult: {
        AccessToken: "valid-token",
        IdToken: "id-token",
        RefreshToken: "refresh-token"
      }
    };
  }
  const err = new Error("Invalid auth");
  err.name = "NotAuthorizedException";
  throw err;
};

const lambda = require("./lambda/index.js");

async function runLambdaTests() {
  console.log("Running Lambda Function & DynamoDB Integration Tests...\n");

  // 1. Auth & Router tests
  console.log("1. Testing Auth Router & Cognito Sign Up / Sign In");
  const optionsRes = await lambda.authRouter({ httpMethod: "OPTIONS" });
  assert.strictEqual(optionsRes.statusCode, 200);

  const configRes = await lambda.authRouter({ httpMethod: "GET", path: "/api/admin/config" });
  assert.strictEqual(configRes.statusCode, 200);
  assert.strictEqual(JSON.parse(configRes.body).region, "us-east-1");

  const signUpRes = await lambda.authRouter({
    httpMethod: "POST",
    path: "/api/admin/register",
    body: JSON.stringify({ name: "adminuser", email: "admin@example.com", password: "Password123" })
  });
  assert.strictEqual(signUpRes.statusCode, 201);

  const signInRes = await lambda.authRouter({
    httpMethod: "POST",
    path: "/api/admin/login",
    body: JSON.stringify({ name: "adminuser", password: "Password123" })
  });
  assert.strictEqual(signInRes.statusCode, 200);
  const signInBody = JSON.parse(signInRes.body);
  assert.strictEqual(signInBody.tokens.accessToken, "valid-token");
  console.log("✓ Auth Router tests passed");

  // 2. Catalog & Product CRUD
  console.log("2. Testing Catalog Router & Product Operations");
  const authHeader = { Authorization: "Bearer valid-token" };

  // Create Product with Base64 image
  const base64Img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const createRes = await lambda.catalogRouter({
    httpMethod: "POST",
    headers: authHeader,
    body: JSON.stringify({ productId: 1, name: "Test Laptop", price: 500, stock: 10, category: "Tech", imageUrl: base64Img })
  });
  assert.strictEqual(createRes.statusCode, 201);
  const createdProduct = JSON.parse(createRes.body).product;
  assert.ok(createdProduct.imageUrl.includes("product-images-bucket.s3.us-east-1.amazonaws.com/products/1-"));

  // Get Product List
  const listRes = await lambda.catalogRouter({ httpMethod: "GET" });
  assert.strictEqual(listRes.statusCode, 200);
  const products = JSON.parse(listRes.body);
  assert.strictEqual(products.length, 1);
  assert.strictEqual(products[0].name, "Test Laptop");

  // Get Single Product
  const getRes = await lambda.catalogRouter({ httpMethod: "GET", pathParameters: { id: "1" } });
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(JSON.parse(getRes.body).name, "Test Laptop");

  // Update Product
  const updateRes = await lambda.catalogRouter({
    httpMethod: "PUT",
    headers: authHeader,
    pathParameters: { id: "1" },
    body: JSON.stringify({ price: 450, stock: 8 })
  });
  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(JSON.parse(updateRes.body).product.price, 450);
  console.log("✓ Product CRUD tests passed");

  // 3. Orders & Transactions
  console.log("3. Testing Orders Router & DynamoDB TransactWrite");
  const orderRes = await lambda.ordersRouter({
    httpMethod: "POST",
    body: JSON.stringify({
      customerName: "John Doe",
      items: [{ productId: 1, quantity: 2 }],
      paymentAmount: 900,
      paymentMethod: "Card"
    })
  });
  assert.strictEqual(orderRes.statusCode, 201);

  // Check product stock decremented from 8 to 6
  const productAfterOrder = await lambda.getProduct({ pathParameters: { id: "1" } });
  assert.strictEqual(JSON.parse(productAfterOrder.body).stock, 6);

  // List Orders
  const listOrdersRes = await lambda.ordersRouter({ httpMethod: "GET" });
  assert.strictEqual(listOrdersRes.statusCode, 200);
  const orders = JSON.parse(listOrdersRes.body);
  assert.strictEqual(orders.length, 1);
  assert.strictEqual(orders[0].customerName, "John Doe");
  console.log("✓ Orders & TransactWrite tests passed");

  // 4. Delete Product
  console.log("4. Testing Product Deletion");
  const deleteRes = await lambda.catalogRouter({
    httpMethod: "DELETE",
    headers: authHeader,
    pathParameters: { id: "1" }
  });
  assert.strictEqual(deleteRes.statusCode, 200);

  const getDeletedRes = await lambda.getProduct({ pathParameters: { id: "1" } });
  assert.strictEqual(getDeletedRes.statusCode, 404);
  console.log("✓ Product deletion test passed");

  console.log("\nALL LAMBDA & DYNAMODB TESTS PASSED SUCCESSFULLY!");
}

runLambdaTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
