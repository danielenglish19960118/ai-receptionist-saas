// 🔗 您的 Make.com Webhook Proxy 網址
const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/calnmda21j7pz652bl9y1use7dvjas43';

let currentPage = 1;
const itemsPerPage = 20;
const totalItems = 10000;
const totalPages = Math.ceil(totalItems / itemsPerPage);
let selectedChannel = 'chrome';

const categories = [
    'Private Wealth & Escrow Vault', 
    'Luxury Jet & Automotive Concierge', 
    'Concierge Medical & Bio-Optimization', 
    'C-Suite Executive M&A & Advisory', 
    'Enterprise Cloud AI & Sovereign Infrastructure', 
    'Global Ultra-Luxury Real Estate'
];

function saveOmniEmail() {
    const email = document.getElementById('omniClientEmail').value.trim();
    if (!email) {
        alert('Please enter a valid email address!');
        return;
    }
    alert(`✔ Business email (${email}) successfully bound to ${selectedChannel.toUpperCase()} gateway!`);
}

async function selectChannel(chanKey, idNum) {
    selectedChannel = chanKey;
    for (let i = 1; i <= 8; i++) {
        const btn = document.getElementById(`chanBtn-${i}`);
        if (btn) {
            if (i === idNum) {
                btn.className = "bg-amber-400 text-black font-bold p-3 rounded-2xl border border-amber-400 transition-all text-center truncate shadow-md cursor-pointer";
            } else {
                btn.className = "bg-white/5 text-slate-300 hover:text-white p-3 rounded-2xl border border-white/10 transition-all text-center truncate cursor-pointer";
            }
        }
    }

    const email = document.getElementById('omniClientEmail')?.value.trim() || 'anonymous@executive.com';
    try {
        await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'omnichannel_gateway_switch',
                channel: selectedChannel,
                email: email,
                timestamp: new Date().toISOString()
            })
        });
    } catch (err) {
        console.log('Webhook dispatch note:', err);
    }
}

function renderHooks(page, searchQuery = '') {
    const grid = document.getElementById('hooksGrid');
    if (!grid) return;
    const startId = (page - 1) * itemsPerPage + 1;
    const endId = Math.min(page * itemsPerPage, totalItems);
    let html = '';

    for (let i = startId; i <= endId; i++) {
        const category = categories[(i - 1) % categories.length];
        const hookName = `Voice Hook Scenario #${i}`;
        const pattern = `Pattern #${i}: High-intent conversational triggers -> Direct secure bridge dispatch via Make.com Proxy.`;

        if (searchQuery && !hookName.toLowerCase().includes(searchQuery.toLowerCase()) && !String(i).includes(searchQuery)) {
            continue;
        }

        html += `
            <div onclick="inspectHookScenario(${i})" class="bg-[#121216] p-5 rounded-2xl border border-white/10 hover:border-amber-400 transition-all cursor-pointer shadow-lg flex flex-col justify-between space-y-3 group">
                <div>
                    <div class="flex justify-between items-center text-[10px] font-mono">
                        <span class="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">HOOK #${i}</span>
                        <span class="text-slate-500 truncate max-w-[120px]">${category}</span>
                    </div>
                    <h3 class="font-bold text-white text-sm mt-2 group-hover:text-amber-300 transition-colors">${hookName}</h3>
                    <p class="text-[11px] font-mono text-slate-400 mt-1 line-clamp-2">${pattern}</p>
                </div>
                <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <span class="text-amber-400"><i class="fa-solid fa-hand-pointer mr-1"></i> Test Scenario</span>
                    <span class="text-emerald-400">&lt; 130ms</span>
                </div>
            </div>
        `;
    }

    if (html === '') {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 font-mono text-xs">No matching voice hooks found on page ${page}.</div>`;
    } else {
        grid.innerHTML = html;
    }

    const indicator = document.getElementById('pageIndicator');
    if (indicator) indicator.innerText = `Page ${page} of ${totalPages} (Hooks ${startId} - ${endId} of ${totalItems})`;
}

async function inspectHookScenario(hookId) {
    const tag = document.getElementById('modalPageTag');
    const titleEl = document.getElementById('modalPageTitle');
    const desc = document.getElementById('modalPageDesc');
    const modal = document.getElementById('supremeModal');
    const email = document.getElementById('omniClientEmail')?.value.trim() || 'anonymous@executive.com';

    if (tag && titleEl && desc && modal) {
        tag.innerText = `HOOK SCENARIO #${hookId} • OMNICHANNEL: ${selectedChannel.toUpperCase()}`;
        titleEl.innerText = `Enterprise Voice Hook Scenario #${hookId}`;
        desc.innerHTML = `<div class="text-amber-400 animate-pulse py-6 text-center font-mono">📡 Transmitting request via Make.com Webhook Proxy (${selectedChannel})...</div>`;
        modal.classList.remove('hidden');

        try {
            await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'inspect_hook_scenario',
                    hookId: hookId,
                    channel: selectedChannel,
                    email: email,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            console.log('Webhook note:', err);
        }

        const category = categories[(hookId - 1) % categories.length];
        desc.innerHTML = `
            <div class="space-y-2 font-mono text-xs">
                <div class="flex justify-between border-b border-white/10 pb-1">
                    <span class="text-slate-400">Scenario Code:</span>
                    <strong class="text-amber-300">EXEC-HOOK-#${hookId}</strong>
                </div>
                <div class="flex justify-between border-b border-white/10 pb-1">
                    <span class="text-slate-400">Category:</span>
                    <strong class="text-white">${category}</strong>
                </div>
                <div class="flex justify-between border-b border-white/10 pb-1">
                    <span class="text-slate-400">Channel Binding:</span>
                    <strong class="text-emerald-400">${selectedChannel.toUpperCase()} Gateway</strong>
                </div>
                <div class="flex justify-between border-b border-white/10 pb-1">
                    <span class="text-slate-400">Client Email:</span>
                    <strong class="text-amber-400">${email}</strong>
                </div>
                <div class="flex justify-between border-b border-white/10 pb-1">
                    <span class="text-slate-400">Estimated Deal Value:</span>
                    <strong class="text-amber-400">$300,000+ ARR (Tier-1 Whale)</strong>
                </div>
                <div class="pt-2">
                    <span class="text-slate-400 block mb-1">System Prompt Script:</span>
                    <p class="text-slate-200 italic bg-black/80 p-3 rounded-lg border border-amber-400/20">"Scenario #${hookId} features unrefutable objection scripts, sub-130ms voice response pipelines, and instant escrow closing hooks synchronized across ${selectedChannel} via Make.com Proxy."</p>
                </div>
            </div>
        `;
    }
}

function closeSupremeModal() {
    const modal = document.getElementById('supremeModal');
    if (modal) modal.classList.add('hidden');
}

function closeModalOnOverlay(e) {
    if (e.target.id === 'supremeModal') {
        closeSupremeModal();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSupremeModal();
});

function changePage(delta) {
    const searchInput = document.getElementById('hookSearchInput');
    if (currentPage + delta >= 1 && currentPage + delta <= totalPages) {
        currentPage += delta;
        renderHooks(currentPage, searchInput ? searchInput.value : '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function jumpToPage() {
    const input = document.getElementById('jumpPageInput');
    const searchInput = document.getElementById('hookSearchInput');
    if (!input) return;
    const val = parseInt(input.value);
    if (val >= 1 && val <= totalPages) {
        currentPage = val;
        renderHooks(currentPage, searchInput ? searchInput.value : '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function filterHooks() {
    const searchInput = document.getElementById('hookSearchInput');
    const query = searchInput ? searchInput.value : '';
    renderHooks(currentPage, query);
}

// 初始化執行
renderHooks(currentPage);
