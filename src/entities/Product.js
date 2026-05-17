import { supabase } from '../lib/supabase';
import { normalizeProductPricing } from '../lib/pricing';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const Product = {

  // Fetch active products (public storefront)
  async list(filters = {}) {
    let query = supabase
      .from('products')
      .select('*')
      .neq('status', 'archived');

    if (filters.creator_id) query = query.eq('creator_id', filters.creator_id);
    if (filters.type)       query = query.eq('type', filters.type);
    if (filters.status)     query = query.eq('status', filters.status);
    if (filters.is_limited !== undefined) query = query.eq('is_limited', filters.is_limited);
    if (filters.tag)        query = query.contains('tags', [filters.tag]);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Fetch all products including archived (creator dashboard / admin)
  async listAll(creatorId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get a single product by ID
  async get(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Product not found.');
    return data;
  },

  // Create a new product
  async create(productData) {
    const payload = normalizeProductPricing(productData);

    const { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Product could not be created.');
  },

  // Update a product
  async update(id, updates) {
    const payload = Object.prototype.hasOwnProperty.call(updates, 'creator_base_price') || Object.prototype.hasOwnProperty.call(updates, 'price')
      ? normalizeProductPricing(updates)
      : updates;

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Product not found.');
  },



  async bulkCreate(products = []) {
    const payload = products.map((product) => normalizeProductPricing(product));

    if (payload.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select();

    if (error) throw error;
    return data || [];
  },

  // Delete a product (prefer archiving instead)
  async delete(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Archive a product (soft delete — keeps order history intact)
  async archive(id) {
    return Product.update(id, { status: 'archived' });
  },

  // Decrement stock after a purchase — triggers auto sold_out if stock hits 0
  async decrementStock(id, quantity = 1) {
    const product = await Product.get(id);

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }

    const { data, error } = await supabase
      .from('products')
      .update({ stock: product.stock - quantity })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Product not found.');
  },

  // Restock a product
  async restock(id, quantity) {
    const product = await Product.get(id);

    const { data, error } = await supabase
      .from('products')
      .update({ stock: (product.stock || 0) + quantity })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Product not found.');
  },

  // Upload product image to Supabase Storage
  async uploadImage(file, creatorId) {
    const ext  = file.name.split('.').pop();
    const path = `${creatorId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Calculate the effective cashback amount for a purchase
  calculateCashback(price, cashbackPercent) {
    return Math.round(price * (cashbackPercent / 100));
  },

  // Calculate discount percentage between original and sale price
  calculateDiscount(originalPrice, salePrice) {
    if (!originalPrice || originalPrice <= salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  },
};
