import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { RequireAuth } from './components/layout/RequireAuth'

// Pages publiques
import { HomePage }            from './pages/public/HomePage'
import { MapPage }             from './pages/public/MapPage'
import { ProductsPage }        from './pages/public/ProductsPage'
import { ProductDetailPage }   from './pages/public/ProductDetailPage'
import { ProducerProfilePage } from './pages/public/ProducerProfilePage'

// Auth
import { LoginPage }    from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

// Consommateur
import { CartPage }      from './pages/consumer/CartPage'
import { OrdersPage }    from './pages/consumer/OrdersPage'
import { CheckoutPage }  from './pages/consumer/CheckoutPage'
import { MessagesPage }  from './pages/consumer/MessagesPage'
import { AssistantPage } from './pages/consumer/AssistantPage'
import { OrderDetailPage } from './pages/orders/OrderDetailPage'

// Producteur
import { ProducerDashboardPage } from './pages/producer/DashboardPage'
import { CatalogPage }           from './pages/producer/CatalogPage'
import { OrdersManagePage }      from './pages/producer/OrdersManagePage'
import { ProducerProfilePage as ProducerProfileEditPage } from './pages/producer/ProfilePage'
import { AgendaPage }            from './pages/producer/AgendaPage'
import { NewsletterPage }        from './pages/producer/NewsletterPage'

// Administration
import { AdminPage } from './pages/admin/AdminPage'

// Compte & pages légales
import { AccountPage }     from './pages/account/AccountPage'
import { NotificationsPage } from './pages/account/NotificationsPage'
import { PrivacyPage }     from './pages/legal/PrivacyPage'
import { LegalNoticePage } from './pages/legal/LegalNoticePage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <CartProvider>
            <Routes>
              {/* Public */}
              <Route path="/"                 element={<HomePage />} />
              <Route path="/map"              element={<MapPage />} />
              <Route path="/products"         element={<ProductsPage />} />
              <Route path="/products/:id"     element={<ProductDetailPage />} />
              <Route path="/producers/:id"    element={<ProducerProfilePage />} />

              {/* Auth */}
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/privacy"  element={<PrivacyPage />} />
              <Route path="/legal"    element={<LegalNoticePage />} />
              <Route path="/account"  element={<RequireAuth><AccountPage /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
              <Route path="/messages"            element={<RequireAuth><MessagesPage /></RequireAuth>} />
              <Route path="/messages/:partnerId" element={<RequireAuth><MessagesPage /></RequireAuth>} />

              {/* Consommateur — le panier reste consultable sans compte */}
              <Route path="/cart"              element={<RequireAuth role="CONSUMER" allowAnonymous><CartPage /></RequireAuth>} />
              <Route path="/orders"            element={<RequireAuth role="CONSUMER"><OrdersPage /></RequireAuth>} />
              <Route path="/orders/:orderId"   element={<RequireAuth role="CONSUMER"><OrderDetailPage /></RequireAuth>} />
              <Route path="/checkout/:orderId" element={<RequireAuth role="CONSUMER"><CheckoutPage /></RequireAuth>} />
              <Route path="/assistant"         element={<RequireAuth role="CONSUMER"><AssistantPage /></RequireAuth>} />

              {/* Producteur */}
              <Route path="/producer/dashboard"       element={<RequireAuth role="PRODUCER"><ProducerDashboardPage /></RequireAuth>} />
              <Route path="/producer/catalog"         element={<RequireAuth role="PRODUCER"><CatalogPage /></RequireAuth>} />
              <Route path="/producer/orders"          element={<RequireAuth role="PRODUCER"><OrdersManagePage /></RequireAuth>} />
              <Route path="/producer/orders/:orderId" element={<RequireAuth role="PRODUCER"><OrderDetailPage /></RequireAuth>} />
              <Route path="/producer/profile"         element={<RequireAuth role="PRODUCER"><ProducerProfileEditPage /></RequireAuth>} />
              <Route path="/producer/agenda"          element={<RequireAuth role="PRODUCER"><AgendaPage /></RequireAuth>} />
              <Route path="/producer/newsletter"      element={<RequireAuth role="PRODUCER"><NewsletterPage /></RequireAuth>} />

              {/* Administration */}
              <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminPage /></RequireAuth>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
