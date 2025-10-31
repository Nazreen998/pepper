// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const state = {
  price: 199,
  variant: '100',
  type: 'whole',
  cart: [],
  coupon: null
};

const priceEl = $('#price');
const stickyPrice = $('#stickyPrice');
const stickyTitle = $('#stickyTitle');
const qtyInput = $('#qty');

// year
const yEl = $('#y'); if (yEl) yEl.textContent = new Date().getFullYear();

// gallery thumbs
$$('.thumb').forEach(t=>{
  t.addEventListener('click', ()=>{
    $$('.thumb').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    $('#heroImg').src = t.dataset.big;
  });
});

// variants
$('#variants')?.addEventListener('click', e=>{
  if(e.target.matches('.pill')){
    $$('#variants .pill').forEach(p=>p.classList.remove('active'));
    e.target.classList.add('active');
    state.variant = e.target.dataset.variant;
    state.price = Number(e.target.dataset.price);
    updatePriceUI();
  }
});

// types
$('#types')?.addEventListener('click', e=>{
  if(e.target.matches('.pill')){
    $$('#types .pill').forEach(p=>p.classList.remove('active'));
    e.target.classList.add('active');
    state.type = e.target.dataset.type;
    updateTitleUI();
  }
});

// qty stepper
$('#plus').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value||1)+1); });
$('#minus').addEventListener('click', ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value||1)-1); });

function updatePriceUI(){
  priceEl.textContent = `₹${state.price}`;
  stickyPrice.textContent = `₹${state.price}`;
  updateTitleUI();
}
function updateTitleUI(){
  stickyTitle.textContent = `Black Pepper — ${state.variant} g (${state.type})`;
}
updatePriceUI();

// ---------- Cart ----------
function addToCart(){
  const qty = Math.max(1, Number(qtyInput.value||1));
  const key = `${state.variant}-${state.type}`;
  const existing = state.cart.find(i=>i.key===key);
  if(existing) existing.qty += qty;
  else state.cart.push({
    key,
    name:`Black Pepper — ${state.variant}g (${state.type})`,
    variant: state.variant,
    type: state.type,
    price: state.price,
    qty,
    img: $('.thumb.active')?.dataset.big || 'pepper3.png'
  });
  qtyInput.value = 1;
  drawCart();
  openCart();
  toast('Added to cart');
}
$('#add').addEventListener('click', addToCart);
$('#stickyAdd').addEventListener('click', addToCart);
$('#buy').addEventListener('click', ()=>{ addToCart(); openCheckout(); });

// cart drawer
const cartEl = $('#cart');
const backdrop = $('#backdrop');
$('#open-cart').addEventListener('click', openCart);
$('#close-cart').addEventListener('click', closeCart);
backdrop.addEventListener('click', e=>{
  if(chkModal.classList.contains('show')) closeCheckout();
  else closeCart();
});

function openCart(){ cartEl.classList.add('show'); backdrop.classList.add('show'); cartEl.setAttribute('aria-hidden','false'); }
function closeCart(){ cartEl.classList.remove('show'); if(!$('#chkModal').classList.contains('show')) backdrop.classList.remove('show'); cartEl.setAttribute('aria-hidden','true'); }

// draw cart
function drawCart(){
  const box = $('#cart-items');
  box.innerHTML = '';
  let count = 0, sub = 0;
  state.cart.forEach(item=>{
    count += item.qty; sub += item.qty * item.price;
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `
      <img src="${item.img}" alt="">
      <div>
        <div class="name">${item.name}</div>
        <div class="muted">₹${item.price} × ${item.qty}</div>
        <div class="qty-sm">
          <button data-k="${item.key}" data-op="dec">−</button>
          <span>${item.qty}</span>
          <button data-k="${item.key}" data-op="inc">+</button>
          <button class="remove" data-k="${item.key}" data-op="del">Remove</button>
        </div>
      </div>
      <div><strong>₹${item.qty*item.price}</strong></div>
    `;
    box.appendChild(line);
  });

  // qty controls
  box.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const k = b.dataset.k, op = b.dataset.op;
      const it = state.cart.find(i=>i.key===k);
      if(!it) return;
      if(op==='inc') it.qty++;
      if(op==='dec') it.qty = Math.max(1, it.qty-1);
      if(op==='del') state.cart = state.cart.filter(i=>i.key!==k);
      drawCart();
    });
  });

  $('#cart-count').textContent = count;
  $('#sub').textContent = `₹${sub}`;
  const disc = state.coupon==='PEPPER10' ? Math.round(sub*0.10) : 0;
  $('#disc').textContent = `₹${disc}`;
  $('#grand').textContent = `₹${sub-disc}`;
}
drawCart();

$('#apply').addEventListener('click', ()=>{
  const code = $('#coupon').value.trim().toUpperCase();
  if(code==='PEPPER10'){ state.coupon='PEPPER10'; $('#couponMsg').textContent='10% off applied!'; }
  else { state.coupon=null; $('#couponMsg').textContent='Invalid code'; }
  drawCart();
});

// ---------- Checkout modal (Customer Details) ----------
const chkModal = $('#chkModal');
const chkForm  = $('#chkForm');
const chkMsg   = $('#chkMsg');

$('#checkout').addEventListener('click', openCheckout);
$('#chkClose').addEventListener('click', closeCheckout);

function openCheckout(){
  if(state.cart.length===0){ toast('Your cart is empty'); return; }
  // Prefill Quantity field from cart summary
  const summary = state.cart.map(c=>`${c.qty} x ${c.name}`).join(', ');
  $('#fQty').value = summary || `${state.variant}g`;
  chkModal.classList.add('show');
  backdrop.classList.add('show');
  chkModal.setAttribute('aria-hidden','false');
}
function closeCheckout(){
  chkModal.classList.remove('show');
  chkModal.setAttribute('aria-hidden','true');
  // If cart drawer also closed, hide backdrop
  if(!cartEl.classList.contains('show')) backdrop.classList.remove('show');
}

// ---------- Submit to Apps Script ----------
chkForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  chkMsg.textContent = 'Submitting...';

  const payload = new URLSearchParams({
    action: 'pepperOrder',
    token:  (window.GS_TOKEN || ''),
    customerName: $('#fName').value.trim(),
    phone: $('#fPhone').value.trim(),
    email: $('#fEmail').value.trim(),
    quantity: $('#fQty').value.trim(),
    address: $('#fNotes').value.trim(),
    message: $('#fNotes').value.trim(),
    cart: JSON.stringify(state.cart)
  });

  try{
    const res = await fetch(window.GS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });
  payload.set('notes',  document.querySelector('#fNotes')?.value.trim() || '');
payload.set('address',document.querySelector('#fNotes')?.value.trim() || '');

    // Running from file:// may block reading JSON; write still succeeds.
    const text = await res.text();
    let data; try{ data = JSON.parse(text); } catch { data = { ok: res.ok }; }

    if(data.ok){
      chkMsg.textContent = 'Order received! We will contact you shortly.';
      chkForm.reset();
      state.cart = []; drawCart();
      setTimeout(()=>{ closeCheckout(); closeCart(); }, 900);
    }else{
      chkMsg.textContent = `Error: ${data.error || 'failed to submit'}`;
    }
  }catch(err){
    console.error(err);
    chkMsg.textContent = 'Network error. Please try again.';
  }
});

// ---------- tiny toast ----------
function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style,{
    position:'fixed',left:'50%',bottom:'20px',transform:'translateX(-50%)',
    background:'#0f2019',color:'#eafff4',padding:'10px 14px',borderRadius:'999px',
    border:'1px solid #0c2c1d',zIndex:'999',opacity:'0',transition:'opacity .2s ease'
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; });
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),200); }, 1400);
}

// ---------- image swap (kept) ----------
function swap(t){
  const hero = document.getElementById('heroImg');
  const url  = t.getAttribute('data-big') || t.getAttribute('src');
  hero.onerror = function(){ console.warn('Image not found:', url); };
  hero.src = url;
  document.querySelectorAll('.thumb').forEach(el => el.classList.remove('active'));
  t.classList.add('active');
}
// DEBUG: show which images fail to load
window.addEventListener('load', () => {
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      console.warn('Image missing:', img.getAttribute('src'));
      // visible red border so you can spot it on mobile
      img.style.border = '2px solid red';
      img.alt = 'Missing: ' + img.getAttribute('src');
    });
  });
});
// Hide any thumbnail that fails to load (404 etc.)
document.querySelectorAll('.thumb').forEach(img=>{
  img.addEventListener('error', ()=>{ img.style.display = 'none'; });
});
