import { useEffect, useState } from "react";
import Client from "shopify-buy";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

let client: any = null;

function formatPrice(amount: string | number) {
  const n = parseFloat(String(amount || 0));
  return `$${n.toFixed(2)}`;
}

interface ShopifyVariant {
  id: string;
  price: { amount: string };
  title: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  images: string[];
  variants: ShopifyVariant[];
}

function AppContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    async function initializeAndLoad() {
      setLoading(true);
      try {
        // Fetch Shopify config from server
        const configRes = await fetch('/api/config/shopify');
        const config = await configRes.json();
        
        if (!config.domain || !config.storefrontAccessToken) {
          setConfigError(true);
          setLoading(false);
          return;
        }

        // Initialize Shopify client
        client = Client.buildClient({
          domain: config.domain.replace("https://", ""),
          storefrontAccessToken: config.storefrontAccessToken,
          apiVersion: '2024-01',
        });

        // Load products
        const prods = await client.product.fetchAll();
        const mapped = prods.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          handle: p.handle,
          images: p.images.map((i: any) => i.src),
          variants: p.variants.map((v: any) => ({ 
            id: v.id, 
            price: v.price, 
            title: v.title 
          })),
        }));
        setProducts(mapped);
        setFeatured(mapped.slice(0, 3));
      } catch (e) {
        console.error("Shopify fetch error", e);
        setConfigError(true);
      }
      setLoading(false);
    }
    initializeAndLoad();
  }, []);

  async function startCheckout(variantId: string, qty = 1) {
    if (!client) {
      alert("Shopify client not initialized");
      return;
    }
    try {
      const checkout = await client.checkout.create();
      const lineItemsToAdd = [{ variantId, quantity: qty }];
      const updated = await client.checkout.addLineItems(checkout.id, lineItemsToAdd);
      window.location.href = updated.webUrl;
    } catch (e) {
      console.error(e);
      alert("Could not start checkout. Check console for details.");
    }
  }

  if (configError) {
    return (
      <div style={{...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'}}>
        <div style={{textAlign: 'center', maxWidth: 600, padding: 20}}>
          <h1 style={{fontSize: 24, marginBottom: 16}}>Configuration Error</h1>
          <p>Unable to load Shopify configuration. Please check that your SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variables are set correctly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img 
            src="/logo-full.png" 
            alt="CRUSH Clothing" 
            style={styles.logo} 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div style={styles.brandText}>
            <div style={styles.brandTitle}>CRUSH Clothing</div>
            <div style={styles.brandSub}>Streetwear • EST. 2025</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <a style={styles.iconLink} href="#shop" data-testid="link-shop">Shop</a>
          <a style={styles.iconLink} href="#about" data-testid="link-about">About</a>
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <h1 style={styles.heroTitle} data-testid="text-hero-title">CRUSH the Ordinary</h1>
            <p style={styles.heroSub}>Limited drops. Bold designs. Streetwear for teens who make noise.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <a href="#shop" style={styles.ctaPrimary} data-testid="button-shop-now">Shop Now</a>
              <a href="#about" style={styles.ctaOutline} data-testid="button-our-story">Our Story</a>
            </div>
          </div>
          <div style={styles.heroRight}>
            <img 
              src="/hero-hoodie.png" 
              alt="Hero hoodie" 
              style={styles.heroImage} 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Featured Drops</h2>
        <div style={styles.featuredGrid}>
          {loading ? (
            <div data-testid="loading-featured">Loading...</div>
          ) : (
            featured.map(p => (
              <div key={p.id} style={styles.featureCard} data-testid={`card-featured-${p.id}`}>
                <div style={styles.featureImgWrap}>
                  <img 
                    src={p.images[0] || "/placeholder.png"} 
                    alt={p.title} 
                    style={styles.featureImg}
                    data-testid={`img-featured-${p.id}`}
                  />
                </div>
                <div style={{ padding: 12 }}>
                  <div style={styles.productTitle} data-testid={`text-title-${p.id}`}>{p.title}</div>
                  <div style={styles.productPrice} data-testid={`text-price-${p.id}`}>
                    {formatPrice(p.variants[0]?.price.amount)}
                  </div>
                  <button 
                    style={styles.addBtn} 
                    onClick={() => startCheckout(p.variants[0].id)}
                    data-testid={`button-buy-${p.id}`}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="shop" style={styles.section}>
        <h2 style={styles.sectionTitle}>Shop</h2>
        <div style={styles.grid}>
          {loading && <div data-testid="loading-products">Loading...</div>}
          {!loading && products.length === 0 && (
            <div data-testid="no-products">No products found — check your Shopify settings.</div>
          )}
          {products.map((p) => (
            <div key={p.id} style={styles.card} data-testid={`card-product-${p.id}`}>
              <div style={styles.thumb}>
                <img 
                  src={p.images[0] || "/placeholder.png"} 
                  alt={p.title} 
                  style={styles.thumbImg}
                  data-testid={`img-product-${p.id}`}
                />
              </div>
              <div style={styles.cardBody}>
                <div style={styles.productTitle} data-testid={`text-product-title-${p.id}`}>
                  {p.title}
                </div>
                <div style={styles.productPrice} data-testid={`text-product-price-${p.id}`}>
                  {formatPrice(p.variants[0]?.price.amount)}
                </div>
                <button 
                  style={styles.addBtn} 
                  onClick={() => startCheckout(p.variants[0].id)}
                  data-testid={`button-add-cart-${p.id}`}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" style={{ ...styles.section, background: '#fff' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={styles.sectionTitle}>About CRUSH</h2>
          <p style={{ color: '#333' }}>
            CRUSH Clothing started as a small idea: make bold, high-energy streetwear for teens who want to stand out. 
            We focus on strong graphics, clean cuts, and limited drops to keep every piece special.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={styles.aboutStat}>
              <strong>Limited Drops</strong>
              <div>Exclusive runs — every piece feels special.</div>
            </div>
            <div style={styles.aboutStat}>
              <strong>Bold Design</strong>
              <div>Clean cuts, heavy graphics, and energy.</div>
            </div>
            <div style={styles.aboutStat}>
              <strong>For Teens</strong>
              <div>Designed with the streets in mind.</div>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>CRUSH Clothing</div>
              <div style={{ color: '#bbb' }}>Streetwear • EST. 2025</div>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); alert('Thanks! (demo)') }} 
              style={{ display: 'flex', gap: 8 }}
            >
              <input 
                type="email" 
                placeholder="Your email" 
                required 
                style={styles.input}
                data-testid="input-newsletter"
              />
              <button style={styles.ctaPrimary} data-testid="button-newsletter">Join</button>
            </form>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <a href="https://instagram.com/" target="_blank" rel="noreferrer" style={styles.social}>Instagram</a>
            <a href="https://tiktok.com/" target="_blank" rel="noreferrer" style={styles.social}>TikTok</a>
            <a href="https://youtube.com/" target="_blank" rel="noreferrer" style={styles.social}>YouTube</a>
          </div>

          <div style={{ color: '#777', fontSize: 13 }}>
            © {new Date().getFullYear()} CRUSH Clothing
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", background: '#0b0b0b', color: '#fff', minHeight: '100vh' },
  header: { padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  headerLeft: { display: 'flex', gap: 12, alignItems: 'center' },
  logo: { height: 44 },
  brandText: { display: 'none' },
  brandTitle: { fontWeight: 800 },
  brandSub: { fontSize: 12, color: '#aaa' },
  headerRight: { display: 'flex', gap: 12 },
  iconLink: { color: '#fff', textDecoration: 'none', fontWeight: 600 },
  hero: { padding: 20, background: '#111', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  heroInner: { display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flex: 1, paddingRight: 8 },
  heroRight: { width: 160 },
  heroTitle: { fontSize: 28, margin: 0, fontWeight: 800 },
  heroSub: { marginTop: 8, color: '#ddd' },
  heroImage: { width: '100%', borderRadius: 10 },
  ctaPrimary: { background: '#ff2d72', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 },
  ctaOutline: { border: '1px solid #fff', padding: '10px 14px', borderRadius: 8, color: '#fff', textDecoration: 'none' },
  section: { padding: 20, background: '#0b0b0b' },
  sectionTitle: { fontSize: 20, marginBottom: 12, fontWeight: 800 },
  featuredGrid: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 },
  featureCard: { minWidth: 220, background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.6)' },
  featureImgWrap: { height: 160, overflow: 'hidden' },
  featureImg: { width: '100%', height: '100%', objectFit: 'cover' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
  card: { background: '#0f0f0f', borderRadius: 12, overflow: 'hidden' },
  thumb: { height: 200, overflow: 'hidden', background: '#111' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: 12 },
  productTitle: { fontWeight: 700 },
  productPrice: { color: '#ff2d72', marginTop: 6 },
  addBtn: { marginTop: 10, padding: '8px 12px', background: '#ff2d72', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  footer: { background: '#000', marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.03)' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#0b0b0b', color: '#fff' },
  aboutStat: { background: '#0f0f0f', padding: 12, borderRadius: 10, minWidth: 160 },
  social: { color: '#ddd', textDecoration: 'none', fontWeight: 600 }
};
