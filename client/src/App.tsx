import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { CatalogProvider } from './context/CatalogContext'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import ScrollToTop from './components/common/ScrollToTop'
import { RequireRole } from './components/auth/RequireRole'
import Home from './pages/Home'
import CategoriesPage from './pages/CategoriesPage'
import CategoryPage from './pages/CategoryPage'
import SpecialOffersPage from './pages/SpecialOffersPage'
import BestSellersPage from './pages/BestSellersPage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import CartPage from './pages/CartPage'
import WishlistPage from './pages/WishlistPage'
import AccountPage from './pages/AccountPage'
import AuthPage from './pages/AuthPage'
import CheckoutPage from './pages/CheckoutPage'
import InfoPage from './pages/InfoPage'
import NotFoundPage from './pages/NotFoundPage'
import MarketerPage from './pages/MarketerPage'
import AdminPage from './pages/AdminPage'

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
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/register" element={<AuthPage mode="register" />} />
                  <Route path="/forgot" element={<AuthPage mode="forgot" />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route
                    path="/marketer"
                    element={
                      <RequireRole roles={['MARKETER', 'ADMIN']}>
                        <MarketerPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireRole roles={['ADMIN']}>
                        <AdminPage />
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
              </Routes>
            </AuthProvider>
          </StoreProvider>
        </CatalogProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}