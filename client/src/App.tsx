import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { CatalogProvider } from './context/CatalogContext'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import ScrollToTop from './components/common/ScrollToTop'
import { RequireRole } from './components/auth/RequireRole'
import Home from './pages/Home'
import CategoriesPage from './pages/CategoriesPage'
import CategoryPage from './pages/CategoryPage'
import SpecialOffersPage from './pages/SpecialOffersPage'
import BestSellersPage from './pages/BestSellersPage'
import PostsPage from './pages/PostsPage'
import SinglePostPage from './pages/SinglePostPage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import CartPage from './pages/CartPage'
import WishlistPage from './pages/WishlistPage'
import DashboardRedirect from './pages/client/DashboardRedirect'
import ClientDashboardLayout from './components/client/ClientDashboardLayout'
import ClientProfilePage from './pages/client/ClientProfilePage'
import ClientOrdersPage from './pages/client/ClientOrdersPage'
import ClientOrderDetailsPage from './pages/client/ClientOrderDetailsPage'
import AuthPage from './pages/AuthPage'
import CheckoutPage from './pages/CheckoutPage'
import InfoPage from './pages/InfoPage'
import NotFoundPage from './pages/NotFoundPage'
import MarketerPage from './pages/MarketerPage'
import MarketerAuthPage from './pages/MarketerAuthPage'
import AdminPage from './pages/AdminPage'
import AdminMarketerDetailsPage from './pages/admin/AdminMarketerDetailsPage'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <CatalogProvider>
          <StoreProvider>
            <AuthProvider>
              <ScrollToTop />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/special-offers" element={<SpecialOffersPage />} />
                  <Route path="/deals" element={<Navigate to="/special-offers" replace />} />
                  <Route path="/best-sellers" element={<BestSellersPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/posts/:id" element={<SinglePostPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireRole roles={['USER', 'MARKETER']}>
                        <DashboardRedirect />
                      </RequireRole>
                    }
                  />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/register" element={<AuthPage mode="register" />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/marketer/signup" element={<MarketerAuthPage mode="signup" />} />
                  <Route path="/marketer/login" element={<MarketerAuthPage mode="login" />} />
                  <Route
                    path="/marketer"
                    element={
                      <RequireRole roles={['MARKETER', 'ADMIN']}>
                        <MarketerPage />
                      </RequireRole>
                    }
                  />
                  <Route path="/about" element={<InfoPage kind="about" />} />
                  <Route path="/contact" element={<InfoPage kind="contact" />} />
                  <Route path="/help" element={<InfoPage kind="help" />} />
                  <Route path="/privacy" element={<InfoPage kind="privacy" />} />
                  <Route path="/terms" element={<InfoPage kind="terms" />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route element={<AdminLayout />}>
                  <Route
                    path="/admin"
                    element={
                      <RequireRole roles={['ADMIN']}>
                        <AdminPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/marketers/:id"
                    element={
                      <RequireRole roles={['ADMIN']}>
                        <AdminMarketerDetailsPage />
                      </RequireRole>
                    }
                  />
                </Route>
                <Route element={<ClientDashboardLayout />}>
                  <Route
                    path="/dashboard/profile"
                    element={
                      <RequireRole roles={['USER']}>
                        <ClientProfilePage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/dashboard/orders"
                    element={
                      <RequireRole roles={['USER']}>
                        <ClientOrdersPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/dashboard/orders/:id"
                    element={
                      <RequireRole roles={['USER']}>
                        <ClientOrderDetailsPage />
                      </RequireRole>
                    }
                  />
                </Route>
              </Routes>
            </AuthProvider>
          </StoreProvider>
        </CatalogProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}