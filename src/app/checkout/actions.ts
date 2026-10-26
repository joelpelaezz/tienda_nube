'use server';

import { db } from '@/lib/db';
import { orders, orderItems, customers, products, coupons, productVariants } from '@/drizzle/schema';
import { eq, inArray, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { getShippingQuotes, isValidPostalCode } from '@/lib/shipping';
import { getEffectivePriceCents } from '@/lib/products/pricing';
import { getCurrentSession } from '@/lib/auth';
import { getSettings } from '@/app/admin/configuracion/actions';
import { requireSellableUnitPrice, validateCouponRecord, type CouponValidationResult } from '@/lib/coupon-validation';

// C4-TRACE: order totals use sellable DB prices and coupons are revalidated under a transaction row lock.

export type CouponValidation = CouponValidationResult;

export async function validateCoupon(
  code: string,
  cartTotal: number  // total in cents
): Promise<CouponValidation> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return validateCouponRecord(undefined, code, cartTotal);

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizedCode))
    .limit(1);

  return validateCouponRecord(coupon, normalizedCode, cartTotal);
}

interface CartItemData {
  id: number;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  variantId?: number | null;  // NEW
}

export async function createOrder(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    postalCode?: string;
    shippingMethod?: string;
    notes?: string;
  },
  cartItems: CartItemData[],
  // Only the code travels from the browser. Discount type/value are always
  // re-read from the database so the client cannot inflate a discount.
  couponCodeInput?: string | null
) {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('Iniciá sesión para completar tu compra');
  }

  if (!cartItems || cartItems.length === 0) {
    throw new Error('El carrito está vacío');
  }
  if (cartItems.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    throw new Error('La cantidad de productos no es válida');
  }

  // C4-TRACE: checkout requirements configured by the admin are enforced server-side.
  const checkoutOptions = await getSettings();
  if (checkoutOptions.checkoutRequirePhone && !formData.phone?.trim()) {
    throw new Error('Ingresá tu teléfono de contacto');
  }
  if (checkoutOptions.checkoutNoteEnabled && checkoutOptions.checkoutNoteRequired && !formData.notes?.trim()) {
    throw new Error('Completá las notas del pedido');
  }

  const normalizedCartItems = Array.from(
    cartItems.reduce((items, item) => {
      const key = `${item.id}:${item.variantId ?? 'base'}`;
      const existing = items.get(key);
      if (existing) existing.quantity += item.quantity;
      else items.set(key, { ...item });
      return items;
    }, new Map<string, CartItemData>()).values()
  );

  // ── Security: recalculate total from DB prices (prevents client tampering) ──
  const productIds = normalizedCartItems.map((item) => item.id).filter(Boolean);
  const dbProducts = productIds.length > 0
      ? await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          priceOffer: products.priceOffer,
          isVisible: products.isVisible,
          stock: products.stock,
          reservedStock: products.reservedStock,
          productType: products.productType,
          hasVariants: sql<boolean>`exists (select 1 from product_variants pv where pv.product_id = ${products.id})`,
        })
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.isVisible, true)))
      : [];

  const variantIds = normalizedCartItems.flatMap((item) => item.variantId ? [item.variantId] : []);
  const dbVariants = variantIds.length
      ? await db.select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        price: productVariants.price,
        priceOffer: productVariants.priceOffer,
        stock: productVariants.stock,
        reservedStock: productVariants.reservedStock,
        isVisible: productVariants.isVisible,
      }).from(productVariants).where(and(inArray(productVariants.id, variantIds), eq(productVariants.isVisible, true)))
    : [];
  const variantMap = new Map(dbVariants.map((variant) => [variant.id, variant]));

  let subtotal = 0;
  const unitPrices = new Map<string, number>();
  for (const item of normalizedCartItems) {
    const product = item.id ? dbProducts.find((candidate) => candidate.id === item.id) : undefined;
    if (!product) throw new Error(`Producto no disponible: ${item.name}`);
    const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
    if (item.variantId && (!variant || variant.productId !== item.id)) {
      throw new Error(`Variante no disponible para "${item.name}"`);
    }
    const unitPrice = requireSellableUnitPrice(getEffectivePriceCents({
      regularPrice: product.price,
      offerPrice: product.priceOffer,
      variantRegularPrice: variant?.price,
      variantOfferPrice: variant?.priceOffer,
    }), product.name);
    unitPrices.set(`${item.id}:${item.variantId ?? 'base'}`, unitPrice);
    subtotal += unitPrice * item.quantity;
  }

  // ── Order number ──
  const orderNumber = `TS-${Date.now()}`;

  // ── Find or create customer ──
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

  return await db.transaction(async (tx) => {
    // Lock and re-read the coupon inside the order transaction. This makes the
    // active/date/limit/value checks and usage consumption one consistent decision.
    let discount = 0;
    let couponCode: string | null = null;
    if (couponCodeInput?.trim()) {
      const normalizedCode = couponCodeInput.trim().toUpperCase();
      const [lockedCoupon] = await tx
        .select()
        .from(coupons)
        .where(eq(coupons.code, normalizedCode))
        .for('update')
        .limit(1);
      const validation = validateCouponRecord(lockedCoupon, normalizedCode, subtotal);
      if (!validation.valid) throw new Error(validation.message || 'El código de descuento no es válido');

      couponCode = validation.code;
      discount = validation.type === 'percent'
        ? Math.round(subtotal * (validation.discountValue / 100))
        : Math.min(validation.discountValue, subtotal);
    }

    let shippingCost = 0;
    if (formData.postalCode || formData.shippingMethod) {
      if (!formData.postalCode || !formData.shippingMethod || !isValidPostalCode(formData.postalCode)) {
        throw new Error('Ingresá un código postal y seleccioná un medio de envío válido');
      }
      const quotes = await getShippingQuotes(formData.postalCode, subtotal - discount);
      const selectedQuote = quotes.find((quote) => quote.methodCode === formData.shippingMethod);
      if (!selectedQuote) throw new Error('El medio de envío seleccionado ya no está disponible');
      shippingCost = selectedQuote.cost;
    }

    const total = subtotal - discount + shippingCost;

    for (const item of normalizedCartItems) {
      const product = dbProducts.find((candidate) => candidate.id === item.id);
      if (!product || product.productType === 'digital') continue;

      if (item.variantId) {
        const variantId = item.variantId;
        const variant = variantMap.get(variantId);
        if (!variant || variant.productId !== item.id) {
          throw new Error(`Variante no disponible para "${item.name}"`);
        }

        const [updated] = await tx
          .update(productVariants)
          .set({ reservedStock: sql`${productVariants.reservedStock} + ${item.quantity}` })
          .where(and(
            eq(productVariants.id, variantId),
            eq(productVariants.productId, item.id),
            eq(productVariants.isVisible, true),
            sql`${productVariants.stock} - ${productVariants.reservedStock} >= ${item.quantity}`,
          ))
          .returning({ name: productVariants.name, stock: productVariants.stock, reservedStock: productVariants.reservedStock });

        if (!updated) {
          const available = Math.max(0, (variant.stock ?? 0) - (variant.reservedStock ?? 0));
          throw new Error(`Stock insuficiente para "${variant.name}": solicitadas ${item.quantity}, disponibles ${available}`);
        }
        continue;
      }

      if (product.hasVariants) {
        throw new Error(`Elegí una variante disponible para "${item.name}"`);
      }

      const [updatedProduct] = await tx
        .update(products)
        .set({ reservedStock: sql`${products.reservedStock} + ${item.quantity}` })
        .where(and(
          eq(products.id, item.id),
          eq(products.isVisible, true),
          sql`${products.stock} - ${products.reservedStock} >= ${item.quantity}`,
        ))
        .returning({ stock: products.stock, reservedStock: products.reservedStock });

      if (!updatedProduct) {
        const available = Math.max(0, (product.stock ?? 0) - (product.reservedStock ?? 0));
        throw new Error(`Stock insuficiente para "${product.name}" : solicitadas ${item.quantity}, disponibles ${available}`);
      }
    }
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerId: customerId || null,
        status: 'pending',
        total,
        discount,
        couponCode,
         notes: formData.notes || null,
         postalCode: formData.postalCode || null,
         shippingMethod: formData.shippingMethod || null,
         shippingCost,
      })
      .returning();

    if (couponCode) {
      // Increment only while the usage limit still allows it, so two
      // concurrent checkouts cannot consume one remaining use twice.
      const consumed = await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(and(
          eq(coupons.code, couponCode),
          sql`${coupons.maxUses} is null or coalesce(${coupons.usedCount}, 0) < ${coupons.maxUses}`
        ))
        .returning({ id: coupons.id });

      if (consumed.length === 0) {
        throw new Error('Este código ya no está disponible');
      }
    }

    await tx.insert(orderItems).values(normalizedCartItems.map((item) => ({
      orderId: order.id,
      productId: item.id || null,
      variantId: item.variantId ?? null,
      stockReserved: dbProducts.find((candidate) => candidate.id === item.id)?.productType !== 'digital',
      productName: item.name,
      quantity: item.quantity,
      unitPrice: unitPrices.get(`${item.id}:${item.variantId ?? 'base'}`)!,
    })));

    return { orderId: order.id, orderNumber, total, subtotal, discount, shippingCost };
  });
}
