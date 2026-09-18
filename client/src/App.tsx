import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { CatalogProvider } from './context/CatalogContext'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import SellerLayout from './components/layout/SellerLayout'
import ScrollToTop from './components/common/ScrollToTop'
import { RequireRole } from './components/auth/RequireRole'
import Home from './pages/Home'
import CategoriesPage from './pages/CategoriesPage'
import CategoryPage from './pages/CategoryPage'
import SpecialOffersPage from './pages/SpecialOffersPage'
import BestSellersPage from './pages/BestSellersPage'
import PostsPage from './pages/PostsPage'
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
import SellerPage from './pages/SellerPage'
import SellerAuthPage from './pages/SellerAuthPage'
import StoresPage from './pages/StoresPage'
import StorePage from './pages/StorePage'
import { getStoreSlugFromHost, mainSiteUrl, storeVisitUrl } from './utils/storeUrl'
import ChatWidget from './components/chatbot/ChatWidget'

// Full-navigation redirects (cross-origin) to the main site or a store subdomain.
function RedirectToMain() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.location.replace(mainSiteUrl(pathname + search))
  }, [pathname, search])
  return null
}

// Backwards-compatible /store/:slug -> its subdomain URL.
function LegacyStoreRedirect() {
  const { slug } = useParams()
  useEffect(() => {
    window.location.replace(storeVisitUrl(slug))
  }, [slug])
  return null
}

// Seller storefront served on its own subdomain (e.g. https://{slug}.{base}).
// Rendered standalone (no main-site layout/chrome) so the store subdomain URL
// shows ONLY the store's page and never the main-site home/layout.
function StoreSubdomainRoutes({ slug }: { slug: string }) {
  return (
    <Routes>
      <Route path="/" element={<StorePage slug={slug} />} />
      <Route path="*" element={<RedirectToMain />} />
    </Routes>
  )
}

function MainRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/special-offers" element={<SpecialOffersPage />} />
        <Route path="/deals" element={<Navigate to="/special-offers" replace />} />
        <Route path="/best-sellers" element={<BestSellersPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/store/:slug" element={<LegacyStoreRedirect />} />
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
            <RequireRole roles={['MARKETER']}>
              <MarketerPage />
            </RequireRole>
          }
        />
        <Route path="/seller/register" element={<SellerAuthPage mode="register" />} />
        <Route path="/seller/login" element={<SellerAuthPage mode="login" />} />
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
      </Route>
      <Route element={<SellerLayout />}>
        <Route
          path="/seller"
          element={
            <RequireRole roles={['SELLER']}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route index element={<SellerPage />} />
          <Route path="store" element={<SellerPage />} />
          <Route path="products" element={<SellerPage />} />
          <Route path="categories" element={<SellerPage />} />
          <Route path="orders" element={<SellerPage />} />
          <Route path="earnings" element={<SellerPage />} />
          <Route path="subscription" element={<SellerPage />} />
          <Route path="profile" element={<SellerPage />} />
        </Route>
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
  )
}

export default function App() {
  const storeSlug = getStoreSlugFromHost()
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ToastProvider>
          <CatalogProvider>
            <StoreProvider>
              <AuthProvider>
                <ScrollToTop />
                {storeSlug ? (
                  <StoreSubdomainRoutes slug={storeSlug} />
                ) : (
                  <MainRoutes />
                )}
                <ChatWidget />
              </AuthProvider>
            </StoreProvider>
          </CatalogProvider>
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}