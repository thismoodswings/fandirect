import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ShoppingBag,
  Zap,
  MapPin,
  Calendar,
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";

import { addToCart } from "@/lib/cartUtils";
import { Product } from "@/entities";
import { fallbackProducts } from "@/lib/fallbackData";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return dateFormatter.format(date);
}

function findFallbackProduct(productId) {
  return fallbackProducts.find((item) => item.id === productId) || null;
}

function getProductType(product) {
  return product?.type || product?.category || "product";
}

export default function ProductDetail() {
  const { id: productId } = useParams();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      if (!productId) {
        setProduct(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      setNotice("");

      try {
        if (productId.startsWith("demo-")) {
          const demoProduct = findFallbackProduct(productId);

          if (!ignore) {
            setProduct(demoProduct);
            setNotice("Showing demo product.");
          }

          return;
        }

        const row = await Product.get(productId);

        if (!ignore) {
          setProduct(row);
          setNotice("Content synced.");
        }
      } catch (loadError) {
        console.warn("Product load failed:", loadError);

        const demoProduct = findFallbackProduct(productId);

        if (!ignore) {
          setProduct(demoProduct);
          setNotice(
            demoProduct
              ? "This product is not live yet. Showing a featured preview."
              : ""
          );
          setError(demoProduct ? "" : "Product not found.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      ignore = true;
    };
  }, [productId]);

  const totalPrice = useMemo(
    () => Number(product?.price || 0) * Number(quantity || 1),
    [product?.price, quantity]
  );

  const productType = getProductType(product);
  const isEvent = productType === "event";
  const stock = Number(product?.stock ?? product?.inventory_count ?? 0);
  const hasStock = stock > 0 || isEvent;

  function handleAddToCart() {
    if (!product) return;

    addToCart(product, quantity);
    setNotice(`${product.title || product.name || "Product"} added to cart.`);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground">
          Product not found
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          This product is not available yet.
        </p>

        <Link
          to="/shop"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/shop"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

      {(error || notice) && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/20 bg-primary/10 text-primary"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-card">
          <img
            src={
              product.image_url ||
              product.cover_url ||
              "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=900"
            }
            alt={product.title || product.name || "Product"}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
              {productType}
            </span>

            {product.is_limited && (
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white">
                Limited Edition
              </span>
            )}

            {product.status && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                {product.status}
              </span>
            )}
          </div>

          <p className="mb-1 text-sm text-muted-foreground">
            {product.creator_name || "FanDirect Creator"}
          </p>

          <h1 className="mb-4 font-heading text-3xl font-bold text-foreground">
            {product.title || product.name || "Untitled product"}
          </h1>

          <div className="mb-6 flex flex-wrap items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-foreground">
              {formatCurrency(product.price)}
            </span>

            {Number(product.original_price || 0) >
              Number(product.price || 0) && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(product.original_price)}
              </span>
            )}

            {Number(product.cashback_percent || 0) > 0 && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {product.cashback_percent}% cashback
              </span>
            )}
          </div>

          {product.description && (
            <p className="mb-6 leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {isEvent && (
            <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
              {product.event_date && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formatDate(product.event_date)}</span>
                </div>
              )}

              {product.event_location && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-secondary" />
                  <span>{product.event_location}</span>
                </div>
              )}
            </div>
          )}

          {Number(product.loyalty_points || 0) > 0 && (
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Earn {Number(product.loyalty_points).toLocaleString()} FanPoints
              with this purchase
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-border bg-background">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-l-xl hover:bg-muted"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="w-12 text-center font-semibold">
                {quantity}
              </span>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-r-xl hover:bg-muted"
                onClick={() => setQuantity((value) => value + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {!isEvent && (
              <span className="text-sm text-muted-foreground">
                {stock.toLocaleString()} in stock
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!hasStock}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-secondary text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            {hasStock
              ? `Add to Cart — ${formatCurrency(totalPrice)}`
              : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}