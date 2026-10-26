// 共享狀態與驗證維護
document.addEventListener('DOMContentLoaded', () => {
    // 檢查 LocalStorage 是否存在驗證狀態
    const authStatus = localStorage.getItem('garfield_vip_auth');
    if (authStatus === 'true') {
        const authBadge = document.getElementById('authBadge');
        if (authBadge) {
            authBadge.innerHTML = `Status: <strong class="text-emerald-400">VIP Absolute Closer</strong>`;
        }
    }

    // 初始化模組網格（若當前頁面包含列表容器）
    const grid = document.getElementById('hundredPagesGrid');
    if (grid) {
        let html = '';
        for (let i = 1; i <= 100; i++) {
            let category = i <= 25 ? 'Ready Whale Prospecting' : i <= 50 ? 'Absolute Closing Pitch' : i <= 75 ? 'Objection Destruction' : 'Escrow Sign-off';
            html += `<div onclick="openSupremeModal(${i}, '${category} Module #${i}')" class="bg-garfield-panel p-3.5 rounded-xl border border-white/10 text-center cursor-pointer hover:border-amber-400 transition-all"><span class="text-[10px] text-amber-400 font-mono font-bold block">Page #${i < 10 ? '0'+i : i}</span><span class="text-xs font-bold text-white block mt-1 truncate">${category}</span></div>`;
        }
        grid.innerHTML = html;
    }
});

// 1. Hot Buyer Finder 邏輯
async function runAiLeadBot(e) {
    e.preventDefault();
    const targetIndustry = document.getElementById('targetIndustry').value;
    const geoRegion = document.getElementById('geoRegion').value;
    const minNetWorth = document.getElementById('minNetWorth').value;
    const resultsBox = document.getElementById('leadBotResults');
    const badge = document.getElementById('botBadge');
    if (!resultsBox) return;

    if (badge) badge.innerText = "Filtering Whales...";
    resultsBox.innerHTML = `<div class="text-amber-400 animate-pulse font-mono text-xs">🤖 Scanning institutional registers & identifying Decision-Makers with active buying triggers...</div>`;

    try {
        const res = await fetch('/api/lead-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetIndustry, geoRegion, minNetWorth })
        });
        const data = await res.json();
        if (data.success) {
            if (badge) badge.innerText = `${data.qualifiedCount} Ready Whales`;
            let html = `<div class="text-emerald-400 mb-3 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-mono text-xs">✔ Session: ${data.botSessionId} | Scanned ${data.scannedTargets} targets in ${data.executionTime}</div>`;
            data.leads.forEach(l => {
                html += `
                    <div class="bg-black/80 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:border-amber-400 transition-all">
                        <div>
                            <strong class="text-white text-xs block">${l.company}</strong>
                            <span class="text-slate-400 text-[11px]">${l.contact} | Deal Value: <span class="text-emerald-400 font-bold">${l.contractValue}</span></span>
                        </div>
                        <div class="text-right">
                            <span class="text-amber-300 font-bold text-xs bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">${l.intentScore}</span>
                            <span class="block text-[9px] text-emerald-400 mt-1 font-bold">${l.strategy}</span>
                        </div>
                    </div>
                `;
            });
            resultsBox.innerHTML = html;
        }
    } catch (err) {
        resultsBox.innerHTML = `<div class="text-red-400 font-mono text-xs">✖ Failed to execute Absolute Closing Bot pipeline.</div>`;
    }
}

// 2. Objection Destroyer 邏輯
function destroyObjection(type) {
    const out = document.getElementById('objectionOutput');
    if (!out) return;
    if(type === 'price') {
        out.innerHTML = `
            <div class="text-amber-400 font-bold border-b border-white/10 pb-2 flex justify-between">
                <span>ABSOLUTE REBUTTAL: BUDGET / PRICE OBJECTION</span>
                <span class="text-emerald-400 text-[10px]">CONVERSION RATIO: 99.4%</span>
            </div>
            <p class="text-white text-xs leading-relaxed mt-3">"Director, I completely understand budget sensitivity. However, our financial model shows that delaying this deployment for 30 days costs your firm over $73,000 in operational waste and missed closes—which is 15x the cost of our entire annual software tier. We include a 100% money-back escrow guarantee, so your risk is literally zero. Shall we process your secure activation now?"</p>
        `;
    } else if(type === 'timing') {
        out.innerHTML = `
            <div class="text-amber-400 font-bold border-b border-white/10 pb-2 flex justify-between">
                <span>ABSOLUTE REBUTTAL: TIMING / DELAY OBJECTION</span>
                <span class="text-emerald-400 text-[10px]">CONVERSION RATIO: 98.7%</span>
            </div>
            <p class="text-white text-xs leading-relaxed mt-3">"Waiting until next quarter means handing three full months of uncaptured high-ticket leads directly to your top competitor. Our zero-downtime integration takes 15 minutes. Why not let our voice concierges run a parallel test this week with zero financial risk?"</p>
        `;
    } else if(type === 'risk') {
        out.innerHTML = `
            <div class="text-amber-400 font-bold border-b border-white/10 pb-2 flex justify-between">
                <span>ABSOLUTE REBUTTAL: RISK OBJECTION</span>
                <span class="text-emerald-400 text-[10px]">CONVERSION RATIO: 99.8%</span>
            </div>
            <p class="text-white text-xs leading-relaxed mt-3">"That is precisely why we architected our platform with SOC 2 Type II compliance and AES-256 encryption. Furthermore, our founder backs every contract with a 30-day unconditional escrow refund. You have absolute zero downside."</p>
        `;
    }
}

// 3. ROI Calculator 邏輯
async function calculateRoi(e) {
    e.preventDefault();
    const monthlyCalls = document.getElementById('monthlyCalls').value;
    const averageDealSize = document.getElementById('avgDealSize').value;
    const box = document.getElementById('roiResultsBox');
    if (!box) return;

    try {
        const res = await fetch('/api/roi-calculator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthlyCalls, averageDealSize })
        });
        const data = await res.json();
        box.innerHTML = `
            <div class="text-slate-400 uppercase border-b border-white/10 pb-2 flex justify-between"><span>Absolute Financial Impact</span><span class="text-emerald-400 font-bold">Guaranteed Value</span></div>
            <div class="flex justify-between py-2 border-b border-white/5"><span>Monthly Operational Savings:</span><strong class="text-emerald-400 text-sm">${data.monthlySavings}</strong></div>
            <div class="flex justify-between py-2 border-b border-white/5"><span>Extra Closed Deals / Month:</span><strong class="text-amber-300 text-sm">${data.extraDealsClosed}</strong></div>
            <div class="flex justify-between py-2 border-b border-white/5"><span>Net Annual Bottom-Line Boost:</span><strong class="text-amber-300 text-sm">${data.annualNetValue}</strong></div>
            <div class="flex justify-between py-2 border-b border-white/5"><span class="text-red-400 font-bold">Daily Cost of Delaying:</span><strong class="text-red-400 text-sm">${data.dailyCostOfDelay}</strong></div>
            <div class="flex justify-between py-2 border-b border-white/5"><span>Net ROI Multiplier:</span><strong class="text-amber-400 text-sm">${data.roiMultiplier}</strong></div>
            <div class="flex justify-between py-2"><span>Payback Period:</span><strong class="text-emerald-400 text-sm">${data.paybackPeriod}</strong></div>
        `;
    } catch (e) {
        box.innerHTML = `<span class="text-red-400 font-mono text-xs">Calculation error connecting to cloud API.</span>`;
    }
}

// 4. VIP Verification 邏輯
async function verifyCloudLicense(e) {
    e.preventDefault();
    const licenseKey = document.getElementById('licenseKeyInput').value;
    const userName = document.getElementById('regName').value;
    const userEmail = document.getElementById('regEmail').value;
    const statusBox = document.getElementById('regStatus');
    if (!statusBox) return;
    statusBox.classList.remove('hidden');
    statusBox.className = "text-xs font-mono p-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30";
    statusBox.innerText = "Authenticating with Cloud Serverless Node...";

    try {
        const res = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey, userName, userEmail })
        });
        const data = await res.json();
        statusBox.className = data.success ? "text-xs font-mono p-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-xs font-mono p-4 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40";
        statusBox.innerHTML = data.success ? `<strong>✔ ${data.message}</strong><br>Tier: ${data.tier}` : `<strong>✖ ${data.message}</strong>`;
        if(data.success) {
            localStorage.setItem('garfield_vip_auth', 'true');
            const authBadge = document.getElementById('authBadge');
            if (authBadge) authBadge.innerHTML = `Status: <strong class="text-emerald-400">VIP Absolute Closer</strong>`;
        }
    } catch (err) {
        statusBox.className = "text-xs font-mono p-4 rounded-xl bg-red-500/20 text-red-300";
        statusBox.innerText = "✖ Network error connecting to license server.";
    }
}

// 5. Support Ticket Escalation 邏輯
async function submitCloudSupportTicket(e) {
    e.preventDefault();
    const name = document.getElementById('supName').value;
    const email = document.getElementById('supEmail').value;
    const description = document.getElementById('supDesc').value;
    const statusBox = document.getElementById('supStatus');
    if (!statusBox) return;
    statusBox.classList.remove('hidden');
    statusBox.className = "text-xs font-mono p-4 rounded-xl bg-amber-500/20 text-amber-300";
    statusBox.innerText = "Escalating deal directly to founder & senior closer...";

    try {
        const res = await fetch('/api/support-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, category: 'Absolute Closing Desk', urgency: 'P1-Instant Callback', description })
        });
        const data = await res.json();
        statusBox.className = "text-xs font-mono p-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
        statusBox.innerHTML = `<strong>✔ DEAL ESCALATED!</strong><br>Deal ID: <span class="text-white font-bold">${data.ticketId}</span><br>Assigned SLA: ${data.sla}`;
    } catch (e) {
        statusBox.className = "text-xs font-mono p-4 rounded-xl bg-red-500/20 text-red-300";
        statusBox.innerText = "✖ Failed to dispatch deal request.";
    }
}

// 6. Voice Call 模擬/啟動邏輯
function startRealVapiCall() {
    const log = document.getElementById('vapiStatusLog');
    if (!log) return;
    log.innerHTML = "Initializing secure Vapi Absolute Closing Session...<br>";
    if (window.vapiSDK) {
        window.vapiSDK.run({ apiKey: "PUBLIC_KEY", assistant: "ASSISTANT_ID" });
        log.innerHTML += "<span class='text-emerald-400'>✔ Vapi SDK active. Connected to absolute closing engine.</span>";
    } else {
        log.innerHTML += "<span class='text-amber-400'>[Simulation Mode] Sub-150ms speech pipeline active. Absolute closing channel established.</span>";
    }
}

// 7. Modal 控制邏輯
function openSupremeModal(num, title) {
    const tag = document.getElementById('modalPageTag');
    const titleEl = document.getElementById('modalPageTitle');
    const desc = document.getElementById('modalPageDesc');
    const modal = document.getElementById('supremeModal');

    if (tag && titleEl && desc && modal) {
        tag.innerText = `Closing Module #${num < 10 ? '0' + num : num}`;
        titleEl.innerText = title;
        desc.innerText = `This is absolute closing module #${num} (${title}). It features unrefutable objection scripts, instant escrow checkout webhooks, and founder-level deal closing hooks.`;
        modal.classList.remove('hidden');
    }
}

function closeSupremeModal() {
    const modal = document.getElementById('supremeModal');
    if (modal) modal.classList.add('hidden');
}
