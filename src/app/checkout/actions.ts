'use server';

import { db } from '@/lib/db';
import { orders, orderItems, customers } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

interface CartItemData {
  id: number;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

export async function createOrder(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    notes?: string;
  },
  cartItems: CartItemData[]
) {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Generate order number
  const orderNumber = `TS-${Date.now()}`;

  // Create or find customer
  let customerId: number | undefined;
  if (formData.email) {
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, formData.email))
      .limit(1);

    if (existing[0]) {
      customerId = existing[0].id;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
        })
        .returning({ id: customers.id });
      customerId = newCustomer?.id;
    }
  }

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      customerId: customerId || null,
      status: 'pending',
      total,
      notes: formData.notes || null,
    })
    .returning();

  // Create order items
  for (const item of cartItems) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.id || null,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    });
  }

  return { orderId: order.id, orderNumber };
}
