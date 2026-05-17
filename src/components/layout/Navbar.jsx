import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ShoppingBag, User, Menu, LogIn, LogOut, Heart } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { Investor } from '@/entities/Investor'
import FanDirectLogo from '@/components/brand/FanDirectLogo'

export default function Navbar({ cartCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    isAdmin,
    isCreator,
    isFan,
    isInvestor: roleIsInvestor,
    logout,
    roles,
    activeRole,
    switchRole,
    getHomeRoute,
  } = useAuth()
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
    { path: '/wishlist', label: 'Wishlist' },
    { path: '/events', label: 'Events' },
    ...(isFan || !isAuthenticated ? [{ path: '/mine', label: 'Mine FDT' }] : []),
    ...(isCreator ? [{ path: '/creator-portal', label: 'Creator Portal' }] : []),
    ...((isInvestor || roleIsInvestor) ? [{ path: '/investors', label: 'My Stake' }] : []),
    ...(isAdmin ? [{ path: '/admin', label: 'Admin' }] : []),
  ]

  const isActive = (path) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname === path || location.pathname.startsWith(`${path}/`)

  function handleWorkspaceChange(nextRole) {
    if (switchRole?.(nextRole)) navigate(getHomeRoute?.(nextRole) || '/dashboard')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <FanDirectLogo className="h-9 w-9" />
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
            {isAuthenticated && roles?.length > 1 && (
              <select
                value={activeRole || ''}
                onChange={(event) => handleWorkspaceChange(event.target.value)}
                className="hidden rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold capitalize text-foreground outline-none md:block"
                aria-label="Switch workspace"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            )}

            <Link
              to="/wishlist"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              to="/cart"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Cart"
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
                  <Link to="/" onClick={() => setOpen(false)} className="mb-4 inline-flex items-center gap-2 px-1">
                    <FanDirectLogo className="h-9 w-9" />
                    <span className="font-heading font-bold text-xl text-foreground">
                      Fan<span className="text-primary">Direct</span>
                    </span>
                  </Link>

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

                  {isAuthenticated && roles?.length > 1 && (
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                      <select
                        value={activeRole || ''}
                        onChange={(event) => {
                          const nextRole = event.target.value
                          if (switchRole?.(nextRole)) {
                            navigate(getHomeRoute?.(nextRole) || '/dashboard')
                            setOpen(false)
                          }
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold capitalize outline-none"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>{role.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
