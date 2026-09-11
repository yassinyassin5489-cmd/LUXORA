const DEFAULT_PRODUCTS = [
  {id:1,name:'LUXORA Noir',price:17900,category:'classic',label:'كلاسيكية',desc:'قرص أسود عميق مع هيكل فولاذي مصقول، مصممة لمن يحب الحضور الهادئ.',variant:'',badge:'الأكثر طلباً',image:''},
  {id:2,name:'LUXORA Silver',price:21900,category:'classic',label:'كلاسيكية',desc:'تصميم فضي نظيف بقرص فاتح وتفاصيل دقيقة لإطلالة يومية فاخرة.',variant:'silver',badge:'جديد',image:''},
  {id:3,name:'LUXORA Gold',price:25900,category:'limited',label:'إصدار محدود',desc:'لمسات ذهبية مع قرص Midnight داكن. قطعة محدودة لمحبي التفاصيل الجريئة.',variant:'gold',badge:'LIMITED',image:''},
  {id:4,name:'LUXORA Chrono',price:28900,category:'sport',label:'رياضية',desc:'طابع رياضي فاخر وهيكل قوي مستوحى من ساعات الأداء العالي.',variant:'silver',badge:'SPORT',image:''},
  {id:5,name:'LUXORA Eclipse',price:23900,category:'classic',label:'كلاسيكية',desc:'تصميم أسود بالكامل بلمسة معدنية خافتة، مثالية للمناسبات المسائية.',variant:'',badge:'',image:''},
  {id:6,name:'LUXORA Titan',price:32900,category:'sport',label:'رياضية',desc:'هيكل قوي وتفاصيل حادة لعشاق الساعات ذات الشخصية الواضحة.',variant:'gold',badge:'PREMIUM',image:''}
];
let products = JSON.parse(localStorage.getItem('luxora_products') || 'null') || DEFAULT_PRODUCTS;
const supabase = window.supabase && window.LUXORA_SUPABASE_URL && window.LUXORA_SUPABASE_PUBLISHABLE_KEY
  ? window.supabase.createClient(window.LUXORA_SUPABASE_URL, window.LUXORA_SUPABASE_PUBLISHABLE_KEY)
  : null;
let cloudReady = false;

function normalizeProduct(p){
  return {id:Number(p.id), name:p.name||'', price:Number(p.price||0), category:p.category||'classic', label:({classic:'كلاسيكية',sport:'رياضية',limited:'إصدار محدود'})[p.category]||p.category||'', desc:p.description ?? p.desc ?? '', variant:p.variant||'', badge:p.badge||'', image:p.image_url ?? p.image ?? '', stock:Number(p.stock ?? 0)};
}

async function loadCloudProducts(){
  if(!supabase) return false;
  const {data,error}=await supabase.from('products').select('*').order('id');
  if(error){console.warn('LUXORA cloud read failed:',error);return false;}
  if(Array.isArray(data)){products=data.map(normalizeProduct); localStorage.setItem('luxora_products',JSON.stringify(products)); cloudReady=true; return true;}
  return false;
}

function cloudImageUrl(path){
  if(!path) return '';
  if(path.startsWith('http') || path.startsWith('data:')) return path;
  if(!supabase) return path;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}


const $ = s => document.querySelector(s);
const video = $('#watchVideo');
const cartBtn = $('#cartBtn'), cartDrawer = $('#cartDrawer'), closeCart = $('#closeCart'), overlay = $('#overlay');
const cartItems = $('#cartItems'), cartEmpty = $('#cartEmpty'), cartCount = $('#cartCount'), cartTotal = $('#cartTotal');
const productsGrid = $('#productsGrid'), resultCount = $('#resultCount'), emptyState = $('#emptyState');
const productModal = $('#productModal'), closeModal = $('#closeModal'), modalAdd = $('#modalAdd');
const checkoutModal = $('#checkoutModal'), closeCheckout = $('#closeCheckout'), checkoutForm = $('#checkoutForm'), checkoutSummary = $('#checkoutSummary');
const WHATSAPP_NUMBER = '213671343960';
let activeFilter='all', searchTerm='', selectedProduct=null;
let cart = JSON.parse(localStorage.getItem('luxora_cart') || '[]');
let favorites = JSON.parse(localStorage.getItem('luxora_favorites') || '[]');

function money(n){return new Intl.NumberFormat('ar-DZ').format(n)+' دج'}
function save(){localStorage.setItem('luxora_cart',JSON.stringify(cart));localStorage.setItem('luxora_favorites',JSON.stringify(favorites))}
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1800)}
function filteredProducts(){return products.filter(p=>(activeFilter==='all'||p.category===activeFilter)&&(`${p.name} ${p.label}`.toLowerCase().includes(searchTerm.toLowerCase())))}
function renderProducts(){const list=filteredProducts();resultCount.textContent=`${list.length} ساعات`;emptyState.hidden=list.length>0;productsGrid.innerHTML=list.map(p=>`<article class="product-card ${p.id===2?'featured':''}"><span class="product-number">${String(p.id).padStart(2,'0')}</span>${p.badge?`<span class="badge">${p.badge}</span>`:''}<div class="mini-watch-wrap">${p.image?`<img class="product-image" src="${cloudImageUrl(p.image)}" alt="${p.name}">`:`<div class="mini-watch ${p.variant}"></div>`}</div><div><h3>${p.name}</h3><p>${p.label} / LUXORA</p><div class="price-row"><strong>${money(p.price)}</strong></div><div class="card-actions"><button class="add-btn" data-add="${p.id}">أضف للسلة</button><button class="view-btn" data-view="${p.id}" aria-label="التفاصيل">↗</button><button class="heart-btn ${favorites.includes(p.id)?'active':''}" data-fav="${p.id}" aria-label="المفضلة">♡</button></div></div></article>`).join('')}
function renderCart(){const total=cart.reduce((s,i)=>s+i.price*i.qty,0), count=cart.reduce((s,i)=>s+i.qty,0);cartCount.textContent=count;cartTotal.textContent=money(total);cartEmpty.style.display=cart.length?'none':'block';cartItems.innerHTML=cart.map(i=>`<div class="cart-line"><div class="cart-thumb"></div><div><h4>${i.name}</h4><small>${money(i.price)}</small><div class="qty"><button data-minus="${i.id}">−</button><span>${i.qty}</span><button data-plus="${i.id}">+</button><button class="remove" data-remove="${i.id}">حذف</button></div></div><strong>${money(i.price*i.qty)}</strong></div>`).join('');save()}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({...p,qty:1});renderCart();toast(`${p.name} أضيفت إلى السلة ✓`)}
function openCart(){cartDrawer.classList.add('open');overlay.classList.add('show');cartDrawer.setAttribute('aria-hidden','false')}
function closeCartFn(){cartDrawer.classList.remove('open');overlay.classList.remove('show');cartDrawer.setAttribute('aria-hidden','true')}
function openModal(id){const p=products.find(x=>x.id===id);if(!p)return;selectedProduct=p;$('#modalVisual').innerHTML=p.image?`<img class="modal-product-image" src="${cloudImageUrl(p.image)}" alt="${p.name}">`:`<div class="mini-watch ${p.variant}"></div>`;$('#modalCategory').textContent=p.label;$('#modalName').textContent=p.name;$('#modalDesc').textContent=p.desc;$('#modalPrice').textContent=money(p.price);productModal.classList.add('open');productModal.setAttribute('aria-hidden','false')}
function closeModalFn(){productModal.classList.remove('open');productModal.setAttribute('aria-hidden','true')}
function renderCheckoutSummary(){const total=cart.reduce((s,i)=>s+i.price*i.qty,0);checkoutSummary.innerHTML=`<div class=\"summary-title\">ملخص الطلب</div>${cart.map(i=>`<div class=\"summary-line\"><span>${i.name} × ${i.qty}</span><strong>${money(i.price*i.qty)}</strong></div>`).join('')}<div class=\"summary-total\"><span>الإجمالي</span><strong>${money(total)}</strong></div>`}
function openCheckout(){if(!cart.length)return toast('السلة فارغة');renderCheckoutSummary();checkoutModal.classList.add('open');checkoutModal.setAttribute('aria-hidden','false')}
function closeCheckoutFn(){checkoutModal.classList.remove('open');checkoutModal.setAttribute('aria-hidden','true')}
function submitOrder(e){e.preventDefault();if(!cart.length)return toast('السلة فارغة');const name=$('#customerName').value.trim(), phone=$('#customerPhone').value.trim(), wilaya=$('#customerWilaya').value.trim(), address=$('#customerAddress').value.trim(), notes=$('#customerNotes').value.trim();const total=cart.reduce((s,i)=>s+i.price*i.qty,0);let message=`⌚ طلب جديد من متجر LUXORA\n\n👤 الاسم: ${name}\n📱 الهاتف: ${phone}\n📍 الولاية: ${wilaya}\n🏠 العنوان: ${address}\n\n🛍️ المنتجات:\n${cart.map(i=>`• ${i.name} × ${i.qty} — ${money(i.price*i.qty)}`).join('\n')}\n\n💰 الإجمالي: ${money(total)}\n💳 الدفع: عند الاستلام`;if(notes)message+=`\n📝 ملاحظات: ${notes}`;const url=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;window.open(url,'_blank','noopener');toast('تم تجهيز الطلب في WhatsApp ✓');closeCheckoutFn();}

productsGrid.addEventListener('click',e=>{const add=e.target.closest('[data-add]'),view=e.target.closest('[data-view]'),fav=e.target.closest('[data-fav]');if(add)addToCart(+add.dataset.add);if(view)openModal(+view.dataset.view);if(fav){const id=+fav.dataset.fav;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save();renderProducts();toast(favorites.includes(id)?'أضيفت إلى المفضلة ♡':'أزيلت من المفضلة')}});
cartItems.addEventListener('click',e=>{const plus=e.target.closest('[data-plus]'),minus=e.target.closest('[data-minus]'),remove=e.target.closest('[data-remove]');if(plus){const i=cart.find(x=>x.id===+plus.dataset.plus);if(i)i.qty++}if(minus){const i=cart.find(x=>x.id===+minus.dataset.minus);if(i){i.qty--;if(i.qty<=0)cart=cart.filter(x=>x.id!==i.id)}}if(remove)cart=cart.filter(x=>x.id!==+remove.dataset.remove);renderCart()});
$('#filterPills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll('#filterPills button').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});
$('#searchToggle').onclick=()=>$('#searchPanel').classList.toggle('open');$('#closeSearch').onclick=()=>$('#searchPanel').classList.remove('open');$('#searchInput').oninput=e=>{searchTerm=e.target.value;renderProducts()};
cartBtn.onclick=openCart;closeCart.onclick=closeCartFn;overlay.onclick=closeCartFn;closeModal.onclick=closeModalFn;productModal.addEventListener('click',e=>{if(e.target===productModal)closeModalFn()});
modalAdd.onclick=()=>{if(selectedProduct){addToCart(selectedProduct.id);closeModalFn();openCart()}};
$('#checkoutBtn').onclick=openCheckout;
closeCheckout.onclick=closeCheckoutFn;
checkoutModal.addEventListener('click',e=>{if(e.target===checkoutModal)closeCheckoutFn()});
checkoutForm.addEventListener('submit',submitOrder);
$('#bannerBtn').onclick=()=>document.querySelector('#collection').scrollIntoView({behavior:'smooth'});
$('#replayBtn').onclick=()=>{video.currentTime=0;video.play().catch(()=>{})};$('#explodeBtn').onclick=()=>{video.currentTime=0;video.play().catch(()=>{});toast('بدأت حركة تفكيك الساعة ✦')};video.addEventListener('ended',()=>{video.currentTime=0;video.play().catch(()=>{})});
$('#newsletterForm').onsubmit=e=>{e.preventDefault();const input=$('#emailInput');if(input.checkValidity()){input.value='';toast('تم الاشتراك بنجاح ✓')}};
$('#menuBtn').onclick=()=>{const nav=$('#mainNav');nav.classList.toggle('mobile-open')};
document.addEventListener('mousemove',e=>{const g=$('#cursorGlow');if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCartFn();closeModalFn();closeCheckoutFn();$('#searchPanel').classList.remove('open')}});
(async()=>{ await loadCloudProducts(); renderProducts(); renderCart(); })();
