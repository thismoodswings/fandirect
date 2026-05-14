import { supabase } from '../lib/supabase';
import { FanPoints } from './FanPoints';
import { FanToken } from './FanToken';

// Reward rates per order
const POINTS_PER_NAIRA  = 0.1;   // 1 point per ₦10 spent
const CASHBACK_RATE     = 0.02;  // 2% cashback on every order

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const Order = {

  // Fetch all orders (with optional filters)
  async list(filters = {}) {
    let query = supabase.from('orders').select('*');

    if (filters.buyer_email)       query = query.eq('buyer_email', filters.buyer_email);
    if (filters.payment_status)    query = query.eq('payment_status', filters.payment_status);
    if (filters.fulfillment_status) query = query.eq('fulfillment_status', filters.fulfillment_status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get a single order by ID
  async get(id) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Order not found.');
    return data;
  },

  // Get an order by order number (e.g. FD-20240501-0001)
  async getByOrderNumber(orderNumber) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Order not found.');
    return data;
  },

  // Get an order by payment reference (for Paystack/Flutterwave webhook verification)
  async getByPaymentReference(reference) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_reference', reference)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Create a new order (called before redirecting to payment gateway)
  async create(orderData) {
    const pointsEarned   = Math.floor((orderData.total_amount || 0) * POINTS_PER_NAIRA);
    const cashbackEarned = Math.round((orderData.total_amount || 0) * CASHBACK_RATE);

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        ...orderData,
        order_number:       orderData.order_number || '',  // trigger fills if empty
        payment_status:     'pending',
        fulfillment_status: 'pending',
        points_earned:      pointsEarned,
        cashback_earned:    cashbackEarned,
      }])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Order could not be created.');
  },

  // Confirm payment — called from Paystack/Flutterwave webhook or callback
  // Also credits FanPoints and FanToken cashback to the buyer
  async confirmPayment(paymentReference) {
    const order = await Order.getByPaymentReference(paymentReference);
    if (!order) throw new Error(`Order not found for reference: ${paymentReference}`);
    if (order.payment_status === 'paid') return order; // already processed, skip

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status:     'paid',
        fulfillment_status: 'processing',
      })
      .eq('id', order.id)
      .select();
    if (error) throw error;

    // Credit loyalty rewards after successful payment
    await Promise.all([
      FanPoints.recordPurchase(order.buyer_email, order.total_amount, order.points_earned),
      FanPoints.addCashback(order.buyer_email, order.cashback_earned),
    ]);

    return firstSelectedRow(data, 'Order not found.');
  },

  // Update fulfillment status (admin / logistics)
  async updateFulfillment(id, fulfillmentStatus) {
    const { data, error } = await supabase
      .from('orders')
      .update({ fulfillment_status: fulfillmentStatus })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Order not found.');
  },

  // Mark an order as refunded
  async refund(id) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status:     'refunded',
        fulfillment_status: 'cancelled',
      })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Order not found.');
  },

  // Update any field (admin override)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Order not found.');
  },

  // Delete an order (admin only — use with caution)
  async delete(id) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  POINTS_PER_NAIRA,
  CASHBACK_RATE,
};
