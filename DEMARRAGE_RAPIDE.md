# 🚀 DÉMARRAGE RAPIDE - KABRAK ERP

## 🎯 OBJECTIF: Avoir une caisse fonctionnelle avec vraie DB en 5 jours

---

## 📋 CHECKLIST JOUR PAR JOUR

### ✅ JOUR 1: Setup Base de données (2-3h)

#### 1. Créer compte Supabase
```bash
# Aller sur https://supabase.com
# Créer un compte gratuit
# Créer un nouveau projet "kabrak-erp"
# Région: Europe (plus proche)
# Mot de passe DB: [noter quelque part de sûr]
```

#### 2. Installer dépendances
```bash
cd C:\Users\GLC\kabraksupermarketERP\kabrak-erp

npm install @supabase/supabase-js
npm install prisma @prisma/client
npm install -D prisma
```

#### 3. Initialiser Prisma
```bash
npx prisma init
```

#### 4. Configurer .env
```env
# .env.local
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
```

**✅ Test:** `npx prisma db push` devrait fonctionner

---

### ✅ JOUR 2: Schéma Prisma (3-4h)

#### 1. Créer le schéma complet
```bash
# Copier le contenu ci-dessous dans prisma/schema.prisma
```

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========================================
// PRODUITS
// ========================================
model Product {
  id          String   @id @default(cuid())
  sku         String   @unique
  name        String
  category    String
  price       Int      // Prix en FCFA (centimes)
  costPrice   Int      // Prix d'achat
  stock       Int
  minStock    Int
  unit        String   // "bouteille", "sac", "kg"
  barcode     String   @unique
  expiryDate  DateTime?
  supplierId  String?
  supplier    Supplier? @relation(fields: [supplierId], references: [id])
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transactionItems TransactionItem[]
  stockMovements   StockMovement[]
  
  @@index([category])
  @@index([barcode])
  @@index([sku])
}

// ========================================
// FOURNISSEURS
// ========================================
model Supplier {
  id            String   @id @default(cuid())
  name          String
  contact       String
  phone         String
  email         String
  address       String
  paymentTerms  String   // "30 jours", "Comptant"
  rating        Float    @default(0)
  totalOrders   Int      @default(0)
  pendingOrders Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  products       Product[]
  purchaseOrders PurchaseOrder[]
}

// ========================================
// EMPLOYÉS
// ========================================
model Employee {
  id            String   @id @default(cuid())
  firstName     String
  lastName      String
  role          String   // "manager", "cashier", "stockist", "supervisor"
  department    String
  phone         String
  email         String
  hireDate      DateTime
  status        String   // "active", "on_leave", "inactive"
  hoursThisWeek Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  transactions Transaction[]
  shifts       Shift[]
  
  @@index([role])
  @@index([status])
}

// ========================================
// TRANSACTIONS (VENTES)
// ========================================
model Transaction {
  id            String   @id @default(cuid())
  date          DateTime @default(now())
  cashierId     String
  cashier       Employee @relation(fields: [cashierId], references: [id])
  registerId    String?
  register      CashRegister? @relation(fields: [registerId], references: [id])
  subtotal      Int
  discount      Int
  tax           Int
  total         Int
  paymentMethod String   // "cash", "card", "mobile"
  status        String   // "completed", "refunded", "pending"
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  createdAt     DateTime @default(now())
  
  items TransactionItem[]
  
  @@index([date])
  @@index([cashierId])
  @@index([status])
}

model TransactionItem {
  id            String   @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  quantity      Int
  unitPrice     Int
  discount      Int      @default(0)
  total         Int
  
  @@index([transactionId])
  @@index([productId])
}

// ========================================
// CAISSES
// ========================================
model CashRegister {
  id          String   @id @default(cuid())
  name        String   // "Caisse 1", "Caisse 2"
  status      String   // "open", "closed"
  openingCash Int      @default(0)
  currentCash Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transactions Transaction[]
  shifts       Shift[]
}

model Shift {
  id            String   @id @default(cuid())
  registerId    String
  register      CashRegister @relation(fields: [registerId], references: [id])
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  openedAt      DateTime @default(now())
  closedAt      DateTime?
  openingCash   Int
  closingCash   Int?
  expectedCash  Int?
  difference    Int?     // Écart de caisse
  status        String   // "open", "closed"
  
  @@index([registerId])
  @@index([employeeId])
  @@index([openedAt])
}

// ========================================
// MOUVEMENTS DE STOCK
// ========================================
model StockMovement {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  type        String   // "in", "out", "adjustment", "loss"
  quantity    Int
  reason      String?  // "sale", "purchase", "expiry", "damage", "theft"
  reference   String?  // Référence transaction/commande
  createdBy   String?
  createdAt   DateTime @default(now())
  
  @@index([productId])
  @@index([type])
  @@index([createdAt])
}

// ========================================
// COMMANDES FOURNISSEURS
// ========================================
model PurchaseOrder {
  id           String   @id @default(cuid())
  orderNumber  String   @unique
  supplierId   String
  supplier     Supplier @relation(fields: [supplierId], references: [id])
  date         DateTime @default(now())
  expectedDate DateTime
  total        Int
  status       String   // "draft", "sent", "received", "cancelled"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  items PurchaseOrderItem[]
  
  @@index([supplierId])
  @@index([status])
  @@index([date])
}

model PurchaseOrderItem {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  productId       String
  quantity        Int
  unitCost        Int
  total           Int
  
  @@index([purchaseOrderId])
}

// ========================================
// CLIENTS & FIDÉLITÉ
// ========================================
model Customer {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  phone       String   @unique
  email       String?
  points      Int      @default(0)
  totalSpent  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transactions Transaction[]
  loyaltyHistory LoyaltyHistory[]
  
  @@index([phone])
}

model LoyaltyHistory {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  points      Int      // Positif = gagné, négatif = dépensé
  reason      String   // "purchase", "reward_redeemed"
  reference   String?  // ID transaction
  createdAt   DateTime @default(now())
  
  @@index([customerId])
  @@index([createdAt])
}
```

#### 2. Pousser le schéma
```bash
npx prisma db push
npx prisma generate
```

#### 3. Créer seed data
```bash
# Créer prisma/seed.ts (voir ci-dessous)
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Créer fournisseurs
  const sabc = await prisma.supplier.create({
    data: {
      name: 'SABC',
      contact: 'Direction Commerciale',
      phone: '+237 2 22 23 30 00',
      email: 'commercial@sabc.cm',
      address: 'Route de Bonabéri, Douala',
      paymentTerms: '30 jours',
      rating: 4.8,
      totalOrders: 124,
      pendingOrders: 2,
    },
  });

  // Créer employés
  const amina = await prisma.employee.create({
    data: {
      firstName: 'Amina',
      lastName: 'Bello',
      role: 'manager',
      department: 'Direction',
      phone: '+237 6 91 23 45 67',
      email: 'a.bello@kabrak.cm',
      hireDate: new Date('2021-03-15'),
      status: 'active',
      hoursThisWeek: 42,
    },
  });

  // Créer produits
  await prisma.product.createMany({
    data: [
      {
        sku: 'HV-5L-001',
        name: 'Huile Végétale 5L',
        category: 'Épicerie',
        price: 5500,
        costPrice: 4100,
        stock: 4,
        minStock: 20,
        unit: 'bouteille',
        barcode: '0620012345678',
        supplierId: sabc.id,
      },
      {
        sku: 'EM-1.5-003',
        name: 'Eau Minérale Source 1.5L',
        category: 'Boissons',
        price: 400,
        costPrice: 250,
        stock: 18,
        minStock: 50,
        unit: 'bouteille',
        barcode: '0610098765432',
        supplierId: sabc.id,
      },
      // ... ajouter 20-30 produits
    ],
  });

  console.log('✅ Seed data créée!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### 4. Exécuter seed
```bash
npx tsx prisma/seed.ts
```

**✅ Test:** Aller sur Supabase → Table Editor → Voir les données

---

### ✅ JOUR 3: API Products (3-4h)

#### 1. Créer lib/prisma.ts
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 2. Créer API Products
```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  const products = await prisma.product.findMany({
    where: {
      ...(category && category !== 'Tous' ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      supplier: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const data = await request.json();
  
  const product = await prisma.product.create({
    data: {
      ...data,
      price: parseInt(data.price),
      costPrice: parseInt(data.costPrice),
      stock: parseInt(data.stock),
      minStock: parseInt(data.minStock),
    },
  });

  return NextResponse.json(product);
}
```

```typescript
// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const data = await request.json();
  
  const product = await prisma.product.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(product);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.product.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
```

**✅ Test:** `http://localhost:3000/api/products` dans le navigateur

---

### ✅ JOUR 4: API Transactions (3-4h)

```typescript
// app/api/pos/transactions/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const data = await request.json();

  // Créer transaction avec items
  const transaction = await prisma.transaction.create({
    data: {
      cashierId: data.cashierId, // À récupérer de la session
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.paymentMethod,
      status: 'completed',
      items: {
        create: data.items.map((item: any) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          discount: item.discount,
          total: item.product.price * item.quantity - item.discount,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      cashier: true,
    },
  });

  // Mettre à jour les stocks
  for (const item of data.items) {
    await prisma.product.update({
      where: { id: item.product.id },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });

    // Créer mouvement de stock
    await prisma.stockMovement.create({
      data: {
        productId: item.product.id,
        type: 'out',
        quantity: -item.quantity,
        reason: 'sale',
        reference: transaction.id,
      },
    });
  }

  return NextResponse.json(transaction);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  const transactions = await prisma.transaction.findMany({
    take: limit,
    orderBy: {
      date: 'desc',
    },
    include: {
      cashier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return NextResponse.json(transactions);
}
```

**✅ Test:** Faire une vente dans le POS

---

### ✅ JOUR 5: Connecter le Frontend (3-4h)

#### 1. Modifier app/stocks/page.tsx
```typescript
// Remplacer:
const [products, setProducts] = useState<Product[]>(initialProducts);

// Par:
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProducts();
}, []);

async function fetchProducts() {
  setLoading(true);
  const res = await fetch('/api/products');
  const data = await res.json();
  setProducts(data);
  setLoading(false);
}

// Dans handleNewProduct:
const handleNewProduct = async (data: Omit<Product, "id">) => {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const newProduct = await res.json();
  setProducts((prev) => [newProduct, ...prev]);
  toast('Produit ajouté!', 'success');
};
```

#### 2. Modifier app/pos/page.tsx
```typescript
// Dans handleConfirmPayment:
const handleConfirmPayment = async () => {
  const transactionData = {
    cashierId: 'e1', // TODO: Récupérer de la session
    items: cart,
    subtotal,
    discount: discountAmount,
    tax,
    total,
    paymentMethod,
  };

  const res = await fetch('/api/pos/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transactionData),
  });

  const transaction = await res.json();
  
  setReceipt({
    id: transaction.id,
    items: [...cart],
    subtotal,
    discount: discountAmount,
    tax,
    total,
    method: paymentMethod,
    cashGiven: paymentMethod === 'cash' ? cashGivenNum : undefined,
    change: paymentMethod === 'cash' ? change : undefined,
  });
  
  setCheckoutStep('receipt');
  
  // Recharger les produits pour mettre à jour les stocks
  const productsRes = await fetch('/api/products');
  const updatedProducts = await productsRes.json();
  // Mettre à jour l'état...
};
```

**✅ Test:** 
1. Ajouter un produit dans Stocks
2. Faire une vente dans POS
3. Vérifier que le stock a diminué
4. Vérifier dans Supabase que la transaction est enregistrée

---

## 🎉 RÉSULTAT JOUR 5

**Vous avez maintenant:**
- ✅ Base de données PostgreSQL fonctionnelle
- ✅ Schéma Prisma complet
- ✅ API Products (CRUD)
- ✅ API Transactions (ventes)
- ✅ Frontend connecté à la vraie DB
- ✅ Stocks qui se mettent à jour automatiquement
- ✅ Historique des ventes persistant

**= Caisse fonctionnelle en production!** 🚀

---

## 📝 PROCHAINES ÉTAPES (Semaine 2)

1. **Authentification** (2 jours)
   - NextAuth.js
   - Login/Logout
   - Protection routes

2. **API Suppliers & Employees** (1 jour)
   - CRUD fournisseurs
   - CRUD employés

3. **Dashboard temps réel** (1 jour)
   - Récupérer vraies données
   - KPIs dynamiques

4. **API Reports** (1 jour)
   - Ventes par jour/semaine/mois
   - Top produits
   - Marges

---

## 🆘 DÉPANNAGE

### Erreur: "Can't reach database server"
```bash
# Vérifier que l'URL de connexion est correcte
# Vérifier que le projet Supabase est actif
# Tester la connexion:
npx prisma db pull
```

### Erreur: "Module not found: @prisma/client"
```bash
npm install @prisma/client
npx prisma generate
```

### Les données ne s'affichent pas
```bash
# Vérifier dans la console du navigateur
# Vérifier l'URL de l'API
# Vérifier les logs serveur: npm run dev
```

### Erreur CORS
```typescript
// Ajouter dans next.config.ts:
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ];
}
```

---

## 💡 ASTUCES

### 1. Prisma Studio (GUI pour la DB)
```bash
npx prisma studio
# Ouvre http://localhost:5555
# Interface visuelle pour voir/éditer les données
```

### 2. Reset DB si besoin
```bash
npx prisma migrate reset
npx tsx prisma/seed.ts
```

### 3. Logs SQL
```typescript
// Dans lib/prisma.ts, activer les logs:
log: ['query', 'info', 'warn', 'error'],
```

### 4. Type-safety
```typescript
// Importer les types Prisma:
import type { Product, Transaction } from '@prisma/client';
```

---

## ✅ CHECKLIST FINALE

Avant de passer à la semaine 2:

- [ ] Supabase projet créé et actif
- [ ] Prisma configuré et schéma poussé
- [ ] Seed data créée (20+ produits)
- [ ] API Products fonctionne (GET, POST)
- [ ] API Transactions fonctionne (POST)
- [ ] POS connecté à la DB
- [ ] Vente test réussie
- [ ] Stock mis à jour après vente
- [ ] Transaction visible dans Supabase
- [ ] Code committé sur Git

---

**Félicitations! Vous avez maintenant une base solide pour construire le reste de l'ERP! 🎉**

**Questions? Besoin d'aide? N'hésite pas à demander!**
