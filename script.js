const DEFAULT_PRODUCTS = [
  {id:'1',name:'LUXORA Noir',price:17900,category:'classic',label:'كلاسيكية',desc:'قرص أسود عميق مع هيكل فولاذي مصقول، مصممة لمن يحب الحضور الهادئ.',variant:'',badge:'الأكثر طلباً',image:''},
  {id:'2',name:'LUXORA Silver',price:21900,category:'classic',label:'كلاسيكية',desc:'تصميم فضي نظيف بقرص فاتح وتفاصيل دقيقة لإطلالة يومية فاخرة.',variant:'silver',badge:'جديد',image:''},
  {id:'3',name:'LUXORA Gold',price:25900,category:'limited',label:'إصدار محدود',desc:'لمسات ذهبية مع قرص Midnight داكن. قطعة محدودة لمحبي التفاصيل الجريئة.',variant:'gold',badge:'LIMITED',image:''}
];

let products = JSON.parse(localStorage.getItem('luxora_products') || 'null') || DEFAULT_PRODUCTS;
const luxoraClient = (window.supabase && window.LUXORA_SUPABASE_URL && window.LUXORA_SUPABASE_PUBLISHABLE_KEY)
  ? window.supabase.createClient(window.LUXORA_SUPABASE_URL, window.LUXORA_SUPABASE_PUBLISHABLE_KEY)
  : null;

function normalizeProduct(p, index){
  p = p || {};
  return {
    id: String(p.id ?? index + 1),
    name: String(p.name ?? 'ساعة LUXORA'),
    price: Number(p.price ?? 0),
    category: String(p.category ?? 'classic'),
    label: ({classic:'كلاسيكية',sport:'رياضية',limited:'إصدار محدود'})[String(p.category)] || String(p.category ?? ''),
    desc: String(p.description ?? p.desc ?? ''),
    variant: String(p.variant ?? ''),
    badge: String(p.badge ?? ''),
    image: typeof p.image_url === 'string' ? p.image_url : (typeof p.image === 'string' ? p.image : ''),
    stock: Number(p.stock ?? 0)
  };
}

async function loadCloudProducts(){
  if(!luxoraClient) return false;
  try{
    const {data,error} = await luxoraClient.from('products').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    if(Array.isArray(data) && data.length){
      products = data.map(normalizeProduct);
      localStorage.setItem('luxora_products', JSON.stringify(products));
      return true;
    }
    return false;
  }catch(error){
    console.warn('LUXORA: تعذر تحميل المنتجات من Supabase، سيتم استخدام النسخة المحلية.', error);
    return false;
  }
}

function cloudImageUrl(value){
  const path = typeof value === 'string' ? value.trim() : '';
  if(!path) return '';
  if(/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  if(!luxoraClient) return path;
  try{
    return luxoraClient.storage.from('product-images').getPublicUrl(path).data.publicUrl || '';
  }catch(e){ return ''; }
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
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
if(!Array.isArray(cart)) cart=[];
if(!Array.isArray(favorites)) favorites=[];

function money(n){return new Intl.NumberFormat('ar-DZ').format(Number(n)||0)+' دج'}
function save(){localStorage.setItem('luxora_cart',JSON.stringify(cart));localStorage.setItem('luxora_favorites',JSON.stringify(favorites))}
function toast(text){const t=$('#toast');if(!t)return;t.textContent=text;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1800)}

function filteredProducts(){
  const q = String(searchTerm || '').trim().toLowerCase();
  return products.filter(p=>{
    const categoryOk = activeFilter==='all' || String(p.category)===String(activeFilter);
    const text = `${p.name || ''} ${p.label || ''} ${p.category || ''}`.toLowerCase();
    return categoryOk && (!q || text.includes(q));
  });
}

function renderProducts(){
  const list = filteredProducts();
  if(resultCount) resultCount.textContent = `${list.length} ساعات`;
  if(emptyState) emptyState.hidden = list.length > 0;
  if(!productsGrid) return;

  if(!list.length){
    productsGrid.innerHTML = '';
    return;
  }

  try{
    productsGrid.innerHTML = list.map((p, index)=>{
      const id = String(p.id);
      const image = cloudImageUrl(p.image);
      const visual = image
        ? `<img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="mini-watch ${escapeHtml(p.variant)}" style="display:none"></div>`
        : `<div class="mini-watch ${escapeHtml(p.variant)}"></div>`;
      return `<article class="product-card ${index===1?'featured':''}">
        <span class="product-number">${String(index+1).padStart(2,'0')}</span>
        ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ''}
        <div class="mini-watch-wrap">${visual}</div>
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.label)} / LUXORA</p>
          <div class="price-row"><strong>${money(p.price)}</strong></div>
          <div class="card-actions">
            <button class="add-btn" data-add="${escapeHtml(id)}">أضف للسلة</button>
            <button class="view-btn" data-view="${escapeHtml(id)}" aria-label="التفاصيل">↗</button>
            <button class="heart-btn ${favorites.map(String).includes(id)?'active':''}" data-fav="${escapeHtml(id)}" aria-label="المفضلة">♡</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }catch(error){
    console.error('LUXORA renderProducts error:', error);
    productsGrid.innerHTML = `<div class="empty-state">تعذر عرض المنتجات. أعد تحميل الصفحة.</div>`;
  }
}

function renderCart(){
  const total=cart.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.qty)||0),0);
  const count=cart.reduce((s,i)=>s+(Number(i.qty)||0),0);
  if(cartCount) cartCount.textContent=count;
  if(cartTotal) cartTotal.textContent=money(total);
  if(cartEmpty) cartEmpty.style.display=cart.length?'none':'block';
  if(cartItems) cartItems.innerHTML=cart.map(i=>`<div class="cart-line"><div class="cart-thumb"></div><div><h4>${escapeHtml(i.name)}</h4><small>${money(i.price)}</small><div class="qty"><button data-minus="${escapeHtml(i.id)}">−</button><span>${i.qty}</span><button data-plus="${escapeHtml(i.id)}">+</button><button class="remove" data-remove="${escapeHtml(i.id)}">حذف</button></div></div><strong>${money(i.price*i.qty)}</strong></div>`).join('');
  save();
}

function addToCart(id){
  id=String(id);
  const p=products.find(x=>String(x.id)===id);
  if(!p)return;
  const item=cart.find(x=>String(x.id)===id);
  if(item)item.qty++;
  else cart.push({...p,qty:1});
  renderCart(); toast(`${p.name} أضيفت إلى السلة ✓`);
}
function openCart(){cartDrawer.classList.add('open');overlay.classList.add('show');cartDrawer.setAttribute('aria-hidden','false')}
function closeCartFn(){cartDrawer.classList.remove('open');overlay.classList.remove('show');cartDrawer.setAttribute('aria-hidden','true')}

function openModal(id){
  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;
  selectedProduct=p;
  const image=cloudImageUrl(p.image);
  $('#modalVisual').innerHTML=image
    ? `<img class="modal-product-image" src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" onerror="this.outerHTML='<div class=&quot;mini-watch ${escapeHtml(p.variant)}&quot;></div>'">`
    : `<div class="mini-watch ${escapeHtml(p.variant)}"></div>`;
  $('#modalCategory').textContent=p.label;$('#modalName').textContent=p.name;$('#modalDesc').textContent=p.desc;$('#modalPrice').textContent=money(p.price);
  productModal.classList.add('open');productModal.setAttribute('aria-hidden','false');
}
function closeModalFn(){productModal.classList.remove('open');productModal.setAttribute('aria-hidden','true')}
function renderCheckoutSummary(){const total=cart.reduce((s,i)=>s+i.price*i.qty,0);checkoutSummary.innerHTML=`<div class="summary-title">ملخص الطلب</div>${cart.map(i=>`<div class="summary-line"><span>${escapeHtml(i.name)} × ${i.qty}</span><strong>${money(i.price*i.qty)}</strong></div>`).join('')}<div class="summary-total"><span>الإجمالي</span><strong>${money(total)}</strong></div>`}
function openCheckout(){if(!cart.length)return toast('السلة فارغة');renderCheckoutSummary();checkoutModal.classList.add('open');checkoutModal.setAttribute('aria-hidden','false')}
function closeCheckoutFn(){checkoutModal.classList.remove('open');checkoutModal.setAttribute('aria-hidden','true')}
function submitOrder(e){e.preventDefault();if(!cart.length)return toast('السلة فارغة');const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),wilaya=$('#customerWilaya').value.trim(),address=$('#customerAddress').value.trim(),notes=$('#customerNotes').value.trim();const total=cart.reduce((s,i)=>s+i.price*i.qty,0);let message=`⌚ طلب جديد من متجر LUXORA\n\n👤 الاسم: ${name}\n📱 الهاتف: ${phone}\n📍 الولاية: ${wilaya}\n🏠 العنوان: ${address}\n\n🛍️ المنتجات:\n${cart.map(i=>`• ${i.name} × ${i.qty} — ${money(i.price*i.qty)}`).join('\n')}\n\n💰 الإجمالي: ${money(total)}\n💳 الدفع: عند الاستلام`;if(notes)message+=`\n📝 ملاحظات: ${notes}`;window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener');toast('تم تجهيز الطلب في WhatsApp ✓');closeCheckoutFn()}

productsGrid.addEventListener('click',e=>{
  const add=e.target.closest('[data-add]'),view=e.target.closest('[data-view]'),fav=e.target.closest('[data-fav]');
  if(add)addToCart(add.dataset.add);
  if(view)openModal(view.dataset.view);
  if(fav){
    const id=String(fav.dataset.fav);
    favorites=favorites.map(String).includes(id)?favorites.filter(x=>String(x)!==id):[...favorites,id];
    save();renderProducts();toast(favorites.map(String).includes(id)?'أضيفت إلى المفضلة ♡':'أزيلت من المفضلة');
  }
});
cartItems.addEventListener('click',e=>{
  const plus=e.target.closest('[data-plus]'),minus=e.target.closest('[data-minus]'),remove=e.target.closest('[data-remove]');
  if(plus){const i=cart.find(x=>String(x.id)===String(plus.dataset.plus));if(i)i.qty++}
  if(minus){const i=cart.find(x=>String(x.id)===String(minus.dataset.minus));if(i){i.qty--;if(i.qty<=0)cart=cart.filter(x=>String(x.id)!==String(i.id))}}
  if(remove)cart=cart.filter(x=>String(x.id)!==String(remove.dataset.remove));
  renderCart();
});
$('#filterPills').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll('#filterPills button').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});
$('#searchToggle').onclick=()=>$('#searchPanel').classList.toggle('open');
$('#closeSearch').onclick=()=>$('#searchPanel').classList.remove('open');
$('#searchInput').oninput=e=>{searchTerm=e.target.value;renderProducts()};
cartBtn.onclick=openCart;closeCart.onclick=closeCartFn;overlay.onclick=closeCartFn;closeModal.onclick=closeModalFn;
productModal.addEventListener('click',e=>{if(e.target===productModal)closeModalFn()});
modalAdd.onclick=()=>{if(selectedProduct){addToCart(selectedProduct.id);closeModalFn();openCart()}};
$('#checkoutBtn').onclick=openCheckout;closeCheckout.onclick=closeCheckoutFn;checkoutModal.addEventListener('click',e=>{if(e.target===checkoutModal)closeCheckoutFn()});
checkoutForm.addEventListener('submit',submitOrder);
$('#bannerBtn').onclick=()=>document.querySelector('#collection').scrollIntoView({behavior:'smooth'});
$('#replayBtn').onclick=()=>{video.currentTime=0;video.play().catch(()=>{})};
$('#explodeBtn').onclick=()=>{video.currentTime=0;video.play().catch(()=>{});toast('بدأت حركة تفكيك الساعة ✦')};
video.addEventListener('ended',()=>{video.currentTime=0;video.play().catch(()=>{})});
$('#newsletterForm').onsubmit=e=>{e.preventDefault();const input=$('#emailInput');if(input.checkValidity()){input.value='';toast('تم الاشتراك بنجاح ✓')}};
$('#menuBtn').onclick=()=>{const nav=$('#mainNav');nav.classList.toggle('mobile-open')};
document.addEventListener('mousemove',e=>{const g=$('#cursorGlow');if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCartFn();closeModalFn();closeCheckoutFn();$('#searchPanel').classList.remove('open')}});

(async()=>{
  await loadCloudProducts();
  renderProducts();
  renderCart();
})();
