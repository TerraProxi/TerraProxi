import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import type { ReactNode } from 'react'

// Pages publiques
import { HomePage }           from './pages/public/HomePage'
import { MapPage }            from './pages/public/MapPage'
import { ProductsPage }       from './pages/public/ProductsPage'
import { ProducerProfilePage } from './pages/public/ProducerProfilePage'

// Auth
import { LoginPage }    from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

// Consommateur
import { CartPage }      from './pages/consumer/CartPage'
import { OrdersPage }    from './pages/consumer/OrdersPage'
import { CheckoutPage }  from './pages/consumer/CheckoutPage'
import { MessagesPage }  from './pages/consumer/MessagesPage'

// Producteur
import { ProducerDashboardPage } from './pages/producer/DashboardPage'
import { CatalogPage }           from './pages/producer/CatalogPage'
import { OrdersManagePage }      from './pages/producer/OrdersManagePage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireProducer({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'PRODUCER') return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public */}
            <Route path="/"                 element={<HomePage />} />
            <Route path="/map"              element={<MapPage />} />
            <Route path="/products"         element={<ProductsPage />} />
            <Route path="/producers/:id"    element={<ProducerProfilePage />} />

            {/* Auth */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Consommateur */}
            <Route path="/cart"              element={<RequireAuth><CartPage /></RequireAuth>} />
            <Route path="/orders"            element={<RequireAuth><OrdersPage /></RequireAuth>} />
            <Route path="/checkout/:orderId" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
            <Route path="/messages"          element={<RequireAuth><MessagesPage /></RequireAuth>} />
            <Route path="/messages/:partnerId" element={<RequireAuth><MessagesPage /></RequireAuth>} />

            {/* Producteur */}
            <Route path="/producer/dashboard" element={<RequireProducer><ProducerDashboardPage /></RequireProducer>} />
            <Route path="/producer/catalog"   element={<RequireProducer><CatalogPage /></RequireProducer>} />
            <Route path="/producer/orders"    element={<RequireProducer><OrdersManagePage /></RequireProducer>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
