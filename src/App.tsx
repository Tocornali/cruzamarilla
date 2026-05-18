import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Trash2, Plus, Minus, Search, Filter, 
  CheckCircle2, AlertCircle, DollarSign, Tag, ShieldAlert, 
  X, RefreshCw, Sun, Moon, Check, Printer, 
  ArrowLeft, FileText, ShoppingBag
} from 'lucide-react';

interface ApiProductPayload {
  codigo_producto: string;
  nombre_comercial: string;
  formato: string;
  marca: string;
  stock_actual: number;
  precio_institucional: number;
  restricciones: {
    requiere_receta: boolean;
    solo_institucional: boolean;
  };
}

interface PreconfiguredSku {
  sku: string;
  name: string;
  category: string;
}

// Catálogo exclusivo para Farmacia (B2C)
const PHARMACY_SKUS: PreconfiguredSku[] = [
  { sku: 'PHA-AMX-500-20', name: 'Amoxicilina 500mg (Caja 20 Cápsulas)', category: 'Medicamentos' },
  { sku: 'PHA-PAR-500-16', name: 'Paracetamol 500mg (16 Comprimidos)', category: 'Medicamentos' },
  { sku: 'PHA-PAR-1000-10', name: 'Paracetamol 1g (10 Comprimidos)', category: 'Medicamentos' },
  { sku: 'HIG-ALC-250', name: 'Alcohol Gel 70% (Botella 250ml)', category: 'Botiquín e Higiene' },
  { sku: 'BOT-CUR-20', name: 'Apósitos Adhesivos Curitas (Caja x20)', category: 'Botiquín e Higiene' },
  { sku: 'BOT-CUR-100', name: 'Apósitos Adhesivos Curitas (Caja x100)', category: 'Botiquín e Higiene' },
  { sku: 'BOT-ALG-100', name: 'Algodón Hidrófilo Premium (Paquete 100g)', category: 'Botiquín e Higiene' },
  { sku: 'PRO-MSK-10', name: 'Mascarilla KN95 Certificada (Caja x10)', category: 'Botiquín e Higiene' },
  { sku: 'INS-GAS-50', name: 'Gasa Estéril 10x10cm (Caja x50 sobres)', category: 'Botiquín e Higiene' },
  { sku: 'EQU-TEN-DIG', name: 'Monitor de Presión Arterial Digital', category: 'Equipos de Diagnóstico' },
  { sku: 'EQU-TER-INF', name: 'Termómetro Infrarrojo Frontal Sin Contacto', category: 'Equipos de Diagnóstico' },
  { sku: 'EQU-OXI-PRO', name: 'Oxímetro de Pulso Profesional', category: 'Equipos de Diagnóstico' }
];

interface CartItem {
  product: ApiProductPayload;
  qty: number;
}

interface ConfirmedOrder {
  orderId: string;
  timestamp: string;
  items: CartItem[];
  subtotalNeto: number;
  iva: number;
  totalFacturado: number;
}

// Función para redondear precios hacia arriba al múltiplo de 100 más cercano (Ej: 4370 -> 4400)
const getCleanPrice = (rawPrice: number | undefined): number => {
  if (!rawPrice) return 0;
  return Math.ceil(rawPrice / 100) * 100;
};

export default function App() {
  // Configuración de API desde Variables de Entorno (.env)
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1/catalogo-publico';
  
  // Modo Oscuro / Claro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Estado del Catálogo
  const [products, setProducts] = useState<Record<string, ApiProductPayload | null>>({});
  const [loadingSkus, setLoadingSkus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // Estado del Carrito de Compras
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Estado del Pedido Confirmado
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

  // Consulta individual a la API
  const fetchProductBySku = async (sku: string): Promise<ApiProductPayload | null> => {
    const cleanSku = sku.trim().toUpperCase();
    if (!cleanSku) return null;

    setLoadingSkus(prev => ({ ...prev, [cleanSku]: true }));

    const targetUrl = `${baseUrl.replace(/\/$/, '')}/${cleanSku}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let data;
      try { data = await response.json(); } catch (e) { data = null; }

      if (response.ok && data && data.codigo_producto) {
        setProducts(prev => ({ ...prev, [cleanSku]: data }));
        return data;
      } else {
        setProducts(prev => ({ ...prev, [cleanSku]: null }));
        return null;
      }
    } catch (error) {
      setProducts(prev => ({ ...prev, [cleanSku]: null }));
      return null;
    } finally {
      setLoadingSkus(prev => ({ ...prev, [cleanSku]: false }));
    }
  };

  // Cargar todos los productos de farmacia automáticamente al iniciar
  useEffect(() => {
    const loadAllProducts = async () => {
      for (const item of PHARMACY_SKUS) {
        await fetchProductBySku(item.sku);
      }
    };
    loadAllProducts();
  }, []);

  // Funciones del Carrito
  const handleAddToCart = async (sku: string) => {
    let product = products[sku];
    if (!product) {
      product = await fetchProductBySku(sku);
    }
    
    if (!product) return;

    setCart(prev => {
      const currentQty = prev[sku]?.qty || 0;
      return {
        ...prev,
        [sku]: { product: product!, qty: currentQty + 1 }
      };
    });
  };

  const updateCartQty = (sku: string, delta: number) => {
    setCart(prev => {
      const item = prev[sku];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[sku];
        return copy;
      }
      return {
        ...prev,
        [sku]: { ...item, qty: newQty }
      };
    });
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[sku];
      return copy;
    });
  };

  // Cálculos del Carrito con precios limpios (redondeados hacia arriba)
  const cartItemsList = Object.values(cart);
  const totalItemsCount = cartItemsList.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cartItemsList.reduce((sum, item) => sum + (getCleanPrice(item.product.precio_institucional) * item.qty), 0);

  // Consolidar Pedido (Checkout B2C)
  const handleConsolidateOrder = () => {
    if (cartItemsList.length === 0) return;

    const subtotalNeto = cartSubtotal;
    const iva = Math.round(subtotalNeto * 0.19);
    const totalFacturado = subtotalNeto + iva;

    const newOrder: ConfirmedOrder = {
      orderId: `PED-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toLocaleString('es-CL'),
      items: [...cartItemsList],
      subtotalNeto,
      iva,
      totalFacturado
    };

    setConfirmedOrder(newOrder);
    setCart({});
    setIsCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrado de Categorías
  const filteredSkus = PHARMACY_SKUS.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['Todos', 'Medicamentos', 'Botiquín e Higiene', 'Equipos de Diagnóstico'];

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground pb-12 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Top Accent bar */}
      <div className="h-1 bg-primary w-full shadow-sm shadow-primary/30" />

      {/* Navbar Minimalista B2C */}
      <header className="sticky top-0 z-40 bg-card text-card-foreground border-b border-border px-4 lg:px-8 py-3.5 shadow-sm backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Título de la Web */}
          <div 
            onClick={() => setConfirmedOrder(null)} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-md shadow-primary/20 transition-all group-hover:scale-105">
              Rx
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-card-foreground !m-0 group-hover:text-primary transition-colors">
                Farmacia Cruz Amarilla
              </h1>
              <p className="text-xs text-muted-foreground font-medium !m-0">Catálogo de Productos</p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-3">
            {/* Botón Alternar Tema (Sun/Moon) */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-background hover:bg-muted text-foreground border border-border shadow-xs transition-all active:scale-95"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Botón Mi Carrito (Oculto si estamos viendo la orden confirmada) */}
            {!confirmedOrder && (
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Mi Carrito</span>
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground font-bold text-[11px] flex items-center justify-center shadow">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* VISTA 1: DETALLE DE PEDIDO CONFIRMADO (B2C) */}
        {confirmedOrder ? (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Encabezado de Éxito */}
            <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex-shrink-0 shadow-sm">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                    Compra Confirmada
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-card-foreground mt-2 !m-0">
                    ¡Gracias por tu compra!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 !m-0">
                    Tu pedido ha sido recibido exitosamente y ya estamos preparando tu despacho.
                  </p>
                </div>
              </div>

              {/* Botones de Acción de Orden */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t border-border md:border-t-0 pt-4 md:pt-0">
                <button
                  onClick={() => window.print()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-semibold text-xs transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante</span>
                </button>
                <button
                  onClick={() => setConfirmedOrder(null)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/20"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a la Tienda</span>
                </button>
              </div>
            </div>

            {/* Grid de Información de la Orden y Desglose */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Columna Izquierda: Lista de Productos Consolidados */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="text-base font-bold text-card-foreground !m-0">Productos Solicitados</h3>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {confirmedOrder.items.reduce((sum, item) => sum + item.qty, 0)} ítems en total
                    </span>
                  </div>

                  {/* Tabla / Lista de Productos */}
                  <div className="flex flex-col gap-4">
                    {confirmedOrder.items.map(({ product, qty }) => {
                      const cleanUnitPrice = getCleanPrice(product.precio_institucional);
                      const itemSubtotal = cleanUnitPrice * qty;

                      return (
                        <div 
                          key={product.codigo_producto} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/40 transition-all"
                        >
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-card-foreground truncate">{product.nombre_comercial}</span>
                              <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-secondary-foreground">
                                {product.codigo_producto}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground font-medium !m-0">{product.formato} — <span className="text-card-foreground font-semibold">{product.marca || 'Genérico'}</span></p>

                            {/* Badges de Restricciones en la orden */}
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {product.restricciones?.requiere_receta && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-xs">
                                  <ShieldAlert className="w-3 h-3" /> Receta Obligatoria
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Cantidad y Subtotal por ítem */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-border sm:border-t-0 pt-3 sm:pt-0 gap-1">
                            <span className="text-xs text-muted-foreground font-medium">
                              {qty} {qty === 1 ? 'unidad' : 'unidades'} × ${cleanUnitPrice.toLocaleString('es-CL')}
                            </span>
                            <span className="text-sm font-extrabold text-card-foreground">
                              ${itemSubtotal.toLocaleString('es-CL')} CLP
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Resumen Financiero y Datos de Despacho */}
              <div className="flex flex-col gap-6">
                
                {/* Tarjeta de Resumen de Compra */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center gap-2 border-b border-border pb-4">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-card-foreground !m-0">Resumen de tu Compra</h3>
                  </div>

                  <div className="flex flex-col gap-4 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>N° de Pedido</span>
                      <span className="font-mono font-bold text-card-foreground">{confirmedOrder.orderId}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Fecha de Compra</span>
                      <span className="font-medium text-card-foreground">{confirmedOrder.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Método de Pago</span>
                      <span className="font-medium text-card-foreground">WebPay Plus / Débito</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Tipo de Entrega</span>
                      <span className="font-medium text-card-foreground">Despacho a Domicilio</span>
                    </div>
                  </div>

                  {/* Desglose de Totales */}
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Subtotal Neto</span>
                      <span className="font-bold text-card-foreground">${confirmedOrder.subtotalNeto.toLocaleString('es-CL')} CLP</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">IVA (19%)</span>
                      <span className="font-bold text-card-foreground">${confirmedOrder.iva.toLocaleString('es-CL')} CLP</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-bold text-card-foreground uppercase">Total Pagado</span>
                      <span className="text-xl font-extrabold text-primary">${confirmedOrder.totalFacturado.toLocaleString('es-CL')} CLP</span>
                    </div>
                  </div>

                  <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-start gap-3 text-xs text-muted-foreground mt-2">
                    <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="!m-0 leading-relaxed">
                      Recibirás un correo con la confirmación y boleta electrónica de tu compra. Los medicamentos con receta obligatoria requieren presentar el documento físico al momento de la entrega.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          /* VISTA 2: CATÁLOGO PRINCIPAL B2C */
          <>
            {/* Barra de Búsqueda y Filtros de Categoría */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card text-card-foreground p-4 rounded-2xl border border-border shadow-sm transition-all">
              
              {/* Categorías Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                <Filter className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Buscador */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar medicamento o SKU..."
                  className="w-full bg-background text-foreground border border-border rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Catálogo Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSkus.map((item) => {
                const productData = products[item.sku];
                const isLoading = loadingSkus[item.sku];
                const hasData = productData !== undefined && productData !== null;
                const hasError = productData === null;

                const cleanPrice = hasData ? getCleanPrice(productData.precio_institucional) : 0;

                return (
                  <div 
                    key={item.sku} 
                    className="rounded-2xl overflow-hidden flex flex-col justify-between border border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all group"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-border flex flex-col gap-3 bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-[11px] font-semibold tracking-wide uppercase">
                          {item.category}
                        </span>

                        {/* Stock Badge */}
                        <div>
                          {isLoading ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-accent-foreground border border-border text-[11px] font-medium animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Cargando API...
                            </span>
                          ) : hasData ? (
                            productData.stock_actual > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Stock: {productData.stock_actual}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground text-[11px] font-bold shadow-xs">
                                <AlertCircle className="w-3 h-3" /> Agotado
                              </span>
                            )
                          ) : hasError ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground text-[11px] font-bold shadow-xs">
                              <AlertCircle className="w-3 h-3" /> Error API
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Nombre y Formato */}
                      <div>
                        <h3 className="text-base font-bold text-card-foreground line-clamp-2 !m-0 group-hover:text-primary transition-colors">
                          {hasData ? productData.nombre_comercial || item.name : item.name}
                        </h3>
                        {hasData && productData.formato && (
                          <p className="text-xs text-muted-foreground font-medium mt-1 !m-0">{productData.formato}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-secondary px-2 py-1 rounded border border-border text-secondary-foreground flex items-center gap-1.5 shadow-2xs">
                          <Tag className="w-3 h-3 text-primary" />
                          {item.sku}
                        </code>
                      </div>
                    </div>

                    {/* Card Body: Precio y Restricciones */}
                    <div className="p-5 flex-1 flex flex-col justify-center bg-secondary/30 transition-colors">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-xs">Obteniendo datos en vivo...</span>
                        </div>
                      ) : hasData ? (
                        <div className="flex flex-col gap-4">
                          {/* Precio y Marca */}
                          <div className="flex items-end justify-between border-b border-border pb-3">
                            <div>
                              <span className="text-[11px] text-muted-foreground block uppercase font-medium">Precio</span>
                              <span className="text-2xl font-extrabold text-card-foreground tracking-tight flex items-center gap-1">
                                <DollarSign className="w-5 h-5 text-primary -mr-1" />
                                {cleanPrice.toLocaleString('es-CL')}
                                <span className="text-xs font-normal text-muted-foreground">CLP</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-muted-foreground block uppercase font-medium">Marca</span>
                              <span className="text-sm font-semibold text-card-foreground">{productData.marca || 'Genérico'}</span>
                            </div>
                          </div>

                          {/* Restricciones B2C (Solo Receta Obligatoria) */}
                          <div className="flex flex-wrap gap-2">
                            {productData.restricciones?.requiere_receta && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold shadow-xs tracking-wide">
                                <ShieldAlert className="w-3.5 h-3.5" /> Receta Obligatoria
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center text-xs">
                          Presiona "Agregar al Carrito" para cargar este producto desde la API.
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Botón Agregar al Carrito */}
                    <div className="p-4 bg-secondary/50 border-t border-border flex items-center justify-between gap-2 transition-colors">
                      <button
                        onClick={() => handleAddToCart(item.sku)}
                        disabled={isLoading || (hasData && productData.stock_actual <= 0)}
                        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                          hasData && productData.stock_actual <= 0
                            ? 'bg-secondary text-muted-foreground cursor-not-allowed border border-border'
                            : 'bg-primary hover:opacity-90 text-primary-foreground shadow-sm shadow-primary/20 active:scale-95'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {isLoading 
                            ? 'Cargando...' 
                            : hasData && productData.stock_actual <= 0 
                              ? 'Sin Stock Disponible' 
                              : 'Agregar al Carrito'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSkus.length === 0 && (
              <div className="rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 border border-border bg-card shadow-sm">
                <Search className="w-12 h-12 text-muted-foreground" />
                <h3 className="text-lg font-bold text-card-foreground !m-0">No se encontraron productos</h3>
                <p className="text-sm text-muted-foreground max-w-md !m-0">
                  No hay productos que coincidan con tu búsqueda.
                </p>
              </div>
            )}
          </>
        )}

      </main>

      {/* Panel Lateral del Carrito de Compras */}
      {isCartOpen && !confirmedOrder && (
        <div className={`fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
          <div className="w-full max-w-md h-full flex flex-col border-l border-border shadow-2xl bg-card text-card-foreground animate-slide-left">
            {/* Cart Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground !m-0">Carrito de Compras</h3>
                  <p className="text-xs text-muted-foreground !m-0">{totalItemsCount} productos seleccionados</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-background/50">
              {cartItemsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground/60" />
                  <p className="text-sm max-w-[240px] !m-0">
                    Tu carrito está vacío. Selecciona "Agregar al Carrito" en cualquier producto del catálogo.
                  </p>
                </div>
              ) : (
                cartItemsList.map(({ product, qty }) => {
                  const cleanUnitPrice = getCleanPrice(product.precio_institucional);

                  return (
                    <div key={product.codigo_producto} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-2xs">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-card-foreground truncate !m-0">{product.nombre_comercial}</h4>
                        <p className="text-xs text-muted-foreground font-medium truncate !m-0">{product.formato}</p>
                        <span className="text-xs font-semibold text-primary mt-1 block">
                          ${cleanUnitPrice.toLocaleString('es-CL')} CLP c/u
                        </span>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-1">
                        <button 
                          onClick={() => updateCartQty(product.codigo_producto, -1)}
                          className="p-1 rounded-lg hover:bg-background text-secondary-foreground transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-foreground">{qty}</span>
                        <button 
                          onClick={() => updateCartQty(product.codigo_producto, 1)}
                          className="p-1 rounded-lg hover:bg-background text-secondary-foreground transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Eliminar */}
                      <button 
                        onClick={() => removeFromCart(product.codigo_producto)}
                        className="p-2 rounded-xl bg-destructive text-destructive-foreground border border-destructive/20 shadow-xs hover:opacity-90 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer / Checkout B2C */}
            {cartItemsList.length > 0 && (
              <div className="p-6 border-t border-border bg-secondary/30 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="text-lg font-extrabold text-card-foreground">
                    ${cartSubtotal.toLocaleString('es-CL')} <span className="text-xs font-normal text-muted-foreground">CLP</span>
                  </span>
                </div>
                <button 
                  onClick={handleConsolidateOrder}
                  className="w-full py-3.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 text-center"
                >
                  Finalizar Compra (${cartSubtotal.toLocaleString('es-CL')} CLP)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
