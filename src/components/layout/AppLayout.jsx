import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('fandirect_cart') || '[]')

    if (!Array.isArray(cart)) return 0

    return cart.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )
  } catch {
    return 0
  }
}

export default function AppLayout() {
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const updateCart = () => {
      setCartCount(getCartCount())
    }

    updateCart()

    window.addEventListener('storage', updateCart)
    window.addEventListener('cart-updated', updateCart)

    return () => {
      window.removeEventListener('storage', updateCart)
      window.removeEventListener('cart-updated', updateCart)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartCount={cartCount} />

      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}