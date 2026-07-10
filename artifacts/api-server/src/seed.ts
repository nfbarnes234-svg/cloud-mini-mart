import bcrypt from "bcryptjs";
import {
  db,
  pool,
  usersTable,
  categoriesTable,
  productsTable,
  customersTable,
} from "@workspace/db";

async function main() {
  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    console.log("Seed skipped: users already exist.");
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const ownerPasswordHash = await bcrypt.hash("Space@789", 10);

  await db.insert(usersTable).values([
    {
      name: "Ama Owusu",
      email: "torks.hyll@gmail.com",
      passwordHash: ownerPasswordHash,
      role: "owner",
    },
    {
      name: "Kwame Asante",
      email: "manager@minimart.gh",
      passwordHash,
      role: "manager",
    },
    {
      name: "Efua Mensah",
      email: "cashier@minimart.gh",
      passwordHash,
      role: "cashier",
    },
  ]);

  const [beverages, snacks, householdCategory, toiletries] = await db
    .insert(categoriesTable)
    .values([
      { name: "Beverages" },
      { name: "Snacks" },
      { name: "Household" },
      { name: "Toiletries" },
    ])
    .returning();

  await db.insert(productsTable).values([
    {
      name: "Coca-Cola 500ml",
      sku: "BEV-001",
      barcode: "6001234500017",
      categoryId: beverages.id,
      purchasePrice: "3.50",
      sellingPrice: "5.50",
      stock: 120,
      minStock: 20,
      unit: "bottle",
    },
    {
      name: "Malta Guinness 330ml",
      sku: "BEV-002",
      barcode: "6001234500024",
      categoryId: beverages.id,
      purchasePrice: "5.00",
      sellingPrice: "8.00",
      stock: 80,
      minStock: 15,
      unit: "bottle",
    },
    {
      name: "Voltic Water 750ml",
      sku: "BEV-003",
      barcode: "6001234500031",
      categoryId: beverages.id,
      purchasePrice: "2.00",
      sellingPrice: "3.50",
      stock: 200,
      minStock: 30,
      unit: "bottle",
    },
    {
      name: "Golden Morn 500g",
      sku: "SNK-001",
      barcode: "6001234500048",
      categoryId: snacks.id,
      purchasePrice: "18.00",
      sellingPrice: "24.00",
      stock: 40,
      minStock: 10,
      unit: "pack",
    },
    {
      name: "Digestive Biscuits",
      sku: "SNK-002",
      barcode: "6001234500055",
      categoryId: snacks.id,
      purchasePrice: "6.00",
      sellingPrice: "9.50",
      stock: 60,
      minStock: 15,
      unit: "pack",
    },
    {
      name: "Groundnuts 200g",
      sku: "SNK-003",
      barcode: "6001234500062",
      categoryId: snacks.id,
      purchasePrice: "4.00",
      sellingPrice: "7.00",
      stock: 5,
      minStock: 10,
      unit: "pack",
    },
    {
      name: "Kokonte Bag 5kg",
      sku: "HH-001",
      barcode: "6001234500079",
      categoryId: householdCategory.id,
      purchasePrice: "35.00",
      sellingPrice: "45.00",
      stock: 25,
      minStock: 5,
      unit: "bag",
    },
    {
      name: "Candles Pack of 6",
      sku: "HH-002",
      barcode: "6001234500086",
      categoryId: householdCategory.id,
      purchasePrice: "8.00",
      sellingPrice: "13.00",
      stock: 0,
      minStock: 10,
      unit: "pack",
    },
    {
      name: "Key Soap Bar",
      sku: "TOI-001",
      barcode: "6001234500093",
      categoryId: toiletries.id,
      purchasePrice: "3.00",
      sellingPrice: "5.00",
      stock: 90,
      minStock: 20,
      unit: "bar",
    },
    {
      name: "Colgate Toothpaste 100ml",
      sku: "TOI-002",
      barcode: "6001234500109",
      categoryId: toiletries.id,
      purchasePrice: "7.00",
      sellingPrice: "11.00",
      stock: 55,
      minStock: 15,
      unit: "tube",
    },
  ]);

  await db.insert(customersTable).values([
    {
      name: "Yaw Boateng",
      phone: "0244123456",
      email: "yaw.boateng@example.com",
      address: "Osu, Accra",
      loyaltyPoints: 120,
      outstandingBalance: "0",
    },
    {
      name: "Abena Frimpong",
      phone: "0201987654",
      email: "abena.frimpong@example.com",
      address: "Adenta, Accra",
      loyaltyPoints: 45,
      outstandingBalance: "25.00",
    },
    {
      name: "Kojo Antwi",
      phone: "0277555222",
      address: "Kumasi",
      loyaltyPoints: 10,
      outstandingBalance: "0",
    },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
