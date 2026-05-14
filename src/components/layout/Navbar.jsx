import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Zap, ShoppingBag, User, Menu, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { Investor } from '@/entities/Investor'

export default function Navbar({ cartCount = 0 }) {
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, isCreator, isFan, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [isInvestor, setIsInvestor] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkInvestorProfile() {
      if (!user?.email) {
        setIsInvestor(false)
        return
      }

      try {
        const investor = await Investor.getByEmail(user.email)
        if (mounted) setIsInvestor(Boolean(investor))
      } catch {
        if (mounted) setIsInvestor(false)
      }
    }

    checkInvestorProfile()

    return () => {
      mounted = false
    }
  }, [user?.email])

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/creators', label: 'Creators' },
    { path: '/shop', label: 'Shop' },
    { path: '/events', label: 'Events' },
    ...(isFan || !isAuthenticated ? [{ path: '/mine', label: 'Mine FDT' }] : []),
    ...(isCreator ? [{ path: '/creator-portal', label: 'Creator Portal' }] : []),
    ...(isInvestor ? [{ path: '/investors', label: 'My Stake' }] : []),
    ...(isAdmin
      ? [
          { path: '/admin', label: 'Admin' },
        ]
      : []),
  ]

  const isActive = (path) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>

            <span className="font-heading font-bold text-xl text-foreground">
              Fan<span className="text-primary">Direct</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-muted-foreground" />

              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-white text-xs">
                  {cartCount}
                </Badge>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <Link to="/dashboard">
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => logout(true)}>
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="rounded-lg gap-2 text-sm font-semibold">
                  <LogIn className="w-4 h-4" /> Sign In
                </Button>
              </Link>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="bg-background border-border w-72"
              >
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}

                  <div className="border-t border-border my-2" />

                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Dashboard
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
